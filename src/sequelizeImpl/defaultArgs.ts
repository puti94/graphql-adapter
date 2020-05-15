import {toGraphQL} from "./typeMapper";
import {where, scope} from "./baseFields";
import {ModelType} from "sequelize";
import {GraphQLFieldConfigArgumentMap, GraphQLInputType} from "graphql";

export default function (model: ModelType) {
    const result: GraphQLFieldConfigArgumentMap = {}
        , keys = model.primaryKeyAttributes;
    if (keys) {
        keys.forEach(key => {
            const attribute = model.rawAttributes[key];
            if (attribute) {
                result[key] = {
                    description: attribute.comment || "主键",
                    type: (toGraphQL(attribute.type) as GraphQLInputType)
                };
            }
        });
    }
    // add where and scope
    Object.assign(result, {scope, where});
    return result;
}
