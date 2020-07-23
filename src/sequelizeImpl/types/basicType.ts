import {
    GraphQLScalarType,
} from "graphql";


import {astToJson} from "./jsonType";

const BasicType: GraphQLScalarType = new GraphQLScalarType({
    name: "BasicType",
    description: "任意类型",
    serialize: value => value,
    parseValue: value => value,
    parseLiteral: ast => {
        // @ts-ignore
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        const parser = astToJson[ast.kind];
        return parser ? parser(ast) : null;
    }
});


export default BasicType;
