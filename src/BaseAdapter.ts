import {
    GraphQLObjectType,
    GraphQLInt,
    GraphQLInputObjectType,
    GraphQLList,
    GraphQLFieldConfigMap,
    GraphQLFieldConfigArgumentMap,
    GraphQLBoolean,
    GraphQLFieldResolver,
    GraphQLFieldConfig,
    GraphQLNonNull,
    Thunk,
    GraphQLObjectTypeConfig,
    GraphQLInputObjectTypeConfig,
    GraphQLResolveInfo,
    GraphQLEnumType, GraphQLEnumTypeConfig, GraphQLEnumValueConfigMap,
} from "graphql";
import CONS from "./constant";
import _ from "lodash";
import {map2NullableType} from "./utils";
import {
    FilterActions,
    BaseFieldConfig,
    BaseSubscriptionConfig,
    BaseConfig,
    BaseAdapterInterface,
    BaseHook,
    Query,
    Mutation,
    Subscription,
    MaybePromise, Resolver
} from "./BaseAdapterType";

export * from "./BaseAdapterType";
import {withFilter} from "graphql-subscriptions";
import {BasicType, OrderSortEnum} from "./sequelizeImpl";


/**
 * 类型容器
 * @type {Map<string, GraphQLObjectType<any, any> | GraphQLInputObjectType>}
 */
export const typeMap = new Map<string, GraphQLObjectType | GraphQLInputObjectType | GraphQLEnumType>();


type WithNameType = GraphQLObjectType | GraphQLInputObjectType | GraphQLEnumType

/**
 *
 * @param config
 * @returns {GraphQLObjectType | GraphQLInputObjectType | GraphQLEnumType}
 * @param type
 */
export function getCacheGraphqlType<TType extends GraphQLObjectTypeConfig<any, any> | GraphQLInputObjectTypeConfig | GraphQLEnumTypeConfig>(config: TType, type: any = GraphQLObjectType): WithNameType {
    if (!typeMap.has(config.name)) {
        typeMap.set(config.name, new type(config));
    }
    return typeMap.get(config.name);
}

function thunkGet<T>(value: Thunk<T>): T {
    if (_.isFunction(value)) return value();
    return value;
}

/**
 * 通过配置判断是否过滤字段
 * @param include
 * @param exclude
 * @param key
 * @returns {boolean}
 */
function filterAction<T>(include?: boolean | FilterActions<T>, exclude?: FilterActions<T>, key?: T): boolean {
    if (include === false) return false;
    if (!_.isUndefined(exclude)) {
        if (_.isFunction(exclude) && exclude(key)) return false;
        if (_.isArray(exclude) && exclude.includes(key)) return false;
    }
    if (include) {
        if (include === true) return true;
        if (_.isFunction(include) && !include(key)) return false;
        if (_.isArray(include) && !include.includes(key)) return false;
    }
    return true;
}

function getFieldName(defaultName: string, config?: BaseFieldConfig<any, any, any, any>) {
    return config?.name || defaultName;
}

