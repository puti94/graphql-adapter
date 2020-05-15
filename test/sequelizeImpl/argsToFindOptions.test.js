const argsToFindOptions = require("../../dist/sequelizeImpl/argsToFindOptions").default;
const assert = require("assert");
const {Op} = require("sequelize");

describe("#argsToFindOptions", () => {
  it("should be true", function () {
    assert.deepStrictEqual(argsToFindOptions({
      id: "21",
      title: "title",
      limit: 10,
      offset: 10,
      where: {
        name: "name",
        age: {
          gt: 6
        }
      },
      order: [["createdAt", "DESC"]]
    }, ["id", "title"]), {
      limit: 10,
      offset: 10,
      order: [["createdAt", "DESC"]],
      where: {
        id: "21",
        title: "title",
        name: "name",
        age: {
          [Op.gt]: 6
        }
      }
    });
  });
});
