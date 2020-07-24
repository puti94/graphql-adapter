const {SequelizeAdapter, where, scope, limit, offset, subQuery, aggregateFunction, Query, Mutation, groupBy, having, CONS} = require("../dist");
const {GraphQLInt, GraphQLNonNull, GraphQLString, GraphQLList} = require("graphql");
const assert = require("assert");
const _ = require("lodash");
const {Sequelize, DataTypes} = require("sequelize");
const sequelize = new Sequelize("mysql://test:123456@localhost:3306/testdb");

const Model = sequelize.define("testConfig", {
  name: {
    type: DataTypes.STRING
  }
}, {timestamps: false});

describe("#SequelizeSchema Options", () => {
  it("aggregateArgs", async function () {
    const adapter = new SequelizeAdapter(Model, {});
    assert.deepStrictEqual(adapter.aggregateArgs, {
      fn: aggregateFunction,
      field: {
        type: GraphQLNonNull(adapter.fieldEnumType)
      },
      where,
    });
  });
  it("inputArgs", async function () {
    const adapter = new SequelizeAdapter(Model);
    assert.deepStrictEqual(adapter.inputArgs, {
      scope,
      where,
      order: {
        "description": "sort",
        type: GraphQLList(adapter.orderType)
      },
      id: {
        type: GraphQLInt,
        description: "主键"
      }
    });
  });
  it("inputListArgs", async function () {
    const adapter = new SequelizeAdapter(Model);
    assert.deepStrictEqual(_.omit(adapter.inputListArgs), {
      scope,
      subQuery,
      limit: {
        defaultValue: 20,
        ...limit
      },
      offset,
      order: {
        description: "sort",
        type: GraphQLList(adapter.orderType)
      },
      where,
      groupBy,
      having
    });
  });
  it("modelFields", async function () {
    const adapter = new SequelizeAdapter(Model);
    assert.deepStrictEqual(_.omit(adapter.modelFields), {
      id: {
        type: GraphQLNonNull(GraphQLInt)
      },
      name: {
        type: GraphQLString
      }
    });
  });
  it("createFields", async function () {
    const adapter = new SequelizeAdapter(Model);
    assert.deepStrictEqual(adapter.createFields, {
      name: {
        type: GraphQLString
      }
    });
  });
  it("updateFields", async function () {
    const adapter = new SequelizeAdapter(Model);
    assert.deepStrictEqual(adapter.updateFields, {
      name: {
        type: GraphQLString
      }
    });
  });
  it("otherModelFields", async function () {
    const adapter = new SequelizeAdapter(Model, {
      modelFields: {
        hello: {
          type: GraphQLString
        }
      }
    });
    assert.deepStrictEqual(Object.keys(adapter.modelType.getFields()), ["id", "name", CONS.aggregationName, CONS.colName, "hello"]);
  });
  it("createTypeConfig", async function () {
    const adapter = new SequelizeAdapter(Model, {
      createTypeConfig: {
        fields: {
          hello: {
            type: GraphQLString
          }
        }
      }
    });
    assert.deepStrictEqual(Object.keys(adapter.createType.getFields()), ["name", "hello"]);
  });
  it("updateTypeConfig", async function () {
    const adapter = new SequelizeAdapter(Model, {
      updateTypeConfig: {
        fields: {
          hello: {
            type: GraphQLString
          }
        }
      }
    });
    assert.deepStrictEqual(Object.keys(adapter.updateType.getFields()), ["name", "hello"]);
  });
  it("updateTypeConfig", async function () {
    const adapter = new SequelizeAdapter(Model, {
      updateTypeConfig: {
        fields: {
          hello: {
            type: GraphQLString
          }
        }
      }
    });
    assert.deepStrictEqual(Object.keys(adapter.updateType.getFields()), ["name", "hello"]);
  });
  it("modelType", async function () {
    const adapter = new SequelizeAdapter(sequelize.define("test", {name: DataTypes.STRING}, {timestamps: false}));
    assert.deepStrictEqual(new Set(Object.keys(adapter.modelType.getFields())), new Set(["id", "name", CONS.aggregationName, CONS.colName]));
  });
  it("queryFields", async function () {
    const adapter = new SequelizeAdapter(Model);
    assert.deepStrictEqual(new Set(Object.keys(adapter.queryFields[adapter.name].type.getFields())), new Set([CONS.getOneField, CONS.getAggregateField, CONS.getListField]));
  });
  it("queryFieldsIncludeFalseOptions", async function () {
    const adapter = new SequelizeAdapter(Model, {
      includeQuery: false
    });
    assert.deepStrictEqual(new Set(Object.keys(adapter.queryFields)), new Set([]));
  });
  it("queryFieldsExcludeOptions", async function () {
    const adapter = new SequelizeAdapter(Model, {
      excludeQuery: [Query.ONE, Query.LIST]
    });
    assert.deepStrictEqual(new Set(Object.keys(adapter.queryFields[adapter.name].type.getFields())), new Set([Query.AGGREGATE]));
  });
  it("queryFieldsIncludeFuncOptions", async function () {
    const adapter = new SequelizeAdapter(Model, {
      includeQuery: (key) => key === Query.AGGREGATE
    });
    assert.deepStrictEqual(new Set(Object.keys(adapter.queryFields[adapter.name].type.getFields())), new Set([Query.AGGREGATE]));
  });
  it("queryFieldsExcludeFuncOptions", async function () {
    const adapter = new SequelizeAdapter(Model, {
      excludeQuery: (key) => key !== Query.AGGREGATE
    });
    assert.deepStrictEqual(new Set(Object.keys(adapter.queryFields[adapter.name].type.getFields())), new Set([Query.AGGREGATE]));
  });
  
  it("mutationFields", async function () {
    const adapter = new SequelizeAdapter(Model);
    assert.deepStrictEqual(new Set(Object.keys(adapter.mutationFields[adapter.name].type.getFields())), new Set(["create", "remove", "update"]));
  });
  it("mutationFieldsIncludeOptions", async function () {
    const adapter = new SequelizeAdapter(Model, {
      includeMutation: [Mutation.UPDATE]
    });
    assert.deepStrictEqual(new Set(Object.keys(adapter.mutationFields[adapter.name].type.getFields())), new Set(["update"]));
  });
  it("mutationFieldsIncludeFalseOptions", async function () {
    const adapter = new SequelizeAdapter(Model, {
      includeMutation: false
    });
    assert.deepStrictEqual(new Set(Object.keys(adapter.mutationFields)), new Set([]));
  });
  it("mutationFieldsExcludeOptions", async function () {
    const adapter = new SequelizeAdapter(Model, {
      excludeMutation: [Mutation.CREATE, Mutation.REMOVE]
    });
    assert.deepStrictEqual(new Set(Object.keys(adapter.mutationFields[adapter.name].type.getFields())), new Set(["update"]));
  });
  it("mutationFieldsIncludeFuncOptions", async function () {
    const adapter = new SequelizeAdapter(Model, {
      includeMutation: (key) => key === Mutation.REMOVE
    });
    assert.deepStrictEqual(new Set(Object.keys(adapter.mutationFields[adapter.name].type.getFields())), new Set(["remove"]));
  });
  it("mutationFieldsExcludeFuncOptions", async function () {
    const adapter = new SequelizeAdapter(Model, {
      excludeMutation: (key) => key !== Mutation.REMOVE
    });
    assert.deepStrictEqual(new Set(Object.keys(adapter.mutationFields[adapter.name].type.getFields())), new Set(["remove"]));
  });
  
  it("customQueryFields", async function () {
    const adapter = new SequelizeAdapter(Model, {
      queryFields: {
        custom: {
          type: GraphQLString,
          resolve() {
            return "custom";
          }
        }
      }
    });
    assert.deepStrictEqual(new Set(Object.keys(adapter.queryFields[adapter.name].type.getFields())), new Set(["one", "aggregate", "list", "custom"]));
  });
  it("customMutationFields", async function () {
    const adapter = new SequelizeAdapter(Model, {
      mutationFields: {
        custom: {
          type: GraphQLString,
          resolve() {
            return "custom";
          }
        }
      }
    });
    assert.deepStrictEqual(new Set(Object.keys(adapter.mutationFields[adapter.name].type.getFields())), new Set(["create", "remove", "update", "custom"]));
  });
});
