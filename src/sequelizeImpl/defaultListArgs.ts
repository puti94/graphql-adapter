import {GraphQLInputFieldConfig, GraphQLInputFieldConfigMap} from "graphql";
import {scope, limit, where, offset, subQuery} from "./baseFields";

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
        subQuery,
        order: options.order
    };
}
