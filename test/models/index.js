
module.exports = function getModels(sequelize) {
  const models = {
    Account: require("./account")(sequelize),
    Project: require("./project")(sequelize),
    Task: require("./task")(sequelize),
    User: require("./user")(sequelize)
  };
  
  Object.keys(models).forEach(function (modelName) {
    if (models[modelName].associate) {
      models[modelName].associate(models);
    }
  });
  return models;
};
