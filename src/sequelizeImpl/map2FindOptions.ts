import argsToFindOptions from "./argsToFindOptions";
import {FindOptions, ModelType, Sequelize} from "sequelize";
import {GraphQLResolveInfo} from "graphql";
import {IInfoField, infoParser} from "../infoParse";
import _ from "lodash";
import {ProjectionAlias} from "sequelize/types/lib/model";

function getRealFields(info: GraphQLResolveInfo): IInfoField[] {
    const parse = infoParser(info);
    return parse.fields;
}

export default function map2FindOptions(model: ModelType, args: {
    [key: string]: any;
}, info: GraphQLResolveInfo | IInfoField[]): FindOptions {
    const attributes = Object.keys(model.rawAttributes);
    const result: FindOptions = argsToFindOptions(args, attributes);
    const fields = _.isArray(info) ? info : getRealFields(info);
    const associationFields = fields?.filter(t => !_.isEmpty(t.fields) && !_.isEmpty(model.associations[t.name]));
    const attributeFields = fields?.filter(t => attributes.includes(t.name));
    const aggregateFields = fields?.filter(t => t.name.startsWith("_aggregation"));

    const includeFieldNames = !fields ? null : _.uniq([...attributeFields.map(t => t.name), ...associationFields.map(t => {
        const association = model.associations[t.name];
        if (association.associationType === "BelongsTo") {
            // @ts-ignore
            return association.targetKey;
        }
        // @ts-ignore
        return association.sourceKey;
    })]);
    if (!_.isEmpty(associationFields)) {
        // @ts-ignore
        result.include = associationFields
            .map(field => {
                const association = model.associations[field.name];
                return {
                    model: association.target,
                    as: field.name,
                    ...map2FindOptions(association.target, field.args, field.fields)
                };
            });
    }
    if (_.isEmpty(result.attributes) && !_.isEmpty(includeFieldNames)) {
        result.attributes = includeFieldNames;
    }
    if (!_.isEmpty(aggregateFields)) {
        const items = aggregateFields.map<ProjectionAlias>(info => {
            const {fn, field, alias, args} = info.args;
            const argList = _.isUndefined(args) ? [] : (_.isArray(args) ? args : [args]);
            return [Sequelize.fn(fn, Sequelize.col(field), ...argList), alias || `_${fn}_${field}`];
        });
        result.attributes = (result.attributes as (string | ProjectionAlias)[] || []).concat(items);
    }
    return result;
}
