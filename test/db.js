const {Sequelize, Op} = require("sequelize");
const getModels = require("./models");

const sequelize = new Sequelize("mysql://test:123456@localhost:3306/testdb");
const models = getModels(sequelize);
module.exports = {
  sequelize,
  models
};

// sequelize.sync({force:true})

models.Account.sum("age", {group: "name"}).then(res => console.log("结果", res));
Sequelize.where();
models.Account.findAll({
  attributes: ["name", [sequelize.fn("count", "*"), "_count"], [Sequelize.fn("avg", Sequelize.col("age")), "age"]],
  group: ["name"],
  // having: {_count: {[Op.lte]: 1}},
  raw: true
}).then(function (result) {
  console.log(result);
});

