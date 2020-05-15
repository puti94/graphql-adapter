import {replaceWhereOperators} from "./replaceWhereOperators";
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
                } else if (key === "where") {
                    result.where = Object.assign(replaceWhereOperators(args.where), result.where);
                } else if (key === "order") {
                    result.order = args["order"];
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
