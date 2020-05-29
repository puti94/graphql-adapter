const {Sequelize, Op} = require("sequelize");
const getModels = require("./models");
const _ = require("lodash");
const sequelize = new Sequelize("mysql://test:123456@localhost:3306/testdb");
const models = getModels(sequelize);
module.exports = {
  sequelize,
  models
};
