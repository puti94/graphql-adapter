const Utils = require("../dist/utils");
const assert = require("assert");
const {models} = require("./db");
const {GraphQLString, GraphQLNonNull} = require("graphql");

const {Account} = models;

const schema = {
  test: {
    type: GraphQLNonNull(GraphQLString)
  }
};


describe("Utils", () => {
  it("should be get model name", function () {
    assert.strictEqual(Utils.getName(Account), "Account");
  });
  it("should be get nullableType", function () {
    assert.strictEqual(Utils.map2NullableType(schema).test.type, GraphQLString);
  });
});
