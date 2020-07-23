import {replaceWhereOperators} from "./replaceWhereOperators";
import argsToOtherOptions from "./argsToOtherOptions";
import {FindOptions, ModelType} from "sequelize";
import _ from "lodash";

export default function argsToFindOptions(args: {
    [key: string]: any;
}, model: ModelType): { options: FindOptions; associationFields: string[] } {
    const result: FindOptions = {};
    let associationFields: string[] = [];
    if (args) {
        Object.keys(args).forEach(function (key) {
            if (!_.isUndefined(args[key])) {
                if (key === "limit") {
                    result.limit = parseInt(args[key], 10);
                } else if (key === "offset") {
                    result.offset = parseInt(args[key], 10);
                } else if (key === "required") {
                    // @ts-ignore
                    result.required = args[key];
                } else if (key === "right") {
                    // @ts-ignore
                    result.right = args[key];
                } else if (key === "groupBy") {
                    const otherOptions = argsToOtherOptions(args[key], model);
                    result.group = otherOptions.options;
                    associationFields = otherOptions.associationFields;
                } else if (key === "subQuery") {
                    result.subQuery = args[key];
                } else if (key === "where") {
                    result.where = Object.assign(replaceWhereOperators(args.where), result.where);
                } else if (key === "having") {
                    result.having = Object.assign(replaceWhereOperators(args.having), result.having);
                } else if (key === "order") {
                    const order = !_.isUndefined(args["order"]) ? (_.isArray(args["order"]) ? args["order"] : [args["order"]]) : [];
                    result.order = (order as { name: string; sort?: string }[]).map(t => [t.name, t.sort || "asc"]);
                } else if (model.rawAttributes[key]) {
                    result.where = result.where || {};
                    // @ts-ignore
                    result.where[key] = args[key];
                }
            }
        });
    }
    return {
        options: result,
        associationFields
    };
}
