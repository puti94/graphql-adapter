import {GraphQLInputFieldConfigMap} from "graphql";
import {scope, limit, order, where, offset, group, having, attributes} from "./baseFields";

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
        group,
        where,
        attributes,
        having,
        offset
    };
}
