import * as typeMapper from "./typeMapper";
import {GraphQLEnumType, GraphQLNonNull} from "graphql";
import {ModelType} from "sequelize";
import _ from "lodash";

type FunctionGet = ((key: string) => boolean) | string[]
type FieldsOptions = {
    cache?: any;
    exclude?: FunctionGet;
    map?: any;
    allowNull?: boolean;
    only?: FunctionGet;
    commentToDescription?: boolean;
    filterAutomatic?: boolean;
    isInput?: boolean;
    automaticKey?: FunctionGet;
}
const cacheMap: { [key: string]: any } = {};
export default function (Model: ModelType, options: FieldsOptions = {}) {
    options = {
        commentToDescription: true,
        ...options
    };
    const cache = options.cache || cacheMap;
    return Object.keys(Model.rawAttributes || {}).reduce<any>((memo, key) => {
        if (options.exclude) {
            if (_.isFunction(options.exclude) && options.exclude(key)) return memo;
            if (_.isArray(options.exclude) && options.exclude.includes(key)) return memo;
        }
        if (options.only) {
            if (_.isFunction(options.only) && !options.only(key)) return memo;
            if (_.isArray(options.only) && !options.only.includes(key)) return memo;
        }

        const attribute = Model.rawAttributes[key];


        if (options.filterAutomatic) {
            // @ts-ignore
            if (attribute.autoIncrement || attribute._autoGenerated) {
                return memo;
            }
            if (options.automaticKey) {
                if (_.isFunction(options.automaticKey) && options.automaticKey(key)) return memo;
                if (_.isArray(options.automaticKey) && options.automaticKey.includes(key)) return memo;
            }
        }

        if (options.map) {
            if (_.isFunction(options.map)) {
                key = options.map(key) || key;
            } else {
                key = options.map[key] || key;
            }
        }


        memo[key] = {
            type: typeMapper.toGraphQL(attribute.type)
        };

        if (memo[key].type instanceof GraphQLEnumType) {
            const typeName = `${_.upperFirst(Model.name)}${_.upperFirst(key)}Enum`;
            if (cache[typeName]) {
                memo[key].type = cache[typeName];
            } else {
                memo[key].type.name = typeName;
                cache[typeName] = memo[key].type;
            }

        }

        if (!options.allowNull
            && (attribute.allowNull === false || attribute.primaryKey === true)) {
            if (!options.isInput || _.isUndefined(attribute.defaultValue)) {
                memo[key].type = new GraphQLNonNull(memo[key].type);
            }
        }

        if (options.commentToDescription) {
            if (_.isString(attribute.comment)) {
                memo[key].description = attribute.comment;
            }
        }

        return memo;
    }, {});
};
