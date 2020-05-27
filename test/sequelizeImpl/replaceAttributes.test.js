const {replaceAttributes} = require("../../dist/sequelizeImpl/replaceAttributes");
const assert = require("assert");
const {Sequelize} = require("sequelize");

describe("#replaceAttributes", () => {
  
  it("should be true", function () {
    const attributes = replaceAttributes({
      include: ["name", ["COUNT"], ["SUM", "age"], ["avg", "money", true], ["avg", "price"]]
    });
    assert.deepStrictEqual(attributes, {
      include: ["name", [Sequelize.fn("COUNT", "*"), "_count"],
        [Sequelize.fn("SUM", Sequelize.col("age")), "age"], [
            Sequelize.fn("AVG", Sequelize.col("money")), "_avg"],
        [Sequelize.fn("AVG", Sequelize.col("price")), "price"]]
    });
  });
});
