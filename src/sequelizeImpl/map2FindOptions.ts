import argsToFindOptions from "./argsToFindOptions";
import {FindOptions, ModelType} from "sequelize";
import {GraphQLResolveInfo} from "graphql";
import {IInfoField, infoParser} from "../infoParse";
import _ from "lodash";

function getRealFields(info: GraphQLResolveInfo, isCountType?: boolean): IInfoField[] {
    const parse = infoParser(info);
    if (isCountType) {
        return parse.fields.find(({name}) => name === "rows")?.fields || [];
    }
    return parse.fields;
}

export default function map2FindOptions(model: ModelType, args: {
    [key: string]: any;
}, info: GraphQLResolveInfo | IInfoField[], isCountType?: boolean): FindOptions {
    const attributes = Object.keys(model.rawAttributes);
    const result: FindOptions = argsToFindOptions(args, attributes);
    const fields = _.isArray(info) ? info : getRealFields(info, isCountType);
    const associationFields = fields?.filter(t => !_.isEmpty(t.fields) && !_.isEmpty(model.associations[t.name]));
    const attributeFields = fields?.filter(t => attributes.includes(t.name));

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
        result.include = associationFields
            .map(field => {
                const association = model.associations[field.name];
                return {
                    model: association.target,
                    separate: false,
                    as: field.name,
                    ...map2FindOptions(association.target, field.args, field.fields)
                };
            });
    }
    if (_.isEmpty(result.attributes) && !_.isEmpty(includeFieldNames)) {
        result.attributes = includeFieldNames;
    }
    return result;
}
