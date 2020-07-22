/**
 * User: puti.
 * Time: 2020-05-11 16:15.
 */
const {DataTypes} = require("sequelize");
module.exports = function (sequelize) {
  const account = sequelize.define("Account", {
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
    age: DataTypes.INTEGER,
    describe: {
      type: DataTypes.JSON
    },
    active: DataTypes.BOOLEAN,
    balance: {
      type: DataTypes.DECIMAL(18, 10),
      defaultValue: 0
    }
  }, {
    scopes: {
      age18: {
        where: {
          age: 18
        }
      }
    },
    tableName: "accounts"
  });
  account.associate = function (models) {
  
  };
  return account;
};