export abstract class BaseAdapter<M, TSource,
    TContext extends Record<string, any>, TArgs, TConfig extends BaseConfig<M, TSource, TArgs, TContext>>
    implements BaseAdapterInterface<M, TSource, TContext, TArgs> {
    config: TConfig;
    abstract createFields?: GraphQLFieldConfigArgumentMap;
    abstract associationsFields?: GraphQLFieldConfigMap<TSource, TContext>;
    abstract associationsUpdateFields?: GraphQLFieldConfigArgumentMap;
    abstract associationsCreateFields?: GraphQLFieldConfigArgumentMap;
    abstract modelFields?: GraphQLFieldConfigMap<TSource, TContext>;
    abstract customFields?: GraphQLFieldConfigMap<TSource, TContext>;
    abstract updateFields?: GraphQLFieldConfigArgumentMap;
    abstract inputArgs: GraphQLFieldConfigArgumentMap;
    abstract inputListArgs: GraphQLFieldConfigArgumentMap;
    abstract aggregateArgs: GraphQLFieldConfigArgumentMap;
    primaryKey: GraphQLFieldConfigArgumentMap;
    primaryKeyName?: string;
    description?: string;

    protected constructor(config: TConfig) {
        this.config = config;
        this.primaryKey = this.config.primaryKey || {};
        this.primaryKeyName = Object.keys(this.primaryKey)[0];
        this.description = thunkGet(this.config.description) || this.name;
    }

    private _addHooks<TResponse>({before, after}: BaseHook<TResponse, TSource, TArgs, TContext>): Resolver<TSource, TContext, TArgs> {
        return (fn: GraphQLFieldResolver<TSource, TContext, TArgs>) => async (source, args, ctx, info) => {
            if (_.isFunction(this.config.before)) {
                args = await (this.config.before)(source, args, ctx, info);
            }
            if (!_.isUndefined(before)) {
                args = await before(source, args, ctx, info);
            }
            let response = await fn(source, args, ctx, info);
            if (!_.isUndefined(after)) {
                response = await after(response, source, args, ctx, info);
            }
            if (_.isFunction(this.config.after)) {
                return this.config.after(response, source, args, ctx, info);
            }
            return response;
        };
    }

    /**
     * 模型类型
     * @returns {GraphQLObjectType}
     */
    get modelType(): GraphQLObjectType {
        const {mapperModelFields = v => v} = this.config;
        return getCacheGraphqlType<GraphQLObjectTypeConfig<any, any>>({
            name: this.upperName,
            description: this.description,
            ...(this.config.modelTypeConfig || {}),
            fields: () => mapperModelFields({
                ...this.modelFields,
                ...this.customFields,
                ...this.associationsFields,
                ...thunkGet(this.config.associationsFields || {}),
                ...thunkGet(this.config.modelFields || {})
            })
        }) as GraphQLObjectType;
    }


    /**
     * 模型字段枚举
     * @returns {GraphQLObjectType}
     */
    get fieldEnumType(): GraphQLEnumType {
        return getCacheGraphqlType<GraphQLEnumTypeConfig>({
            name: `${this.upperName}FieldEnum`,
            values: Object.keys(this.modelFields).reduce<GraphQLEnumValueConfigMap>((memo, key) => {
                memo[key] = {value: key, description: this.modelFields[key].description};
                return memo;
            }, {[CONS.fieldAllMenu]: {value: "*", description: "all"}})
        }, GraphQLEnumType) as GraphQLEnumType;
    }

    /**
     * 排序类型
     * @returns {GraphQLInputObjectType}
     */
    get orderType(): GraphQLInputObjectType {
        return getCacheGraphqlType<GraphQLInputObjectTypeConfig>({
            name: `${this.upperName}OrderType`,
            fields: {
                name: {
                    description: "sort field",
                    type: new GraphQLNonNull(this.fieldEnumType)
                },
                sort: {
                    description: "sort type",
                    type: OrderSortEnum
                }
            }
        }, GraphQLInputObjectType) as GraphQLInputObjectType;
    }

    /**
     * 分页数据类型
     * @returns {GraphQLObjectType}
     */
    get pageType(): GraphQLObjectType {
        return getCacheGraphqlType({
            name: `${this.upperName}Page`,
            fields: () => ({
                count: {
                    description: "total number",
                    type: GraphQLInt
                },
                rows: {
                    description: "列表数据",
                    type: new GraphQLList(this.modelType)
                },
            })
        }) as GraphQLObjectType;
    }

    /**
     * 更新参数类型
     * @returns {GraphQLInputObjectType}
     */
    get updateType(): GraphQLInputObjectType {
        const {mapperUpdateTypeFields = v => v} = this.config;
        return getCacheGraphqlType({
            name: `${this.upperName}UpdateInput`,
            ...(this.config.updateTypeConfig || {}),
            fields: () => mapperUpdateTypeFields({
                ...map2NullableType(this.updateFields),
                ...this.associationsUpdateFields,
                ...thunkGet(this.config.updateTypeConfig?.fields || {}),
                ...thunkGet(this.config.associationsUpdateFields || {}),

            })
        }, GraphQLInputObjectType) as GraphQLInputObjectType;
    }

    /**
     * 创建参数类型
     * @returns {GraphQLInputObjectType}
     */
    get createType(): GraphQLInputObjectType {
        const {mapperCreateTypeFields = v => v} = this.config;
        return getCacheGraphqlType({
            name: `${this.upperName}CreateInput`,
            ...this.config.createTypeConfig,
            fields: () => mapperCreateTypeFields({
                ...this.createFields,
                ...this.associationsCreateFields,
                ...thunkGet(this.config.createTypeConfig?.fields || {}),
                ...thunkGet(this.config.associationsCreateFields || {}),
            })
        }, GraphQLInputObjectType) as GraphQLInputObjectType;
    }

    get name() {
        return thunkGet(this.config.name);
    }

    private _getFieldConfig<TResponse>(defaultConfig: GraphQLFieldConfig<TSource, TContext>, config: BaseFieldConfig<TResponse, TSource, TArgs, TContext> = {}) {
        const {before, after, resolve, ...otherConfig} = config;
        return {
            ...defaultConfig,
            ...otherConfig,
            resolve: this._addHooks({before, after})(resolve || defaultConfig.resolve)
        };
    }

    private _getSubscriptionConfig<TResponse>(eventName: string, config: BaseSubscriptionConfig<TResponse, TSource, TArgs, TContext> = {}) {
        const {filter = () => true, ...otherConfig} = config;
        const {pubSub, filterSubscription} = this.config;
        return {
            type: this.modelType,
            description: `subscription ${this.description}${eventName}`,
            args: this.inputArgs,
            ...otherConfig,
            subscribe: withFilter(() => pubSub?.asyncIterator(`${this.eventName}.${eventName}`), async (...args) => {
                //有设置通用拦截器先执行通用拦截
                if (_.isFunction(filterSubscription)) {
                    const result = await filterSubscription(...args);
                    if (result === false) return false;
                }
                return filter(...args);
            })
        };
    }


    /**
     * 查询单个数据
     * @returns {GraphQLFieldConfig<TSource, TContext> & Pick<GraphQLFieldConfigOptions<TSource, TContext, TArgs> & BaseHook<M | Promise<M | null>, TSource, TArgs, TContext> & {name?: string}, keyof GraphQLFieldConfigOptions<TSource, TContext, TArgs> & BaseHook<M | Promise<M | null>, TSource, TArgs, TContext> & {name?: string} extends ("after" | "resolve" | "before") ? never : keyof GraphQLFieldConfigOptions<TSource, TContext, TArgs> & BaseHook<M | Promise<M | null>, TSource, TArgs, TContext> & {name?: string}> & {resolve: (source: TSource, args: TArgs, context: TContext, info: GraphQLResolveInfo) => any}}
     */
    get getOne() {
        return this._getFieldConfig({
            type: this.modelType,
            description: `fetch one ${this.description}`,
            args: {
                ...this.inputArgs,
                ...(this.config.getOne?.args || {}),
            },
            resolve: this.getOneResolve.bind(this)
        }, this.config.getOne);
    }

    /**
     * 获取列表数据
     * @returns {GraphQLFieldConfig<TSource, TContext> & Pick<GraphQLFieldConfigOptions<TSource, TContext, TArgs> & BaseHook<M[] | Promise<M[] | null>, TSource, TArgs, TContext> & {name?: string}, keyof GraphQLFieldConfigOptions<TSource, TContext, TArgs> & BaseHook<M[] | Promise<...[] | null>, TSource, TArgs, TContext> & {name?: string} extends ("after" | "resolve" | "before") ? never : keyof GraphQLFieldConfigOptions<TSource, TContext, TArgs> & BaseHook<M[] | Promise<...[] | null>, TSource, TArgs, TContext> & {name?: string}> & {resolve: (source: TSource, args: TArgs, context: TContext, info: GraphQLResolveInfo) => any}}
     */
    get getList() {
        return this._getFieldConfig({
            type: new GraphQLList(this.modelType),
            description: `fetch ${this.description} list`,
            args: {
                ...this.inputListArgs,
                ...(this.config.getList?.args || {})
            },
            resolve: this.getListResolve.bind(this)
        }, this.config.getList);
    }

    /**
     *  获取聚合数据
     * @returns {GraphQLFieldConfig<TSource, TContext> & Pick<GraphQLFieldConfigOptions<TSource, TContext, TArgs> & BaseHook<number | Promise<number | null>, TSource, TArgs, TContext> & {name?: string}, keyof GraphQLFieldConfigOptions<TSource, TContext, TArgs> & BaseHook<number | Promise<number | null>, TSource, TArgs, TContext> & {name?: string} extends ("after" | "resolve" | "before") ? never : keyof GraphQLFieldConfigOptions<TSource, TContext, TArgs> & BaseHook<number | Promise<number | null>, TSource, TArgs, TContext> & {name?: string}> & {resolve: (source: TSource, args: TArgs, context: TContext, info: GraphQLResolveInfo) => any}}
     */
    get getAggregate() {
        return this._getFieldConfig({
            type: BasicType,
            description: `${this.description}聚合方法`,
            args: {
                ...this.aggregateArgs,
                ...(this.config.getAggregate?.args || {})
            },
            resolve: this.getAggregateResolve.bind(this)
        }, this.config.getAggregate);
    }

    /**
     * 新建mutation
     * @returns {GraphQLFieldConfig<TSource, TContext> & Pick<GraphQLFieldConfig<TSource, TContext> & BaseHook<number, TSource, TArgs, TContext> & {name?: string}, keyof GraphQLFieldConfig<TSource, TContext> & BaseHook<number, TSource, TArgs, TContext> & {name?: string} extends "after" | "resolve" | "before" ? never : keyof GraphQLFieldConfig<TSource, TContext> & BaseHook<number, TSource, TArgs, TContext> & {name?: string}> & {resolve: GraphQLFieldResolver<TSource, TContext, TArgs>}}
     */
    get create() {
        return this._getFieldConfig({
            type: this.modelType,
            resolve: this.createResolve.bind(this),
            description: `create ${this.description}`,
            args: {
                data: {
                    description: "create data",
                    type: new GraphQLNonNull(this.createType)
                },
            }
        }, this.config.create);
    }

    /**
     * 更新mutation
     * @returns {GraphQLFieldConfig<TSource, TContext> & Pick<GraphQLFieldConfig<TSource, TContext> & BaseHook<M, TSource, TArgs, TContext> & {name?: string}, keyof GraphQLFieldConfig<TSource, TContext> & BaseHook<M, TSource, TArgs, TContext> & {name?: string} extends "after" | "resolve" | "before" ? never : keyof GraphQLFieldConfig<TSource, TContext> & BaseHook<M, TSource, TArgs, TContext> & {name?: string}> & {resolve: GraphQLFieldResolver<TSource, TContext, TArgs>}}
     */
    get update() {
        return this._getFieldConfig({
            type: this.modelType,
            description: `update ${this.description}`,
            resolve: this.updateResolve.bind(this),
            args: {
                data: {
                    description: "update data",
                    type: new GraphQLNonNull(this.updateType)
                },
                ...this.primaryKey
            }
        }, this.config.update);
    }

    /**
     * 删除mutation
     * @returns {GraphQLFieldConfig<TSource, TContext> & Pick<GraphQLFieldConfig<TSource, TContext> & BaseHook<boolean, TSource, TArgs, TContext> & {name?: string}, keyof GraphQLFieldConfig<TSource, TContext> & BaseHook<boolean, TSource, TArgs, TContext> & {name?: string} extends "after" | "resolve" | "before" ? never : keyof GraphQLFieldConfig<TSource, TContext> & BaseHook<boolean, TSource, TArgs, TContext> & {name?: string}> & {resolve: GraphQLFieldResolver<TSource, TContext, TArgs>}}
     */
    get remove() {
        return this._getFieldConfig({
            type: GraphQLBoolean,
            description: `remove ${this.description}`,
            resolve: this.removeResolve.bind(this),
            args: {
                ...this.primaryKey
            }
        }, this.config.remove);
    }

    get upperName() {
        return _.upperFirst(this.name);
    }

    /**
     * 新建subscription
     * @returns {Pick<GraphQLFieldConfig<TSource, TContext> & {filter?: FilterFn<M, TArgs, TContext>; name?: string}, keyof GraphQLFieldConfig<TSource, TContext> & {filter?: FilterFn<M, TArgs, TContext>; name?: string} extends "filter" ? never : keyof GraphQLFieldConfig<TSource, TContext> & {filter?: FilterFn<M, TArgs, TContext>; name?: string}> & {args: GraphQLFieldConfigArgumentMap; subscribe: ResolverFn; type: GraphQLObjectType}}
     */
    get created() {
        return this._getSubscriptionConfig(this.createdEvent, this.config.created);
    }

    /**
     * 删除subscription
     * @returns {Pick<GraphQLFieldConfig<TSource, TContext> & {filter?: FilterFn<M, TArgs, TContext>; name?: string}, keyof GraphQLFieldConfig<TSource, TContext> & {filter?: FilterFn<M, TArgs, TContext>; name?: string} extends "filter" ? never : keyof GraphQLFieldConfig<TSource, TContext> & {filter?: FilterFn<M, TArgs, TContext>; name?: string}> & {args: GraphQLFieldConfigArgumentMap; subscribe: ResolverFn; type: GraphQLObjectType}}
     */
    get removed() {
        return this._getSubscriptionConfig(this.removedEvent, this.config.removed);
    }

    /**
     * 更新subscription
     * @returns {Pick<GraphQLFieldConfig<TSource, TContext> & {filter?: FilterFn<M, TArgs, TContext>; name?: string}, keyof GraphQLFieldConfig<TSource, TContext> & {filter?: FilterFn<M, TArgs, TContext>; name?: string} extends "filter" ? never : keyof GraphQLFieldConfig<TSource, TContext> & {filter?: FilterFn<M, TArgs, TContext>; name?: string}> & {args: GraphQLFieldConfigArgumentMap; subscribe: ResolverFn; type: GraphQLObjectType}}
     */
    get updated() {
        return this._getSubscriptionConfig(this.updatedEvent, this.config.updated);
    }

    get nameQueryOne() {
        return getFieldName(CONS.getOneField, this.config.getOne);
    }

    get nameQueryList() {
        return getFieldName(CONS.getListField, this.config.getList);
    }

    get nameQueryAggregate() {
        return getFieldName(CONS.getAggregateField, this.config.getAggregate);
    }

    /**
     * 所有query的字段
     * @returns {{} | {[p: string]: {resolve(): {}, description: string, type: GraphQLObjectType<TSource, TContext>}}}
     */
    get queryFields(): GraphQLFieldConfigMap<TSource, TContext> {
        const {includeQuery = true, excludeQuery, queryFields} = this.config;
        if (!includeQuery) return {};
        const fields = [Query.ONE, Query.LIST, Query.AGGREGATE].reduce<GraphQLFieldConfigMap<TSource, TContext>>
        ((memo, key) => {
            if (!filterAction(includeQuery, excludeQuery, key)) return memo;
            if (key === Query.ONE) {
                memo[this.nameQueryOne] = this.getOne;
            } else if (key === Query.LIST) {
                memo[this.nameQueryList] = this.getList;
            } else if (key === Query.AGGREGATE) {
                memo[this.nameQueryAggregate] = this.getAggregate;
            }
            return memo;
        }, {});
        return {
            [this.name]: {
                description: this.description,
                resolve() {
                    return {};
                },
                type: new GraphQLObjectType({
                    name: `${this.upperName}Query`,
                    fields: {
                        ...fields,
                        ...thunkGet(queryFields || {})
                    }
                })
            }
        };
    }

    get nameMutationCreate() {
        return getFieldName("create", this.config.create);
    }

    get nameMutationRemove() {
        return getFieldName("remove", this.config.remove);
    }

    get nameMutationUpdate() {
        return getFieldName("update", this.config.update);
    }

    /**
     * 所有mutation的字段
     * @returns {{} | {[p: string]: {resolve(): {}, description: string, type: GraphQLObjectType<TSource, TContext>}}}
     */
    get mutationFields(): GraphQLFieldConfigMap<TSource, TContext> {
        const {includeMutation = true, excludeMutation, mutationFields} = this.config;
        if (!includeMutation) return {};
        const fields = [Mutation.CREATE, Mutation.UPDATE, Mutation.REMOVE].reduce<GraphQLFieldConfigMap<TSource, TContext>>
        ((memo, key) => {
            if (!filterAction(includeMutation, excludeMutation, key)) return memo;
            if (key === Mutation.CREATE) {
                memo[this.nameMutationCreate] = this.create;
            } else if (key === Mutation.REMOVE && this.primaryKeyName) {
                memo[this.nameMutationRemove] = this.remove;
            } else if (key === Mutation.UPDATE && this.primaryKeyName) {
                memo[this.nameMutationUpdate] = this.update;
            }
            return memo;
        }, {});
        return {
            [this.name]: {
                description: this.description,
                resolve() {
                    return {};
                },
                type: new GraphQLObjectType({
                    name: `${this.upperName}Mutation`,
                    fields: {
                        ...fields,
                        ...thunkGet(mutationFields || {})
                    },
                })
            }
        };
    }

    get eventName() {
        return `${this.upperName}Event`;
    }

    /**
     * 创建的事件
     * @returns {string}
     */
    get createdEvent() {
        return getFieldName(`${this.eventName}.Created`, this.config.created);
    }

    /**
     * 删除的事件
     * @returns {string}
     */
    get removedEvent() {
        return getFieldName(`${this.eventName}.Removed`, this.config.removed);
    }

    /**
     * 更新的事件
     * @returns {string}
     */
    get updatedEvent() {
        return getFieldName(`${this.eventName}.Updated`, this.config.updated);
    }

    /**
     * 所有监听的字段
     * @returns {{} | {[p: string]: {subscribe: (rootValue?: any, args?: any, context?: any, info?: any) => AsyncIterator<any>, description: string, type: GraphQLObjectType<TSource, TContext>}}}
     */
    get subscriptionFields(): GraphQLFieldConfigMap<TSource, TContext> {
        const {includeSubscription = true, excludeSubscription, pubSub, filterSubscription, subscriptionFields} = this.config;
        if (_.isUndefined(pubSub) || !includeSubscription) return {};
        const fields = [Subscription.CREATED, Subscription.REMOVED, Subscription.UPDATED].reduce<GraphQLFieldConfigMap<TSource, TContext>>
        ((memo, key) => {
            if (!filterAction(includeSubscription, excludeSubscription, key)) return memo;
            if (key === Subscription.CREATED) {
                memo["Created"] = this.created;
            } else if (key === Subscription.UPDATED) {
                memo["Updated"] = this.updated;
            } else if (key === Subscription.REMOVED) {
                memo["Removed"] = this.removed;
            }
            return memo;
        }, {});
        return {
            [this.name]: {
                description: this.description,
                subscribe: withFilter(() => pubSub?.asyncIterator([this.createdEvent, this.updatedEvent, this.removedEvent]), async (...args) => {
                    //有设置通用拦截器先执行通用拦截
                    if (_.isFunction(filterSubscription)) {
                        const result = await filterSubscription(...args);
                        if (result === false) return false;
                    }
                    return true;
                }),
                type: new GraphQLObjectType({
                    name: `${this.upperName}Event`,
                    fields: {
                        ...fields,
                        ...thunkGet(subscriptionFields || {})
                    }
                })
            }
        };
    }

    /**
     * 实现查询单个的方法
     * @param source
     * @param args
     * @param context
     * @param info
     */
    abstract getOneResolve(source: TSource, args: TArgs, context: TContext, info: GraphQLResolveInfo): MaybePromise<M>;

    /**
     * 实现聚合函数的方法
     * @param source
     * @param args
     * @param context
     * @param info
     */
    abstract getAggregateResolve(source: TSource, args: TArgs, context: TContext, info: GraphQLResolveInfo): MaybePromise<number>;

    /**
     * 实现获取列表的方法
     * @param source
     * @param args
     * @param context
     * @param info
     */
    abstract getListResolve(source: TSource, args: TArgs, context: TContext, info: GraphQLResolveInfo): MaybePromise<M[]>

    /**
     * 实现删除的方法
     * @param source
     * @param args
     * @param context
     * @param info
     */
    abstract removeResolve(source: TSource, args: TArgs, context: TContext, info: GraphQLResolveInfo): MaybePromise<boolean>;

    /**
     * 实现新建的方法
     * @param source
     * @param args
     * @param context
     * @param info
     */
    abstract createResolve(source: TSource, args: TArgs, context: TContext, info: GraphQLResolveInfo): MaybePromise<M>;

    /**
     * 实现更新的方法
     * @param source
     * @param args
     * @param context
     * @param info
     */
    abstract updateResolve(source: TSource, args: TArgs, context: TContext, info: GraphQLResolveInfo): MaybePromise<M>;

}

