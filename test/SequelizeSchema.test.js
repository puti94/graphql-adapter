require("mocha");
const {sequelize, models} = require("./db");
const {graphql} = require("graphql");
const uuid = require("uuid");

const {generateSchema} = require("../dist");
const assert = require("assert");
const _ = require("lodash");

const {User} = models;

describe("#SequelizeSchema", function () {
  const schema = generateSchema(models, {includeSubscription: false});
  before(async function () {
    await sequelize.sync({force: true});
  });
  
  describe("#query and mutation", function () {
    const id = uuid.v1();
    it("添加单个数据", async function () {
      const response = await graphql(schema, `mutation{ Account{create(data:{age:18,uuid:"${id}"}){age,uuid}} }`);
      const expected = {data: {Account: {create: {age: 18, uuid: id}}}};
      assert.deepStrictEqual(_.cloneDeep(response), expected);
    });
    
    it("查询单个数据", async function () {
      const response = await graphql(schema, "{Account{ one{uuid,age} }}");
      const expected = {data: {Account: {one: {uuid: id, age: 18}}}};
      assert.deepStrictEqual(_.cloneDeep(response), expected);
    });
    
    it("查询列表", async function () {
      const response = await graphql(schema, "{Account{ list{uuid,age}}}");
      const expected = {data: {Account: {list: [{uuid: id, age: 18}]}}};
      assert.deepStrictEqual(_.cloneDeep(response), expected);
    });
    
    it("更新单个数据", async function () {
      const response = await graphql(schema, `mutation{Account{ update(data:{age:20},uuid:"${id}"){age}}}`);
      const expected = {
        data: {
          Account: {
            update: {
              age: 20
            }
          }
        }
      };
      assert.deepStrictEqual(_.cloneDeep(response), expected);
    });
    
    it("删除单个数据", async function () {
      const response = await graphql(schema, `mutation{ Account{remove(uuid:"${id}")}}`);
      const expected = {data: {Account: {remove: true}}};
      assert.deepStrictEqual(_.cloneDeep(response), expected);
      assert.deepStrictEqual(_.cloneDeep(await graphql(schema, `{Account{ one(uuid:"${id}"){age} }}`)), {
        data: {
          Account: {one: null}
        }
      });
    });
    
  });
  
  describe("#一对多关联表测试", function () {
    let userA, userB, userC;
    let projectA, projectB, projectC;
    before(async function () {
      userA = await User.create({name: "U-A"});
      userB = await User.create({name: "U-B"});
      userC = await User.create({name: "U-C"});
      
      projectA = await userA.createProject({title: "P-A"});
      projectB = await userA.createProject({title: "P-B"});
      projectC = await userB.createProject({title: "P-C"});
      
    });
    
    
    describe("关联查询", function () {
      it("查询用户A下是否有项目A,B", async function () {
        const response = await graphql(schema, `{ User{one(id:${userA.id}){name,projects{title,ownerId}} }}`);
        const expected = {
          data: {
            User: {
              one: {
                name: "U-A",
                projects: [{title: "P-A", ownerId: userA.id}, {title: "P-B", ownerId: userA.id}]
              }
            }
          }
        };
        assert.deepStrictEqual(_.cloneDeep(response), expected);
      });
      it("查询项目C下拥有用户是不是B", async function () {
        const response = await graphql(schema, `{Project{ one(id:${projectC.id}){title,user{name,id}} }}`);
        const expected = {
          data: {
            Project: {
              one: {
                title: "P-C",
                user: {name: "U-B", id: userB.id}
              }
            }
          }
        };
        assert.deepStrictEqual(_.cloneDeep(response), expected);
      });
    });
    
    describe("关联创建", function () {
      it("创建一个拥有两个项目的用户D", async function () {
        const response = await graphql(schema, "mutation{User{create(data:{name:\"U-D\",projects:[{title:\"P-D\"},{title:\"P-F\"}]}){name,projects{title}}}}");
        const expected = {
          data: {
            User: {
              create: {
                name: "U-D",
                projects: [{title: "P-D"}, {title: "P-F"}]
              }
            }
          }
        };
        assert.deepStrictEqual(_.cloneDeep(response), expected);
      });
      it("创建项目G并且添加用户E", async function () {
        const response = await graphql(schema, "mutation{ Project{create(data:{title:\"P-G\",user:{name:\"U-E\"}}){title,user{name}}}}");
        const expected = {
          data: {
            Project: {
              create: {
                title: "P-G",
                user: {name: "U-E"}
              }
            }
          }
        };
        assert.deepStrictEqual(_.cloneDeep(response), expected);
      });
      
    });
  });
  
  describe("#多对多关联表测试", function () {
    let userA, userB, userC;
    let taskA, taskB, taskC;
    before(async function () {
      userA = await User.create({name: "U-A"});
      userB = await User.create({name: "U-B"});
      userC = await User.create({name: "U-C"});
      taskA = await userA.createTask({name: "T-A"});
      taskB = await userA.createTask({name: "T-B"});
      taskC = await userB.createTask({name: "T-C"});
      await taskC.addUser(userC);
    });
    
    
    describe("单个查询", function () {
      it("查询所有用户", async function () {
        const response = await graphql(schema, "{User{list(limit:3){name}}}");
        const expected = {data: {User: {list: [{name: "U-A"}, {name: "U-B"}, {name: "U-C"}]}}};
        assert.deepStrictEqual(_.cloneDeep(response), expected);
      });
      
      it("查询所有任务", async function () {
        const response = await graphql(schema, "{Task{ list(limit:3){name}}}");
        const expected = {data: {Task: {list: [{name: "T-A"}, {name: "T-B"}, {name: "T-C"}]}}};
        assert.deepStrictEqual(_.cloneDeep(response), expected);
      });
      
    });
    
    describe("关联查询", function () {
      it("查询用户A下是否有任务A,B", async function () {
        const response = await graphql(schema, `{ User{one(id:${userA.id}){name,tasks{name}} }}`);
        const expected = {
          data: {
            User: {
              one: {
                name: "U-A",
                tasks: [{name: "T-A"}, {name: "T-B"}]
              }
            }
          }
        };
        assert.deepStrictEqual(_.cloneDeep(response), expected);
      });
      it("查询任务C下是否包含用户B,C", async function () {
        const response = await graphql(schema, `{ Task{one(id:${taskC.id}){name,users{name}}}}`);
        const expected = {
          data: {
            Task: {
              one: {
                name: "T-C",
                users: [{name: "U-B"}, {name: "U-C"}]
              }
            }
          }
        };
        assert.deepStrictEqual(_.cloneDeep(response), expected);
      });
    });
  });
  
  after(async function () {
    await sequelize.close();
  });
});
