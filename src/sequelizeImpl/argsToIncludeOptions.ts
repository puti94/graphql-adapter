import {replaceWhereOperators} from "./replaceWhereOperators";
import {replaceAttributes} from "./replaceAttributes";
import {IncludeOptions} from "sequelize";
import _ from "lodash";

export default function argsToIncludeOptions(args: {
    [key: string]: any;
}, targetAttributes: string[]) {
    const result: IncludeOptions = {};
    if (args) {
        Object.keys(args).forEach(function (key) {
            if (!_.isUndefined(args[key])) {
                if (key === "limit") {
                    result.limit = parseInt(args[key], 10);
                } else if (key === "required") {
                    result.required = args[key];
                } else if (key === "right") {
                    result.right = args[key];
                } else if (key === "separate") {
                    result.separate = args[key];
                } else if (key === "subQuery") {
                    result.subQuery = args[key];
                } else if (key === "where") {
                    result.where = Object.assign(replaceWhereOperators(args.where), result.where);
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
