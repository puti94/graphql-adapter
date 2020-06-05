import {
    GraphQLObjectType,
    GraphQLInputObjectType,
    GraphQLResolveInfo,
    GraphQLFieldResolver,
    GraphQLFieldConfigMap,
    GraphQLFieldConfigArgumentMap,
    Thunk, GraphQLInputObjectTypeConfig, GraphQLOutputType, FieldDefinitionNode, GraphQLObjectTypeConfig
} from "graphql";

import {PubSub} from "graphql-subscriptions";
import Maybe from "graphql/tsutils/Maybe";
import {GraphQLInputFieldConfigMap} from "graphql/type/definition";


/**
 * 查询的类型
 */
export enum Query {
    ONE = "one",
    LIST = "list",
    LIST_PAGE = "listPage",
    AGGREGATION = "aggregation",
}

/**
 * mutation的类型
 */
export enum Mutation {
    CREATE = "create",
    UPDATE = "update",
    REMOVE = "remove",
}

/**
 * 订阅事件的类型
 */
export enum Subscription {
    CREATED = "created",
    UPDATED = "updated",
    REMOVED = "removed",
}

export interface BaseHook<M, TSource, TArgs, TContext> {
    /**
     * 调用方法前的钩子，可以重置args
     * @param source
     * @param args
     * @param context
     * @param info
     */
    before?(source: TSource, args: TArgs, context: TContext, info: GraphQLResolveInfo): MaybePromise<TArgs>;

    /**
     * 调用方法后的钩子，可以重置response
     * @param response
     * @param source
     * @param args
     * @param context
     * @param info
     */
    after?(response: M, source: TSource, args: TArgs, context: TContext, info: GraphQLResolveInfo): MaybePromise<M>;
}

export type MaybePromise<T> = T | null | Promise<T | null>

export type Resolver<TSource, TContext, TArgs> = (resolve: GraphQLFieldResolver<TSource, TContext, TArgs>) => GraphQLFieldResolver<TSource, TContext, TArgs>

type GraphQLFieldConfigOptions<TSource, TContext, TArgs> = {
    description?: Maybe<string>;
    type?: GraphQLOutputType;
    args?: GraphQLFieldConfigArgumentMap;
    resolve?: GraphQLFieldResolver<TSource, TContext, TArgs>;
    subscribe?: GraphQLFieldResolver<TSource, TContext, TArgs>;
    deprecationReason?: Maybe<string>;
    extensions?: Maybe<Readonly<Record<string, any>>>;
    astNode?: Maybe<FieldDefinitionNode>;
}

export type BaseFieldConfig<M, TSource, TArgs, TContext> =
    GraphQLFieldConfigOptions<TSource, TContext, TArgs> &
    BaseHook<M, TSource, TArgs, TContext> &
    { name?: string }

export type PageType<M> = { count: number; rows: M[] }

export interface BaseQuery<M, TSource, TArgs, TContext> {
    getOne?: BaseFieldConfig<M, TSource, TArgs, TContext>;
    getList?: BaseFieldConfig<M[], TSource, TArgs, TContext>;
    getListPage?: BaseFieldConfig<PageType<M>, TSource, TArgs, TContext>;
    getAggregation?: BaseFieldConfig<number, TSource, TArgs, TContext>;
}

export interface BaseMutation<M, TSource, TArgs, TContext> {
    create?: BaseFieldConfig<M, TSource, TArgs, TContext>;
    update?: BaseFieldConfig<M, TSource, TArgs, TContext>;
    remove?: BaseFieldConfig<boolean, TSource, TArgs, TContext>;

}

export type FilterFn<M, TArgs, TContext> = (tag: string, rootValue: M, args: TArgs, context?: TContext, info?: any) => boolean | Promise<boolean>
export type BaseSubscriptionConfig<M, TSource, TArgs, TContext> = GraphQLFieldConfigOptions<TSource, TContext, TArgs>
    & {
    filter?: FilterFn<M, TArgs, TContext>;
    name?: string;
}

export interface BaseSubscription<M, TSource, TArgs, TContext> {
    created?: BaseSubscriptionConfig<M, TSource, TArgs, TContext>;
    updated?: BaseSubscriptionConfig<M, TSource, TArgs, TContext>;
    removed?: BaseSubscriptionConfig<M, TSource, TArgs, TContext>;
}

export interface BaseTypeConfig<TSource, TContext> {
    /**
     *模型的字段，可以在此添加其它字段
     */
    modelFields?: Thunk<GraphQLFieldConfigMap<TSource, TContext>>;
    modelTypeConfig?: GraphQLObjectTypeConfig<TSource, TContext>;
}

