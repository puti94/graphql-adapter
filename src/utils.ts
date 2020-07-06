import {
    getNullableType,
    GraphQLFieldConfigArgumentMap,
    GraphQLFieldConfigMap,
    GraphQLSchema, GraphQLObjectType, GraphQLSchemaConfig
} from "graphql";
import {ModelCtor, ModelType} from "sequelize";
import {SequelizeAdapter, SequelizeAdapterConfig} from "./SequelizeAdapter";
import _ from "lodash";
import Maybe from "graphql/tsutils/Maybe";
import {GraphQLNamedType} from "graphql/type/definition";
import {GraphQLDirective} from "graphql/type/directives";
import {SchemaDefinitionNode, SchemaExtensionNode} from "graphql/language/ast";

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
    }

type AdapterMaps<T> = { [key in keyof T]?: SequelizeAdapter<any, any, any> }

function thunkGet<T>(value: ((adapters: AdapterMaps<T>) => GraphQLFieldConfigMap<any, any>) | GraphQLFieldConfigMap<any, any>, adapters: AdapterMaps<T>): GraphQLFieldConfigMap<any, any> {
    if (_.isFunction(value)) return value(adapters);
    return value;
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
                ...query,
                ...thunkGet(customQuery, adapters)
            })
        }),
        mutation: includeMutation ? new GraphQLObjectType({
            name: "Mutation",
            description: "Base Mutation",
            fields: () => ({
                ...mutation,
                ...thunkGet(customMutation, adapters)
            })
        }) : null,
        subscription: includeSubscription ? new GraphQLObjectType({
            name: "Subscription",
            description: "Base Subscription",
            fields: () => (
                {
                    ...subscription,
                    ...thunkGet(customSubscription, adapters)
                }
            )
        }) : null,
        ...(_.pick(commonModelConfig, ["description", "query", "mutation", "subscription", "types", "directives", "extensions", "astNode", "extensionASTNodes", "assumeValid"]))
    });
}

export {
    getName,
    map2NullableType,
    generateSchema,
};
