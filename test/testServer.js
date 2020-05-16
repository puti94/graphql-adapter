const http = require("http");
const {ApolloServer, PubSub} = require("apollo-server-express");
const express = require("express");
const {generateSchema} = require("../dist");
const {sequelize, models} = require("./db");
sequelize.sync();
const server = new ApolloServer({
  schema: generateSchema(models, {
    pubSub: new PubSub(),
    handlerFindOptions: ((action, options) => {
      console.log("action", action, options);
      return options;
    }),
    handlerAggregateOptions: ((action, options) => {
      console.log("action", action, options);
      return options;
    }),
    filterSubscription: (response) => {
      console.log("Subscription", response);
      return true;
    },
    created: {
      filter: (response) => {
        console.log("created.filter", response);
        return true;
      }
    },
    configMap: {
      User: {
        created: {
          filter: (response) => {
            console.log("User.created.filter", response);
            return true;
          }
        },
      }
    }
  }),
  tracing: true,
});
const app = express();
server.applyMiddleware({app, path: "/graphql"});
const httpServer = http.createServer(app);
server.installSubscriptionHandlers(httpServer);
const PORT = 8082;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`);
  console.log(`🚀 Subscriptions ready at ws://localhost:${PORT}${server.subscriptionsPath}`);
});
