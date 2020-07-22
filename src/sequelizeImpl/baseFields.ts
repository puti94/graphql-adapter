import {
    GraphQLInt,
    GraphQLList,
    GraphQLNonNull,
    GraphQLString,
    GraphQLEnumType,
    GraphQLBoolean,
} from "graphql";
import JSONType from "./types/jsonType";

const where = {
    type: JSONType,
    description: "A JSON object conforming the the shape specified in http://docs.sequelizejs.com/en/latest/docs/querying/"
};

const having = {
    type: JSONType,
    description: "A JSON object conforming the the shape specified in http://docs.sequelizejs.com/en/latest/docs/querying/"
};

const groupBy = {
    type: GraphQLString,
    description: "groupBy field"
};
const methodNumberFields = {
    SUM: {
        description: "某个字段相加",
        value: "sum"
    },
    MAX: {
        description: "最大值",
        value: "max"
    },
    MIN: {
        description: "最小值",
        value: "min"
    },
    COUNT: {
        description: "总量",
        value: "count"
    },
    AVG: {
        description: "平均值",
        value: "avg"
    }
};

const AggregateEnumType = new GraphQLEnumType({
    name: "AggregateMenu",
    values: methodNumberFields
});

const aggregateFunction = {
    type: new GraphQLNonNull(AggregateEnumType),
    description: "聚合函数枚举类型"
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

const subQuery = {
    type: GraphQLBoolean,
    description: "Use sub queries. This should only be used if you know for sure the query does not result in a cartesian product."
};
const includeFields = {
    right: {
        type: GraphQLBoolean,
        description: "If true, converts to a right join if dialect support it. Ignored if `include.required` is true."
    },
    required: {
        type: GraphQLBoolean,
        description: "If true, converts to an inner join, which means that the parent model will only be loaded if it has any * matching children. True if `include.where` is set, false otherwise."
    },
    separate: {
        type: GraphQLBoolean,
        description: "Run include in separate queries."
    },

    duplicating: {
        type: GraphQLBoolean,
        description: "Mark the include as duplicating, will prevent a subQuery from being used."
    },
    on: {
        type: JSONType,
        description: "Custom `on` clause, overrides default."
    }
};


const OrderSortEnum = new GraphQLEnumType({
    name: "SortType",
    values: {
        asc: {value: "asc"},
        desc: {value: "desc"},
    }
});


export {
    scope,
    limit,
    offset,
    where,
    having,
    groupBy,
    OrderSortEnum,
    aggregateFunction,
    includeFields,
    subQuery
};
