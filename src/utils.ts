import {
    getNullableType,
    GraphQLFieldConfigArgumentMap,
    GraphQLFieldConfigMap,
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLSchemaConfig,
    GraphQLObjectTypeConfig,
    GraphQLList,
    GraphQLNonNull,
    GraphQLEnumType
} from "graphql";
import {ModelCtor, ModelType} from "sequelize";
import {SequelizeAdapter, SequelizeAdapterConfig} from "./SequelizeAdapter";
import _ from "lodash";
import {MetaDataType, getMetaDataList, getMetaData} from "./metadata";

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

type GenerateAdapterConfig<T> =
    SequelizeAdapterConfig<any, any, any> &
    Partial<GraphQLSchemaConfig> &
    {
        customQuery?: ((adapters: AdapterMaps<T>) => GraphQLFieldConfigMap<any, any>) | GraphQLFieldConfigMap<any, any>;
        customMutation?: ((adapters: AdapterMaps<T>) => GraphQLFieldConfigMap<any, any>) | GraphQLFieldConfigMap<any, any>;
        customSubscription?: ((adapters: AdapterMaps<T>) => GraphQLFieldConfigMap<any, any>) | GraphQLFieldConfigMap<any, any>;
        configMap?: { [key in keyof T]?: SequelizeAdapterConfig<any, any, any> };
        includeMutation?: boolean;
        includeSubscription?: boolean;
        withMetadata?: boolean;
    }

type AdapterMaps<T> = { [key in keyof T]?: SequelizeAdapter<any, any, any> }

function thunkGet<T>(value: ((adapters: AdapterMaps<T>) => GraphQLFieldConfigMap<any, any>) | GraphQLFieldConfigMap<any, any>, adapters: AdapterMaps<T>): GraphQLFieldConfigMap<any, any> {
    if (_.isFunction(value)) return value(adapters);
    return value;
}

function generateType<T>(include: boolean, value: ((adapters: AdapterMaps<T>) => GraphQLFieldConfigMap<any, any>) | GraphQLFieldConfigMap<any, any>,
                         adapters: AdapterMaps<T>, fields: GraphQLFieldConfigMap<any, any>, config: GraphQLObjectTypeConfig<any, any>): GraphQLObjectType | null {
    if (!include && (!_.isFunction(value) && _.isEmpty(value)) || (_.isFunction(value) && _.isEmpty(thunkGet(value, adapters)))) return null;
    return new GraphQLObjectType({
        ...config,
        fields: () => ({
            ...(include ? fields : {}),
            ...thunkGet(value, adapters)
        })
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
        includeMutation = true,
        includeSubscription = true,
        withMetadata = true,
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
            fields: () => ({
                ..._.omit({
                    gqlMetadataList: {
                        type: new GraphQLList(MetaDataType),
                        resolve: () => {
                            return getMetaDataList(adapters);
                        }
                    },
                    gqlMetadata: {
                        type: MetaDataType,
                        args: {
                            name: {
                                type: new GraphQLNonNull(new GraphQLEnumType({
                                    name: "AdapterEnum",
                                    values: Object.keys(adapters).reduce<any>((memo, key) => {
                                        const name = adapters[key].name;
                                        memo[name] = {value: key};
                                        return memo;
                                    }, {})
                                })),
                                description: "模型"
                            }
                        },
                        resolve: (source, {name}) => {
                            return getMetaData(adapters[name]);
                        }
                    },
                }, withMetadata ? [] : ["gqlMetadata", "gqlMetadataList"]),
                ...query,
                ...thunkGet(customQuery, adapters)
            })
        }),
        mutation: generateType(includeMutation, customMutation, adapters, mutation, {
            name: "Mutation",
            description: "Base Mutation",
            fields: {}
        }),
        subscription: generateType(includeSubscription, customSubscription, adapters, subscription, {
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
