import {GraphQLInputFieldConfig, GraphQLInputFieldConfigMap} from "graphql";
import {scope, limit, where, offset} from "./baseFields";

export function defaultListArgs(options: {
    defaultLimit?: number;
    order?: GraphQLInputFieldConfig;
} = {}): GraphQLInputFieldConfigMap {
    return {
        scope,
        limit: {
            ...limit,
            defaultValue: options.defaultLimit,
        },
        where,
        offset,
        order: options.order
    };
}
