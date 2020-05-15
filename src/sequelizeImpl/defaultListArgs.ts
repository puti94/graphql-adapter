import {GraphQLInputFieldConfigMap} from "graphql";
import {scope, limit, order, where, offset} from "./baseFields";

export function defaultListArgs(options: {
    defaultLimit?: number;
} = {}): GraphQLInputFieldConfigMap {
    return {
        scope,
        limit: {
            ...limit,
            defaultValue: options.defaultLimit,
        },
        order,
        where,
        offset
    };
};
