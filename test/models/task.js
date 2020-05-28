
/**
 * User: puti.
 * Time: 2020-05-11 16:15.
 */
module.exports = function (sequelize, DataTypes) {
  const task = sequelize.define("Task", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    tableName: "task"
  });
  task.associate = function (models) {
    task.belongsToMany(models.User, {through: "UserTask", as: "users"});
  };
  
  return task;
};
