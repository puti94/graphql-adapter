import {
    GraphQLBoolean,
    GraphQLEnumType,
    GraphQLFloat, GraphQLInputType,
    GraphQLInt,
    GraphQLList,
    GraphQLString,
    GraphQLType
} from "graphql";

import DateType from "./types/dateType";
import JSONType from "./types/jsonType";
import _ from "lodash";
import {DataType, AbstractDataType, ArrayDataType, EnumDataType, VirtualDataType} from "sequelize";

type Map2GraphQLFun = (sequelizeType: SequelizeType) => GraphQLType | GraphQLInputType;
let customTypeMapper: Map2GraphQLFun;

/**
 * A function to set a custom mapping of types
 * @param {Function} mapFunc
 */
export function mapType(mapFunc: Map2GraphQLFun) {
    customTypeMapper = mapFunc;
}

const specialCharsMap = new Map([
    ["¼", "frac14"],
    ["½", "frac12"],
    ["¾", "frac34"]
]);

function sanitizeEnumValue(value: string) {
    return value
        .trim()
        .replace(/([^_a-zA-Z0-9])/g, (_, p) => specialCharsMap.get(p) || " ")
        .split(" ")
        .map((v, i) => i ? _.upperFirst(v) : v)
        .join("")
        .replace(/(^\d)/, "_$1");
}


type SequelizeType = DataType | ArrayDataType<any> | EnumDataType<any> | VirtualDataType<any>;

export function toGraphQL(sequelizeType: SequelizeType): GraphQLType | GraphQLInputType {
    if (customTypeMapper) {
        const result = customTypeMapper(sequelizeType);
        if (result) return result;
    }

    if (_.isString(sequelizeType)) {
        // TODO 以字符串表示的类型暂时统一转为string类型
        return GraphQLString;
    }

    const key = (sequelizeType as AbstractDataType).key;

    if (key === "BOOLEAN") return GraphQLBoolean;

    if (["FLOAT", "REAL", "DOUBLE", "DOUBLE PRECISION"].includes(key)) return GraphQLFloat;

    if (key === "DATE") {
        return DateType;
    }

    if (["CHAR", "STRING", "TEXT", "UUID", "UUIDV1", "UUIDV2", "UUIDV3", "UUIDV4", "DATEONLY", "TIME", "BIGINT", "DECIMAL", "BLOB"].includes(key)) {
        return GraphQLString;
    }

    if ("INTEGER" === key) {
        return GraphQLInt;
    }

    if ("ARRAY" === key) {
        const elementType = toGraphQL((sequelizeType as ArrayDataType<any>).options.type);
        return new GraphQLList(elementType);
    }

    if ("ENUM" === key) {
        return new GraphQLEnumType({
            name: "tempEnumName",
            values: _((sequelizeType as EnumDataType<any>).values)
                .mapKeys(sanitizeEnumValue)
                .mapValues(v => ({value: v}))
                .value()
        });
    }

    if ("VIRTUAL" === key) {
        return (sequelizeType as VirtualDataType<any>).returnType
            ? toGraphQL((sequelizeType as VirtualDataType<any>).returnType)
            : GraphQLString;
    }

    if (["JSONB", "JSON"].includes(key)) {
        return JSONType;
    }

    throw new Error(`Unable to convert ${sequelizeType} to a GraphQL type`);

}
