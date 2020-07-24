import {
    getNullableType,
    GraphQLFieldConfigArgumentMap,
    GraphQLFieldConfigMap,
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLSchemaConfig,
    GraphQLObjectTypeConfig,
} from "graphql";
import {ModelCtor, ModelType} from "sequelize";
import {SequelizeAdapter, SequelizeAdapterConfig} from "./SequelizeAdapter";
import _ from "lodash";
import CONS from "./constant";

/**
 * 覆盖一些常量
 * @param map
 */
export function mergeConstant(map: Partial<typeof CONS>) {
    _.merge(CONS, map);
}

function getName(model: ModelType) {
    return model.name;
}

function map2NullableType(fields: GraphQLFieldConfigArgumentMap): GraphQLFieldConfigArgumentMap {
    const args: GraphQLFieldConfigArgumentMap = {};
    Object.keys(fields).forEach(t => {
        args[t] = {...fields[t]};
        args[t].type = getNullableType(args[t].type);
    });
    return args;
}

export type GenerateAdapterConfig<T> =
    SequelizeAdapterConfig<any, any, any> &
    Partial<GraphQLSchemaConfig> &
    {
        customQuery?: ((adapters: AdapterMaps<T>) => GraphQLFieldConfigMap<any, any>) | GraphQLFieldConfigMap<any, any>;
        customMutation?: ((adapters: AdapterMaps<T>) => GraphQLFieldConfigMap<any, any>) | GraphQLFieldConfigMap<any, any>;
        customSubscription?: ((adapters: AdapterMaps<T>) => GraphQLFieldConfigMap<any, any>) | GraphQLFieldConfigMap<any, any>;
        configMap?: { [key in keyof T]?: SequelizeAdapterConfig<any, any, any> };
        /**
         * 是否添加Mutation
         */
        includeMutation?: boolean;
        /**
         * 是否添加Subscription
         */
        includeSubscription?: boolean;
        /**
         * 移除Query字段
         */
        omitQueryFields?: string[];
        /**
         * 移除Mutation字段
         */
        omitMutationFields?: string[];
        /**
         * 移除Subscription字段
         */
        omitSubscriptionFields?: string[];
    }

export type AdapterMaps<T> = { [key in keyof T]?: SequelizeAdapter<any, any, any> }

function thunkGet<T>(value: ((adapters: AdapterMaps<T>) => GraphQLFieldConfigMap<any, any>) | GraphQLFieldConfigMap<any, any>, adapters: AdapterMaps<T>): GraphQLFieldConfigMap<any, any> {
    if (_.isFunction(value)) return value(adapters);
    return value;
}

function generateType<T>(include: boolean, omitFields: string[], value: ((adapters: AdapterMaps<T>) => GraphQLFieldConfigMap<any, any>) | GraphQLFieldConfigMap<any, any>,
                         adapters: AdapterMaps<T>, fields: GraphQLFieldConfigMap<any, any>, config: GraphQLObjectTypeConfig<any, any>): GraphQLObjectType | null {
    if (!include && (!_.isFunction(value) && _.isEmpty(value)) || (_.isFunction(value) && _.isEmpty(thunkGet(value, adapters)))) return null;
    return new GraphQLObjectType({
        ...config,
        fields: () => _.omit({
            ...(include ? fields : {}),
            ...thunkGet(value, adapters)
        }, omitFields)
    });
}

/**
 *
 * @param models
 * @param options
 * @returns {GraphQLSchema}
 */
function generateSchema<T extends { [key: string]: ModelCtor<any> }>(models: T, options: GenerateAdapterConfig<T> = {}): GraphQLSchema {
    const {
        customQuery = {},
        customMutation = {},
        customSubscription = {},
        omitQueryFields = [],
        omitMutationFields = [],
        omitSubscriptionFields = [],
        includeMutation = true,
        includeSubscription = true,
        configMap = {},
        ...commonModelConfig
    } = options;
    // @ts-ignore
    const {query, mutation, subscription, adapters} = Object.keys(models).reduce<{
        query: GraphQLFieldConfigMap<any, any>;
        mutation: GraphQLFieldConfigMap<any, any>;
        subscription: GraphQLFieldConfigMap<any, any>;
        adapters: AdapterMaps<T>;
    }>((obj, key) => {
        const model = models[key];
        // @ts-ignore
        const modelSchema = new SequelizeAdapter(model, {...commonModelConfig, ...(configMap[key] || {})});
        Object.assign(obj.query, modelSchema.queryFields);
        Object.assign(obj.mutation, modelSchema.mutationFields);
        Object.assign(obj.subscription, modelSchema.subscriptionFields);
        // @ts-ignore
        obj.adapters[key] = modelSchema;
        return obj;
    }, {query: {}, mutation: {}, subscription: {}, adapters: {}});
    return new GraphQLSchema({
        query: new GraphQLObjectType({
            name: "Query",
            description: "Base Query",
            fields: () => {
                const fields = {
                    ...query,
                    ...thunkGet(customQuery, adapters)
                };
                return _.omit(fields, omitQueryFields);
            }
        }),
        mutation: generateType(includeMutation, omitMutationFields, customMutation, adapters, mutation, {
            name: "Mutation",
            description: "Base Mutation",
            fields: {}
        }),
        subscription: generateType(includeSubscription, omitSubscriptionFields, customSubscription, adapters, subscription, {
            name: "Subscription",
            description: "Base Subscription",
            fields: {}
        }),
        ...(_.pick(commonModelConfig, ["description", "query", "mutation", "subscription", "types", "directives", "extensions", "astNode", "extensionASTNodes", "assumeValid"]))
    });
}


export {
    getName,
    map2NullableType,
    generateSchema,
};
