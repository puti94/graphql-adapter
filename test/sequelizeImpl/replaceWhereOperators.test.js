const {replaceWhereOperators} = require("../../dist/sequelizeImpl/replaceWhereOperators");
const assert = require("assert");
const {Op} = require("sequelize");

describe("#replaceWhereOperators", () => {
  
  it("should be true", function () {
    const operators = replaceWhereOperators({
      id: {
        _or: ["1", "2"]
      },
      _or: [
        {
          title: {
            _like: "Boat%"
          }
        },
        {
          description: {
            _like: "%boat%"
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
