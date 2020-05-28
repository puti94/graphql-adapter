const {SequelizeAdapter, where, scope, limit, offset, order, aggregateFunction, Query, Mutation, Subscription, DateType, field, having, attributes, group} = require("../dist");
const {GraphQLInt, GraphQLNonNull, GraphQLString} = require("graphql");
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
  it("aggregationArgs", async function () {
    const adapter = new SequelizeAdapter(Model, {});
    assert.deepStrictEqual(adapter.aggregationArgs, {
      aggregateFunction,
      field,
      where,
    });
  });
  it("inputArgs", async function () {
    const adapter = new SequelizeAdapter(Model);
    assert.deepStrictEqual(adapter.inputArgs, {
      scope,
      where,
      id: {
        type: GraphQLInt,
        description: "主键"
      }
    });
  });
  it("inputListArgs", async function () {
    const adapter = new SequelizeAdapter(Model);
    assert.deepStrictEqual(adapter.inputListArgs, {
      scope,
      having,
      attributes,
      group,
      limit: {
        defaultValue: 20,
        ...limit
      },
      offset,
      order,
      where
    });
  });
  it("modelFields", async function () {
    const adapter = new SequelizeAdapter(Model);
    assert.deepStrictEqual(_.omit(adapter.modelFields, ["_count", "_avg"]), {
      id: {
        type: new GraphQLNonNull(GraphQLInt)
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
    assert.deepStrictEqual(Object.keys(adapter.modelType.getFields()), ["_count", "_avg", "id", "name", "hello"]);
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
    assert.deepStrictEqual(new Set(Object.keys(adapter.modelType.getFields())), new Set(["id", "name", "_count", "_avg"]));
  });
  it("queryFields", async function () {
    const adapter = new SequelizeAdapter(Model);
    assert.deepStrictEqual(new Set(Object.keys(adapter.queryFields[adapter.name].type.getFields())), new Set(["one", "aggregation", "list", "listPage"]));
  });
  it("queryFieldsIncludeOptions", async function () {
    const adapter = new SequelizeAdapter(Model, {
      includeQuery: [Query.LIST_PAGE]
    });
    assert.deepStrictEqual(new Set(Object.keys(adapter.queryFields[adapter.name].type.getFields())), new Set(["listPage"]));
  });
  it("queryFieldsIncludeFalseOptions", async function () {
    const adapter = new SequelizeAdapter(Model, {
      includeQuery: false
    });
    assert.deepStrictEqual(new Set(Object.keys(adapter.queryFields)), new Set([]));
  });
  it("queryFieldsExcludeOptions", async function () {
    const adapter = new SequelizeAdapter(Model, {
      excludeQuery: [Query.ONE, Query.AGGREGATION, Query.LIST]
    });
    assert.deepStrictEqual(new Set(Object.keys(adapter.queryFields[adapter.name].type.getFields())), new Set(["listPage"]));
  });
  it("queryFieldsIncludeFuncOptions", async function () {
    const adapter = new SequelizeAdapter(Model, {
      includeQuery: (key) => key === Query.LIST_PAGE
    });
    assert.deepStrictEqual(new Set(Object.keys(adapter.queryFields[adapter.name].type.getFields())), new Set(["listPage"]));
  });
  it("queryFieldsExcludeFuncOptions", async function () {
    const adapter = new SequelizeAdapter(Model, {
      excludeQuery: (key) => key !== Query.LIST_PAGE
    });
    assert.deepStrictEqual(new Set(Object.keys(adapter.queryFields[adapter.name].type.getFields())), new Set(["listPage"]));
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
});
