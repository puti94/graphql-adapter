const path = require("path");
module.exports = function getModels(sequelize) {
  const models = {
    Account: sequelize.import(path.join(__dirname, "./account")),
    Project: sequelize.import(path.join(__dirname, "./project")),
    Task: sequelize.import(path.join(__dirname, "./task")),
    // UserTask: sequelize.import(path.join(__dirname, "./user-task")),
    User: sequelize.import(path.join(__dirname, "./user"))
  };
  
  Object.keys(models).forEach(function (modelName) {
    if (models[modelName].associate) {
      models[modelName].associate(models);
    }
  });
  return models;
};
