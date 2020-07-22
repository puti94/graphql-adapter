import {
    GraphQLScalarType
} from "graphql";
import _ from "lodash";

export default new GraphQLScalarType({
    name: "BasicType",
    description: "全部标量类型",
    serialize(d) {
        return d;
    },
    parseValue(value) {
        if (_.isNumber(value) || _.isBoolean(value) || _.isString(value)) {
            return value;
        }
        return null;
    },
    parseLiteral(ast) {
        switch (ast.kind) {
            case "BooleanValue":
            case "FloatValue":
            case "IntValue":
            case "StringValue":
                return ast.value;
            default:
                return null;
        }
    }
});
