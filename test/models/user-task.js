/**
 * User: puti.
 * Time: 2020-05-11 16:15.
 */
const {DataTypes} = require("sequelize");
module.exports = function (sequelize) {
  const user = sequelize.define("UserTask", {
    // UserId: {
    //   type: DataTypes.INTEGER,
    //   references: {
    //     model: "User", // 'Movies' 也可以使用
    //     key: "id"
    //   }
    // },
    // TaskId: {
    //   type: DataTypes.INTEGER,
    //   references: {
    //     model: "Task", // 'Actors' 也可以使用
    //     key: "id"
    //   }
    // }
  }, {
    tableName: "UserTask"
  });
  user.associate = function (models) {
  };
  
  return user;
};
