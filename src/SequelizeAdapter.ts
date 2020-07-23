import {BaseAdapter, BaseConfig} from "./BaseAdapter";
import {
    GraphQLFieldConfigArgumentMap,
    GraphQLFieldConfigMap,
    GraphQLList, GraphQLNonNull,
    GraphQLResolveInfo, GraphQLString,
} from "graphql";
import {
    FindOptions,
    AggregateOptions,
    Model,
    ModelCtor,
} from "sequelize";
import CONS from "./constant";
import {getName} from "./utils";
import {NotFoundError} from "./error";
import {
    attributeFields,
    defaultArgs,
    defaultListArgs,
    resolver,
    includeFields,
    where,
    aggregateFunction,
    replaceWhereOperators,
    BasicType
} from "./sequelizeImpl";
import {AssociationType} from "./sequelizeImpl/resolver";

import _ from "lodash";

export type SequelizeArgs = {
    [key: string]: any;
    where?: any;
    input?: any;
    scope?: string[];
    aggregateFunction?: string;
}

export type SequelizeAdapterConfig<M extends Model, TSource, TContext> =
    BaseConfig<M, TSource, SequelizeArgs, TContext>
    & {
    /**
     * 设置默认限制数量，默认为20
     */
    defaultLimit?: number;
    /**
     * 处理FindOptions的钩子
     * @param action
     * @param options
     * @param args
     * @param context
     * @param info
     */
    handlerFindOptions?: (action: string, options: FindOptions, args: SequelizeArgs, context: TContext, info: GraphQLResolveInfo) => FindOptions;
    /**
     * 处理AggregateOptions的钩子
     * @param action
     * @param options
     * @param args
     * @param context
     * @param info
     */
    handlerAggregateOptions?: (action: string, options: AggregateOptions<any>, args: SequelizeArgs, context: TContext, info: GraphQLResolveInfo) => AggregateOptions<any>;
}

function getPrimaryKey<M extends Model>(model: ModelCtor<M>): GraphQLFieldConfigArgumentMap {
    if (!model.primaryKeyAttribute) return {};
    return {
        [model.primaryKeyAttribute]: attributeFields(model)[model.primaryKeyAttribute]
    };
}

function _getHandlerFindOptionsFn(config: SequelizeAdapterConfig<any, any, any>, action: string) {
    return (options: FindOptions, args: any, context: any, info: any) => {
        if (_.isFunction(config.handlerFindOptions)) return Promise.resolve(config.handlerFindOptions(action, options, args, context, info));
        return options;
    };
}

function _getHandlerAggregateOptions(config: SequelizeAdapterConfig<any, any, any>, action: string, args: SequelizeArgs, context: any, info: GraphQLResolveInfo): AggregateOptions<any> | Promise<AggregateOptions<any>> {
    const options: AggregateOptions<any> = {
        where: replaceWhereOperators(args.where || {}),
        dataType: "float"
    };
    if (_.isFunction(config.handlerAggregateOptions)) return Promise.resolve(config.handlerAggregateOptions(action, options, args, context, info));
    return options;
}


export class SequelizeAdapter<M extends Model, TSource, TContext> extends BaseAdapter<M, TSource, TContext, SequelizeArgs, SequelizeAdapterConfig<M, TSource, TContext>> {
    model: ModelCtor<M>;
    createFields: GraphQLFieldConfigArgumentMap;
    updateFields: GraphQLFieldConfigArgumentMap;
    inputArgs: GraphQLFieldConfigArgumentMap;
    inputListArgs: GraphQLFieldConfigArgumentMap;
    aggregateArgs: GraphQLFieldConfigArgumentMap;
    modelFields: GraphQLFieldConfigMap<TSource, TContext>;
    customFields: GraphQLFieldConfigMap<TSource, TContext>;

