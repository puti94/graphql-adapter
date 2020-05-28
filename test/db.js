const {Sequelize, Op} = require("sequelize");
const getModels = require("./models");

const sequelize = new Sequelize("mysql://test:123456@localhost:3306/testdb");
const models = getModels(sequelize);
module.exports = {
  sequelize,
  models
};

// sequelize.sync({force:true})
models.Account("age", {group: "name"}).then(res => console.log("结果", res))
