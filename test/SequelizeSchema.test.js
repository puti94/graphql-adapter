require("mocha");
const {sequelize, models} = require("./db");
const {graphql} = require("graphql");
const uuid = require("uuid");

const {generateSchema} = require("../dist");
const assert = require("assert");
const _ = require("lodash");

const {User} = models;

describe("#SequelizeSchema", function () {
  const schema = generateSchema(models);
  before(async function () {
    await sequelize.sync({force: true});
  });
  
  describe("#query and mutation", function () {
    const id = uuid.v1();
    it("添加单个数据", async function () {
      const response = await graphql(schema, `mutation{ createAccount(data:{age:18,uuid:"${id}"}){age,uuid} }`);
      const expected = {data: {createAccount: {age: 18, uuid: id}}};
      assert.deepStrictEqual(_.cloneDeep(response), expected);
    });
    
    it("查询单个数据", async function () {
      const response = await graphql(schema, "{ getAccount{uuid,age} }");
      const expected = {data: {getAccount: {uuid: id, age: 18}}};
      assert.deepStrictEqual(_.cloneDeep(response), expected);
    });
    
    it("查询列表", async function () {
      const response = await graphql(schema, "{ getAccountList{uuid,age} }");
      const expected = {data: {getAccountList: [{uuid: id, age: 18}]}};
      assert.deepStrictEqual(_.cloneDeep(response), expected);
    });
    
    it("查询列表带数量", async function () {
      const response = await graphql(schema, "{ getAccountListPage{count,rows{uuid,age}} }");
      const expected = {data: {getAccountListPage: {count: 1, rows: [{uuid: id, age: 18}]}}};
      assert.deepStrictEqual(_.cloneDeep(response), expected);
    });
    
    it("更新单个数据", async function () {
      const response = await graphql(schema, `mutation{ updateAccount(data:{age:20},uuid:"${id}"){age}}`);
      const expected = {
        data: {
          updateAccount: {
            age: 20
          }
        }
      };
      assert.deepStrictEqual(_.cloneDeep(response), expected);
    });
    
    it("删除单个数据", async function () {
      const response = await graphql(schema, `mutation{ removeAccount(uuid:"${id}")}`);
      const expected = {data: {removeAccount: true}};
      assert.deepStrictEqual(_.cloneDeep(response), expected);
      assert.deepStrictEqual(_.cloneDeep(await graphql(schema, `{ getAccount(uuid:"${id}"){age} }`)), {
        data: {
          getAccount: null
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
        const response = await graphql(schema, `{ getUser(id:${userA.id}){name,projects{title,ownerId}} }`);
        const expected = {
          data: {
            getUser: {
              name: "U-A",
              projects: [{title: "P-A", ownerId: userA.id}, {title: "P-B", ownerId: userA.id}]
            }
          }
        };
        assert.deepStrictEqual(_.cloneDeep(response), expected);
      });
      it("查询项目C下拥有用户是不是B", async function () {
        const response = await graphql(schema, `{ getProject(id:${projectC.id}){title,user{name,id} }}`);
        const expected = {
          data: {
            getProject: {
              title: "P-C",
              user: {name: "U-B", id: userB.id}
            }
          }
        };
        assert.deepStrictEqual(_.cloneDeep(response), expected);
      });
    });
    
    describe("关联创建", function () {
      it("创建一个拥有两个项目的用户D", async function () {
        const response = await graphql(schema, "mutation{createUser(data:{name:\"U-D\",projects:[{title:\"P-D\"},{title:\"P-F\"}]}){name,projects{title}} }");
        const expected = {
          data: {
            createUser: {
              name: "U-D",
              projects: [{title: "P-D"}, {title: "P-F"}]
            }
          }
        };
        assert.deepStrictEqual(_.cloneDeep(response), expected);
      });
      it("创建项目G并且添加用户E", async function () {
        const response = await graphql(schema, "mutation{ createProject(data:{title:\"P-G\",user:{name:\"U-E\"}}){title,user{name} }}");
        const expected = {
          data: {
            createProject: {
              title: "P-G",
              user: {name: "U-E"}
            }
          }
        };
        assert.deepStrictEqual(_.cloneDeep(response), expected);
      });
      
      it("创建用户H添加项目P并且更新", async function () {
        const userH = await User.create({name: "U-H", projects: [{title: "P-P"}]}, {include: "projects"});
        const response = await graphql(schema, `mutation{ updateUser(data:{name:"U-H-1",projects:[{title:"P-P-1",id:${userH.projects[0].id}}]})},id:${userH.id}){name,id,projects{title,id} }}`);
        const expected = {
          data: {
            updateUser: {
              name: "U-H-1",
              id: userH.id,
              projects: [{id: userH.projects[0].id, title: "P-P-1"}]
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
        const response = await graphql(schema, "{ getUserList(limit:3){name} }");
        const expected = {data: {getUserList: [{name: "U-A"}, {name: "U-B"}, {name: "U-C"}]}};
        assert.deepStrictEqual(_.cloneDeep(response), expected);
      });
      
      it("查询所有任务", async function () {
        const response = await graphql(schema, "{ getTaskList(limit:3){name} }");
        const expected = {data: {getTaskList: [{name: "T-A"}, {name: "T-B"}, {name: "T-C"}]}};
        assert.deepStrictEqual(_.cloneDeep(response), expected);
      });
      
    });
    
    describe("关联查询", function () {
      it("查询用户A下是否有任务A,B", async function () {
        const response = await graphql(schema, `{ getUser(id:${userA.id}){name,tasks{name}} }`);
        const expected = {
          data: {
            getUser: {
              name: "U-A",
              tasks: [{name: "T-A"}, {name: "T-B"}]
            }
          }
        };
        assert.deepStrictEqual(_.cloneDeep(response), expected);
      });
      it("查询任务C下是否包含用户B,C", async function () {
        const response = await graphql(schema, `{ getTask(id:${taskC.id}){name,users{name} }}`);
        const expected = {
          data: {
            getTask: {
              name: "T-C",
              users: [{name: "U-B"}, {name: "U-C"}]
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