    constructor(model: ModelCtor<M>, config: SequelizeAdapterConfig<M, TSource, TContext> = {}) {
        super({
            name: getName(model),
            primaryKey: getPrimaryKey(model),
            description: model.options?.comment,
            ...config
        });
        this.model = model;
        const createFields = attributeFields(model, {filterAutomatic: true, isInput: true});
        const updateFields = (function () {
            const fields = {...createFields};
            delete fields[model.primaryKeyAttribute];
            return fields;
        })();
        this.modelFields = attributeFields(model);
        this.createFields = createFields;
        this.updateFields = updateFields;
        this.inputArgs = {
            ...defaultArgs(model),
            order: {
                description: "sort",
                type: new GraphQLList(this.orderType)
            }
        };
        this.inputListArgs = defaultListArgs({
            defaultLimit: config.defaultLimit || 20,
            order: {
                description: "sort",
                type: new GraphQLList(this.orderType)
            }
        });
        this.aggregateArgs = {
            fn: aggregateFunction,
            field: {
                type: new GraphQLNonNull(this.fieldEnumType)
            },
            where
        };
        this.customFields = {
            [CONS.aggregationName]: {
                type: BasicType,
                description: "聚合函数字段",
                args: {
                    fn: {
                        type: GraphQLNonNull(GraphQLString),
                        description: "聚合函数方法名"
                    },
                    as: {
                        type: GraphQLString,
                        description: "指定聚合字段的别名, having 参数可以使用, 如无指定默认用`_${fn}`"
                    },
                    args: {
                        type: GraphQLNonNull(BasicType),
                        description: "函数的参数,如无可不传,多个参数用数组包裹 例: args:\"time\" | args:[{\"fn\":\"to_timestamp\",args:\"time\"},\"yyyy-MM-dd HH24-MI-SS\"] "
                    }
                },
                resolve: (source, {fn, as}: { as?: string; fn: string }) => {
                    return (source as unknown as M).getDataValue(as || `_${fn}`);
                }
            },
            [CONS.colName]: {
                type: BasicType,
                description: "关联字段",
                args: {
                    name: {
                        type: GraphQLNonNull(GraphQLString),
                        description: "关联字段名，例子：\"user.name\""
                    },
                    as: {
                        type: GraphQLNonNull(GraphQLString),
                        description: "指定别名, having 参数可以使用, 如无指定默认用`${name}`"
                    }
                },
                resolve: (source, {as}: { as: string }) => {
                    return (source as unknown as M).getDataValue(as);
                }
            }
        };
        this._initialHooks();

    }

    /**
     * 添加钩子，实现消息自动通知
     * @private
     */
    private _initialHooks() {
        this.model.afterCreate(this.createdEvent, (attributes: M) => {
            this.config.pubSub?.publish(this.createdEvent, {
                [this.name]: {Created: attributes.get()}
            });
        });
        this.model.afterUpdate(this.updatedEvent, (attributes: M) => {
            this.config.pubSub?.publish(this.updatedEvent, {
                [this.name]: {Updated: attributes.get()}
            });
        });
        this.model.afterDestroy(this.removedEvent, (attributes: M) => {
            this.config.pubSub?.publish(this.removedEvent, {
                [this.name]: {Removed: attributes.get()}
            });
        });
    }


    /**
     * 获取关联表的字段
     * @returns {GraphQLFieldConfigMap<TSource, TContext>}
     */
    get associationsFields(): GraphQLFieldConfigMap<TSource, TContext> {
        const {associations} = this.model;
        return Object.keys(associations).reduce<GraphQLFieldConfigMap<TSource, TContext>>((fields, key) => {
            const association = associations[key] as AssociationType;
            const modelSchema = new SequelizeAdapter(association.target);
            if (!modelSchema) return fields;
            const type = modelSchema.modelType;
            const isList = ["BelongsToMany", "HasMany"].includes(association.associationType);
            fields[association.as] = {
                type: isList ? new GraphQLList(type) : type,
                args: isList ? {
                    ..._.omit(modelSchema.inputListArgs, ["scope", "offset", "having"]),
                    ..._.omit(includeFields, association.associationType === "HasMany" ? [] : ["separate"])
                } : _.omit(includeFields, ["separate"])
            };
            return fields;
        }, {});
    }

