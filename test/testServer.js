const http = require("http");
const {ApolloServer, PubSub} = require("apollo-server-express");
const express = require("express");
const {generateSchema, mergeConstant} = require("../dist");
const {sequelize, models} = require("./db");
const {GraphQLBoolean, GraphQLString, GraphQLNonNull} = require("graphql");
const app = express();
const httpServer = http.createServer(app);
sequelize.sync();

mergeConstant({aggregationName: "_fn"});

const server = new ApolloServer({
  schema: generateSchema(models, {
    pubSub: new PubSub(),
    withMetadata: true,
    handlerFindOptions: ((action, options) => {
      return {
        ...options,
      };
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
    customMutation: {
      openServer: {
        type: GraphQLBoolean,
        args: {
          path: {
            type: GraphQLNonNull(GraphQLString),
            description: "路径"
          },
        },
        resolve: (source, args) => {
          const server = new ApolloServer({
            schema: generateSchema(models, {pubSub: new PubSub()}),
            subscriptions: args.path
          });
          server.applyMiddleware({app, path: args.path});
          server.installSubscriptionHandlers(httpServer);
          return true;
        }
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
  tracing: true
});

server.applyMiddleware({app, path: "/graphql"});
server.installSubscriptionHandlers(httpServer);
const PORT = 8081;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`);
  console.log(`🚀 Subscriptions ready at ws://localhost:${PORT}${server.subscriptionsPath}`);
});
