/**
 * User: puti.
 * Time: 2020-05-11 16:15.
 */
module.exports = function (sequelize, DataTypes) {
  const project = sequelize.define("Project", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    over: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: "Project",
    comment: "项目"
  });
  project.associate = function (models) {
    project.belongsTo(models.User, {foreignKey: "ownerId", as: "user"});
  };
  
  return project;
};
