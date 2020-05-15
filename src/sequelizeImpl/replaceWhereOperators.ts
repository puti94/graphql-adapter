import sequelizeOps from "./sequelizeOps";
import {WhereOptions} from "sequelize";
import _ from "lodash";
/**
 * Replace a key deeply in an object
 * @param obj
 * @param keyMap
 * @returns {Object}
 */
function replaceKeyDeep(obj: any, keyMap: any): WhereOptions {
    // @ts-ignore
    return Object.getOwnPropertySymbols(obj).concat(Object.keys(obj)).reduce((memo, key) => {

        // determine which key we are going to use
        const targetKey = keyMap[key] ? keyMap[key] : key;

        if (Array.isArray(obj[key])) {
            memo[targetKey] = obj[key].map((val: any) => {
                if (_.isObject(val)) {
                    return replaceKeyDeep(val, keyMap);
                }
                return val;
            });
        } else if (_.isObject(obj[key])) {
            memo[targetKey] = replaceKeyDeep(obj[key], keyMap);
        } else {
            memo[targetKey] = obj[key];
        }

        return memo;
    }, {});
}


/**
 * Replace the where arguments object and return the sequelize compatible version.
 * @param where arguments object in GraphQL Safe format meaning no leading "$" chars.
 * @returns {Object}
 */
export function replaceWhereOperators(where: object): WhereOptions {
    return replaceKeyDeep(where, sequelizeOps);
}
