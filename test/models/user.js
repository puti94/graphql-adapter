

/**
 * User: puti.
 * Time: 2020-05-11 16:15.
 */
module.exports = function (sequelize, DataTypes) {
  const user = sequelize.define("User", {
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
    tableName: "user"
  });
  user.associate = function (models) {
    user.hasMany(models.Project,{
      sourceKey: "id",
      foreignKey: "ownerId",
      as: "projects" // this determines the name in `associations`!
    });
    user.belongsToMany(models.Task, {through: "UserTask", as: "tasks"});
  };
  
  return user;
};
