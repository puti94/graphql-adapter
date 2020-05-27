const {defaultListArgs, limit, offset, order, scope, where, having, attributes, group} = require("../../dist/sequelizeImpl");
const assert = require("assert");
const {
  GraphQLString,
} = require("graphql");


describe("#defaultListArgs", () => {
  const expected = {
    limit: {...limit, defaultValue: 10},
    scope,
    where,
    order, offset, group, attributes, having
  };
  
  it("no options", function () {
    assert.deepStrictEqual(defaultListArgs({defaultLimit: 10}), expected);
  });
  
});
