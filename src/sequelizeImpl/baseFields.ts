import {GraphQLInt, GraphQLList, GraphQLNonNull, GraphQLString, GraphQLEnumType} from "graphql";
import JSONType from "./types/jsonType";

const where = {
    type: JSONType,
    description: "A JSON object conforming the the shape specified in http://docs.sequelizejs.com/en/latest/docs/querying/"
};
const AggregateEnumType = new GraphQLEnumType({
    name: "AggregateMenu",
    values: {
        sum: {
            description: "某个字段相加",
            value: "sum"
        },
        max: {
            description: "最大值",
            value: "max"
        },
        min: {
            description: "最小值",
            value: "min"
        }
    }
});
const aggregateFunction = {
    type: new GraphQLNonNull(AggregateEnumType),
    description: "A JSON object conforming the the shape specified in http://docs.sequelizejs.com/en/latest/docs/querying/"
};
const offset = {
    description: "偏移量",
    type: GraphQLInt
};
const scope = {
    description: "add custom scope",
    type: new GraphQLList(GraphQLString)
};
const limit = {
    description: "限制返回的数量",
    type: GraphQLInt,
};
const field = {
    type: new GraphQLNonNull(GraphQLString),
    description: "model single field name"
};
const order = {
    description: `
         takes an array of items to order the query
         [
           ['title', 'DESC'],
           ['Task', 'createdAt', 'DESC'],
         ]
        `,
    type: new GraphQLList(new GraphQLList(GraphQLString))
};
export {
    scope,
    limit,
    order,
    offset,
    where,
    field,
    aggregateFunction
};
