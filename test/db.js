const {Sequelize, Op} = require("sequelize");
const getModels = require("./models");
const _ = require("lodash");
const sequelize = new Sequelize("mysql://test:123456@localhost:3306/testdb");
const models = getModels(sequelize);
module.exports = {
  sequelize,
  models
};

models.Project.findAll({
  attributes: [[sequelize.fn("MID", sequelize.col("user.name"), 2, 1), "hhh"]],
  group: ["hhh"],
  raw: true,
  include: [{model: models.User, as: "user", attributes: []}]
}).then(console.log);