export interface BaseType<TSource, TContext> {
    modelType: GraphQLObjectType<TSource, TContext>;
    pageType: GraphQLObjectType<TSource, TContext>;
}

export interface BaseInputType {
    createType: GraphQLInputObjectType;
    updateType: GraphQLInputObjectType;
}

export interface BaseInputTypeConfig {
    createTypeConfig?: GraphQLInputObjectTypeConfig;
    updateTypeConfig?: GraphQLInputObjectTypeConfig;
}

export type FilterActions<T> = T[] | ((key: T) => boolean);

export interface CommonConfig {
    /**
     * 包含的query,可以为布尔类型，可以传一个数组，或者传一个函数
     */
    includeQuery?: boolean | FilterActions<Query>;
    /**
     * 包含的mutation,可以为布尔类型，可以传一个数组，或者传一个函数
     */
    includeMutation?: boolean | FilterActions<Mutation>;
    /**
     * 包含的subscription,可以为布尔类型，可以传一个数组，或者传一个函数
     */
    includeSubscription?: boolean | FilterActions<Subscription>;
    /**
     * 不包含的query,可以传一个数组，或者传一个函数
     */
    excludeQuery?: FilterActions<Query>;
    /**
     * 不包含的mutation,可以传一个数组，或者传一个函数
     */
    excludeMutation?: FilterActions<Mutation>;
    /**
     * 不包含的subscription,可以传一个数组，或者传一个函数
     */
    excludeSubscription?: FilterActions<Subscription>;
}

export interface BaseFieldsConfig<TSource, TContext> {
    /**
     * 自定义query字段
     */
    queryFields?: Thunk<GraphQLFieldConfigMap<TSource, TContext>>;
    /**
     * 自定义mutation字段
     */
    mutationFields?: Thunk<GraphQLFieldConfigMap<TSource, TContext>>;
    /**
     * 自定义subscription字段
     */
    subscriptionFields?: Thunk<GraphQLFieldConfigMap<TSource, TContext>>;

    /**
     * 关联的字段
     */
    associationsFields?: Thunk<GraphQLFieldConfigMap<TSource, TContext>>;
    /**
     * 新建参数的关联字段
     */
    associationsCreateFields?: Thunk<GraphQLFieldConfigArgumentMap>;
    /**
     * 更新参数的关联字段
     */
    associationsUpdateFields?: Thunk<GraphQLFieldConfigArgumentMap>;
}

export type BaseConfig<M, TSource, TArgs, TContext> =
    CommonConfig &
    BaseQuery<M, TSource, TArgs, TContext> &
    BaseMutation<M, TSource, TArgs, TContext> &
    BaseSubscription<M, TSource, TArgs, TContext> &
    BaseInputTypeConfig &
    BaseTypeConfig<TSource, TContext> &
    BaseFieldsConfig<TSource, TContext> &
    BaseHook<M, TSource, TArgs, TContext> &
    {
        /**
         * 设置基本名称，默认是以model的name属性
         */
        name?: Thunk<string>;
        /**
         * 设置主键字段
         */
        primaryKey?: GraphQLFieldConfigArgumentMap;
        /**
         * 描述
         */
        description?: Thunk<string>;
        /**
         * graphql-subscriptions 的实例
         */
        pubSub?: PubSub;
        /**
         * 增删改三个事件的通用过滤器，优先拦截
         */
        filterSubscription?: FilterFn<M, TArgs, TContext>;
        /**
         * 映射模型字段
         * @param fields
         */
        mapperModelFields?: (fields: GraphQLFieldConfigMap<any, any>) => GraphQLFieldConfigMap<any, any>;
        /**
         * 映射创建参数字段
         * @param fields
         */
        mapperCreateTypeFields?: (fields: GraphQLInputFieldConfigMap) => GraphQLInputFieldConfigMap;
        /**
         * 映射更新参数字段
         * @param fields
         */
        mapperUpdateTypeFields?: (fields: GraphQLInputFieldConfigMap) => GraphQLInputFieldConfigMap;
    }

export interface BaseAdapterInterface<M, TSource, TContext extends Record<string, any>, TArgs> extends BaseQuery<M, TSource, TArgs, TContext>,
    BaseMutation<M, TSource, TArgs, TContext>,
    BaseSubscription<M, TSource, TArgs, TContext>,
    BaseType<TSource, TContext>,
    BaseInputType,
    BaseFieldsConfig<TSource, TContext> {
    /**
     * model 的所有查询字段
     */
    queryFields: GraphQLFieldConfigMap<TSource, TContext>;
    /**
     * model 的所有mutation
     */
    mutationFields: GraphQLFieldConfigMap<TSource, TContext>;
    /**
     * model 的所有subscription
     */
    subscriptionFields: GraphQLFieldConfigMap<TSource, TContext>;
}
