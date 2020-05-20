import {
    getNullableType,
    GraphQLFieldConfigArgumentMap,
    GraphQLFieldConfigMap,
    GraphQLSchema, GraphQLObjectType, Thunk
} from "graphql";
import {Model, ModelCtor, ModelType} from "sequelize";
import {SequelizeAdapter, SequelizeAdapterConfig} from "./SequelizeAdapter";
import _ from "lodash";

function getName(model: ModelType) {
    return _.upperFirst(model.name);
}

function map2NullableType(fields: GraphQLFieldConfigArgumentMap): GraphQLFieldConfigArgumentMap {
    const args: GraphQLFieldConfigArgumentMap = {};
    Object.keys(fields).forEach(t => {
        args[t] = {...fields[t]};
        args[t].type = getNullableType(args[t].type);
    });
    return args;
}

type GenerateAdapterConfig = SequelizeAdapterConfig<any, any, any> & {
    customQuery?: ((adapters: AdapterMaps) => GraphQLFieldConfigMap<any, any>) | GraphQLFieldConfigMap<any, any>;
    customMutation?: ((adapters: AdapterMaps) => GraphQLFieldConfigMap<any, any>) | GraphQLFieldConfigMap<any, any>;
    customSubscription?: ((adapters: AdapterMaps) => GraphQLFieldConfigMap<any, any>) | GraphQLFieldConfigMap<any, any>;
    configMap?: { [key: string]: SequelizeAdapterConfig<any, any, any> };
    includeMutation?: boolean;
    includeSubscription?: boolean;
}

type AdapterMaps = { [key: string]: SequelizeAdapter<any, any, any> }

function thunkGet(value: ((adapters: AdapterMaps) => GraphQLFieldConfigMap<any, any>) | GraphQLFieldConfigMap<any, any>, adapters: AdapterMaps): GraphQLFieldConfigMap<any, any> {
    if (_.isFunction(value)) return value(adapters);
    return value;
}

/**
 *
 * @param models
 * @param options
 * @returns {GraphQLSchema}
 */
function generateSchema(models: { [key: string]: ModelCtor<Model> }, options: GenerateAdapterConfig = {}): GraphQLSchema {
    const {
        customQuery = {},
        customMutation = {},
        customSubscription = {},
        includeMutation = true,
        includeSubscription = true,
        configMap = {},
        ...commonModelConfig
    } = options;
    const {query, mutation, subscription, adapters} = Object.keys(models).reduce<{
        query: GraphQLFieldConfigMap<any, any>;
        mutation: GraphQLFieldConfigMap<any, any>;
        subscription: GraphQLFieldConfigMap<any, any>;
        adapters: AdapterMaps;
    }>((obj, key) => {
        const model = models[key];
        const modelSchema = new SequelizeAdapter(model, {...commonModelConfig, ...(configMap[key] || {})});
        Object.assign(obj.query, modelSchema.queryFields);
        Object.assign(obj.mutation, modelSchema.mutationFields);
        Object.assign(obj.subscription, modelSchema.subscriptionFields);
        obj.adapters[key] = modelSchema;
        return obj;
    }, {query: {}, mutation: {}, subscription: {}, adapters: {}});
    const mutationFields = {
        ...mutation,
        ...thunkGet(customMutation, adapters)
    };
    const subscriptionFields = {
        ...subscription,
        ...thunkGet(customSubscription, adapters)
    };
    return new GraphQLSchema({
        query: new GraphQLObjectType({
            name: "RootQuery",
            description: "Base Query",
            fields: {
                ...query,
                ...thunkGet(customQuery, adapters)
            }
        }),
        mutation: includeMutation && !_.isEmpty(mutationFields) ? new GraphQLObjectType({
            name: "RootMutation",
            description: "Base Mutation",
            fields: mutationFields
        }) : null,
        subscription: includeSubscription && !_.isEmpty(subscription) ? new GraphQLObjectType({
            name: "RootSubscription",
            description: "Base Subscription",
            fields: subscriptionFields
        }) : null
    });
}

export {
    getName,
    map2NullableType,
    generateSchema,
};
