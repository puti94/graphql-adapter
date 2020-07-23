import {
    GraphQLScalarType,
    GraphQLInt,
    GraphQLFloat,
    GraphQLBoolean,
    GraphQLString,
    IntValueNode,
    FloatValueNode,
    BooleanValueNode,
    StringValueNode,
    EnumValueNode,
    ListValueNode,
    ObjectValueNode,
    VariableNode
} from "graphql";
import _ from "lodash";

import {Kind} from "graphql/language";

const JSONType: GraphQLScalarType = new GraphQLScalarType({
    name: "JSONType",
    description: "The `JSON` scalar type represents raw JSON as values.",
    serialize: value => value,
    parseValue: value => typeof value === "string" ? JSON.parse(value) : value,
    parseLiteral: ast => {
        // @ts-ignore
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        const parser = astToJson[ast.kind];
        return parser ? parser(ast) : null;
    }
});

export const astToJson = {
  [Kind.INT](ast: IntValueNode) {
    return GraphQLInt.parseLiteral(ast,null);
  },
  [Kind.FLOAT](ast: FloatValueNode) {
    return GraphQLFloat.parseLiteral(ast,null);
  },
  [Kind.BOOLEAN](ast: BooleanValueNode) {
    return GraphQLBoolean.parseLiteral(ast,null);
  },
  [Kind.STRING](ast: StringValueNode) {
    return GraphQLString.parseLiteral(ast,null);
  },
  [Kind.ENUM](ast: EnumValueNode) {
    return String(ast.value);
  },
  [Kind.LIST](ast: ListValueNode) {
    return ast.values.map(astItem => {
      return JSONType.parseLiteral(astItem,null);
    });
  },
  [Kind.OBJECT](ast: ObjectValueNode) {
    const obj = {};
    ast.fields.forEach(field => {
      // @ts-ignore
      obj[field.name.value] = JSONType.parseLiteral(field.value,null);
    });
    return obj;
  },
  [Kind.VARIABLE](ast: VariableNode) {
        /*
        this way converted query variables would be easily
        converted to actual values in the resolver.js by just
        passing the query variables object in to function below.
        We can`t convert them just in here because query variables
        are not accessible from GraphQLScalarType's parseLiteral method
        */
    return _.property(ast.name.value);
  }
};


export default JSONType;
