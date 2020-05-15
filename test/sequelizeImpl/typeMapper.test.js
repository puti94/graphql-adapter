const {toGraphQL} = require("../../dist/sequelizeImpl/typeMapper");
const DateType = require("../../dist/sequelizeImpl/types/dateType").default;
const JSONType = require("../../dist/sequelizeImpl/types/jsonType").default;
const assert = require("assert");
const {DataTypes} = require("sequelize");
const {
  GraphQLString,
  GraphQLList,
  GraphQLInt,
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLFloat
} = require("graphql");

describe("TypeMapper", () => {
  it("should be GraphQLString", function () {
    assert.strictEqual(toGraphQL(DataTypes.UUID), GraphQLString);
    assert.strictEqual(toGraphQL(DataTypes.CHAR), GraphQLString);
    assert.strictEqual(toGraphQL(DataTypes.STRING), GraphQLString);
    assert.strictEqual(toGraphQL(DataTypes.TEXT), GraphQLString);
    assert.strictEqual(toGraphQL(DataTypes.DATEONLY), GraphQLString);
    assert.strictEqual(toGraphQL(DataTypes.TIME), GraphQLString);
    assert.strictEqual(toGraphQL(DataTypes.BIGINT), GraphQLString);
    assert.strictEqual(toGraphQL(DataTypes.DECIMAL), GraphQLString);
  });
  it("should be GraphQLFloat", function () {
    assert.strictEqual(toGraphQL(DataTypes.FLOAT), GraphQLFloat);
    assert.strictEqual(toGraphQL(DataTypes.REAL), GraphQLFloat);
    assert.strictEqual(toGraphQL(DataTypes.DOUBLE(30)), GraphQLFloat);
  });
  it("should be GraphQLBoolean", function () {
    assert.strictEqual(toGraphQL(DataTypes.BOOLEAN), GraphQLBoolean);
  });
  it("should be DateType", function () {
    assert.strictEqual(toGraphQL(DataTypes.DATE), DateType);
  });
  it("should be GraphQLInt", function () {
    assert.strictEqual(toGraphQL(DataTypes.INTEGER), GraphQLInt);
  });
  it("should be GraphQLList", function () {
    assert.strictEqual(toGraphQL(DataTypes.ARRAY(DataTypes.DECIMAL)).toJSON(), new GraphQLList(GraphQLString).toJSON());
  });
  it("should be GraphQLEnumType", function () {
    const target = toGraphQL(DataTypes.ENUM("VALUE1", "VALUE2"));
    const source = new GraphQLEnumType({
      name: "tempEnumName",
      values: {
        VALUE1: {
          value: "VALUE1"
        },
        VALUE2: {
          value: "VALUE2"
        }
      }
    });
    // const differ = difference(target, source);
    assert.deepStrictEqual(target, source);
  });
  it("should be JSONType", function () {
    assert.strictEqual(toGraphQL(DataTypes.JSON), JSONType);
    assert.strictEqual(toGraphQL(DataTypes.JSONB), JSONType);
  });
});
