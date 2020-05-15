const {replaceWhereOperators} = require("../../dist/sequelizeImpl/replaceWhereOperators");
const assert = require("assert");
const {Op} = require("sequelize");

describe("#replaceWhereOperators", () => {
  
  it("should be true", function () {
    const operators = replaceWhereOperators({
      id: {
        or: ["1", "2"]
      },
      [Op.or]: [
        {
          title: {
            like: "Boat%"
          }
        },
        {
          description: {
            like: "%boat%"
          }
        }
      ]
    });
    assert.deepStrictEqual(operators, {
      id: {
        [Op.or]: ["1", "2"]
      },
      [Op.or]: [
        {
          title: {
            [Op.like]: "Boat%"
          }
        },
        {
          description: {
            [Op.like]: "%boat%"
          }
        }
      ]
    });
  });
});
