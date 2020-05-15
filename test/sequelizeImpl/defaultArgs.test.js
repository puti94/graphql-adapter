const {defaultArgs, scope, where} = require("../../dist/sequelizeImpl");
const assert = require("assert");
const {
  GraphQLString,
} = require("graphql");
const {Sequelize, DataTypes} = require("sequelize");

const Account = new Sequelize({dialect: "mysql"}).define("Account", {
  uuid: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV1,
    allowNull: false,
    comment: "账户id",
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING
  },
  mobile: {
    type: DataTypes.STRING,
    allowNull: false
  },
  age: DataTypes.INTEGER,
  describe: {
    type: DataTypes.JSON
  },
  active: DataTypes.BOOLEAN,
  balance: {
    type: DataTypes.DECIMAL(18, 10),
    defaultValue: 0
  }
});

describe("#defaultArgs", () => {
  const expected = {
    uuid: {type: GraphQLString, description: "账户id"},
    scope,
    where
  };
  
  it("no options", function () {
    assert.deepStrictEqual(defaultArgs(Account), expected);
  });
  
});