    /**
     * 获取关联表创建的字段
     * @returns {GraphQLFieldConfigArgumentMap}
     */
    get associationsCreateFields(): GraphQLFieldConfigArgumentMap {
        const {associations} = this.model;
        return Object.keys(associations).reduce<GraphQLFieldConfigArgumentMap>((fields, key) => {
            const association = associations[key];
            const modelSchema = new SequelizeAdapter(association.target);
            const type = modelSchema.createType;
            fields[association.as] = {
                type: ["BelongsToMany", "HasMany"].includes(association.associationType) ? new GraphQLList(type) : type,
            };
            return fields;
        }, {});
    }

    /**
     * 获取关联表更新的字段
     * @returns {GraphQLFieldConfigArgumentMap}
     */
    get associationsUpdateFields(): GraphQLFieldConfigArgumentMap {
        // TODO 关联从表一并更新逻辑不好处理，暂时返回空对象
        return {};
    }

    getOneResolve(source: TSource, {scope, ...args}: SequelizeArgs, context: TContext, info: GraphQLResolveInfo) {
        return resolver<M, TSource, TContext, SequelizeArgs>(this.model, {
            before: _getHandlerFindOptionsFn(this.config, "findOne"),
            resolve:
                (findOptions) => this.model.scope(scope).findOne(findOptions)
        })
        (source, args, context, info);
    }

    getListResolve(source: TSource, {scope, ...args}: SequelizeArgs, context: TContext, info: GraphQLResolveInfo) {
        return resolver<M, TSource, TContext, SequelizeArgs>(this.model, {
            before: _getHandlerFindOptionsFn(this.config, "findList"),
            resolve: (findOptions) => this.model.scope(scope).findAll(findOptions)
        })(source, args, context, info);
    }

    async createResolve(source: TSource, {data}: SequelizeArgs, context: TContext, info: GraphQLResolveInfo): Promise<M> {
        return this.model.create<M>(data, {include: Object.keys(this.model.associations)});
    }


    async removeResolve(source: TSource, args: SequelizeArgs, context: TContext, info: GraphQLResolveInfo) {
        //添加事务
        const t = await this.model.sequelize.transaction();
        try {
            const primaryKeyValue = args[this.primaryKeyName];
            const model: M = await resolver<M, TSource, TContext, SequelizeArgs>(this.model, {
                before: _getHandlerFindOptionsFn(this.config, "remove"),
                resolve: () => this.model.findByPk(primaryKeyValue, {
                    transaction: t,
                    lock: t.LOCK.UPDATE
                })
            })(source, args, context, info);
            if (!model) throw new NotFoundError(`${this.primaryKeyName}:${primaryKeyValue} not fount`);
            await model.destroy({transaction: t});
            await t.commit();
            return true;
        } catch (e) {
            await t.rollback();
            throw e;
        }
    }


    async updateResolve(source: TSource, {data, ...args}: SequelizeArgs, context: TContext, info: GraphQLResolveInfo) {
        //添加事务
        const t = await this.model.sequelize.transaction();
        try {
            const primaryKeyValue = args[this.primaryKeyName];
            let model: M = await resolver<M, TSource, TContext, SequelizeArgs>(this.model, {
                before: _getHandlerFindOptionsFn(this.config, "update"),
                resolve: () => this.model.findByPk(primaryKeyValue, {
                    transaction: t,
                    lock: t.LOCK.UPDATE
                })
            })(source, args, context, info);
            if (!model) throw new NotFoundError(`${this.primaryKeyName}:${primaryKeyValue} not fount`);
            model = await model.update(data, {transaction: t});
            await t.commit();
            return model;
        } catch (e) {
            await t.rollback();
            throw e;
        }
    }

    async getAggregateResolve(source: TSource, {field, fn, ...args}: SequelizeArgs, context: TContext, info: GraphQLResolveInfo) {
        return this.model.aggregate(field, fn, await _getHandlerAggregateOptions(this.config, fn, args, context, info));
    }

}

