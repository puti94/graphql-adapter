const {defaultListArgs, limit, offset, order, scope, where, subQuery, having, groupBy} = require("../../dist/sequelizeImpl");
const assert = require("assert");


describe("#defaultListArgs", () => {
  const expected = {
    limit: {...limit, defaultValue: 10},
    scope,
    where,
    order, offset, subQuery, groupBy, having
  };
  
  it("no options", function () {
    assert.deepStrictEqual(defaultListArgs({defaultLimit: 10, groupBy, order}), expected);
  });
  
});
