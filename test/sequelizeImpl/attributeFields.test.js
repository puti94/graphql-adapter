const attributeFields = require("../../dist/sequelizeImpl/attributeFields").default;
const assert = require("assert");
const {
  GraphQLString,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLBoolean
} = require("graphql");
const {DateType, JSONType} = require("../../dist/sequelizeImpl/types");
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

describe("#attributeFields", () => {
  const expected = {
    uuid: {type: new GraphQLNonNull(GraphQLString), description: "账户id"},
    name: {
      type: GraphQLString
    },
    age: {
      type: GraphQLInt
    },
    describe: {
      type: JSONType
    },
    active: {
      type: GraphQLBoolean
    },
    balance: {
      type: GraphQLString
    },
    mobile: {
      type: new GraphQLNonNull(GraphQLString)
    },
    createdAt: {
      type: new GraphQLNonNull(DateType)
    },
    updatedAt: {
      type: new GraphQLNonNull(DateType)
    }
  };
  
  it("no options", function () {
    assert.deepStrictEqual(attributeFields(Account), expected);
  });
  
  
  it("options filterAutomatic", function () {
    const {createdAt, updatedAt, ...others} = expected;
    assert.deepStrictEqual(attributeFields(Account, {filterAutomatic: true}), others);
  });
  
  it("options automaticKey", function () {
    const {createdAt, updatedAt, mobile, ...others} = expected;
    assert.deepStrictEqual(attributeFields(Account, {filterAutomatic: true, automaticKey: ["mobile"]}), others);
  });
  
  it("options automaticKeyFun", function () {
    const {createdAt, updatedAt, mobile, ...others} = expected;
    assert.deepStrictEqual(attributeFields(Account, {
      filterAutomatic: true,
      automaticKey: key => key === "mobile"
    }), others);
  });
  
  it("options isInput", function () {
    const {uuid, ...others} = expected;
    assert.deepStrictEqual(attributeFields(Account, {isInput: true}), {
      ...others,
      uuid: {type: GraphQLString, description: "账户id"},
    });
  });
  
  it("options commentToDescription", function () {
    assert.deepStrictEqual(attributeFields(Account, {commentToDescription: false}), {
      ...expected,
      uuid: {type: new GraphQLNonNull(GraphQLString)},
    });
  });
  
  describe("options exclude", function () {
    it("array", function () {
      const {uuid, balance, ...others} = expected;
      assert.deepStrictEqual(attributeFields(Account, {exclude: ["uuid", "balance"]}), {
        ...others,
      });
    });
    it("function", function () {
      const {uuid, balance, ...others} = expected;
      assert.deepStrictEqual(attributeFields(Account, {exclude: key => ["uuid", "balance"].includes(key)}), {
        ...others
      });
    });
  });
  describe("options only", function () {
    it("array", function () {
      const {uuid, balance, ...others} = expected;
      assert.deepStrictEqual(attributeFields(Account, {only: ["uuid", "balance"]}), {
        uuid, balance
      });
    });
    it("function", function () {
      const {uuid, balance, ...others} = expected;
      assert.deepStrictEqual(attributeFields(Account, {only: key => ["uuid", "balance"].includes(key)}), {
        uuid, balance
      });
    });
  });
});
