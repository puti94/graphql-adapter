import {replaceWhereOperators} from "./replaceWhereOperators";
import {replaceAttributes} from "./replaceAttributes";
import {FindOptions} from "sequelize";
import _ from "lodash";

export default function argsToFindOptions(args: {
    [key: string]: any;
}, targetAttributes: string[]) {
    const result: FindOptions = {};
    if (args) {
        Object.keys(args).forEach(function (key) {
            if (!_.isUndefined(args[key])) {
                if (key === "limit") {
                    result.limit = parseInt(args[key], 10);
                } else if (key === "offset") {
                    result.offset = parseInt(args[key], 10);
                } else if (key === "group") {
                    result.group = args[key];
                } else if (key === "where") {
                    result.where = Object.assign(replaceWhereOperators(args.where), result.where);
                } else if (key === "having") {
                    result.having = Object.assign(replaceWhereOperators(args.having), result.having);
                } else if (key === "attributes") {
                    result.attributes = Object.assign(replaceAttributes(args.attributes), result.attributes);
                } else if (key === "order") {
                    const order = !_.isUndefined(args["order"]) ? (_.isArray(args["order"]) ? args["order"] : [args["order"]]) : [];
                    result.order = (order as { name: string; sort?: string }[]).map(t => [t.name, t.sort || "asc"]);
                } else if (targetAttributes.includes(key)) {
                    result.where = result.where || {};
                    // @ts-ignore
                    result.where[key] = args[key];
                }
            }
        });
    }
    return result;
}
