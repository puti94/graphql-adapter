const {resolver} = require("../../dist/sequelizeImpl");
const assert = require("assert");
const _ = require("lodash");
const {Sequelize, DataTypes} = require("sequelize");
const sequelize = new Sequelize("mysql://test:123456@localhost:3306/testdb");

const Model = sequelize.define("testResolver", {
  name: {
    type: DataTypes.STRING
  }
});

describe("#resolver", () => {
  before(async function () {
    await Model.sync({force: true});
    await Model.create({
      name: "test"
    });
    await Model.create({
      name: "test1"
    });
    await Model.create({
      name: "test2"
    });
  });
  it("true", async function () {
    const exec = resolver(Model, {
      before: (options, args) => {
        if (_.isEmpty(args)) {
          options.where = {
            name: "test1"
          };
        }
        return options;
      },
      handler: (options) => Model.findOne(options)
    });
    assert.deepStrictEqual((await exec(null, {}, null, {})).name, "test1");
    assert.deepStrictEqual((await exec(null, {where: {name: "test2"}}, null, {})).name, "test2");
    assert.deepStrictEqual((await exec(null, {where: {name: "test3"}}, null, {})), null);
  });
  after(function () {
    Model.drop();
  });
});
