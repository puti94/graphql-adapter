import argsToFindOptions from "./argsToFindOptions";
import argsToOtherOptions from "./argsToOtherOptions";
import {FindOptions, ModelType} from "sequelize";
import {GraphQLResolveInfo} from "graphql";
import {IInfoField, infoParser} from "../infoParse";
import _ from "lodash";
import {Includeable, ProjectionAlias} from "sequelize/types/lib/model";
import CONS from "../constant";

function getRealFields(info: GraphQLResolveInfo): IInfoField[] {
    const parse = infoParser(info);
    return parse.fields;
}

export default function map2FindOptions(model: ModelType, args: {
    [key: string]: any;
}, info: GraphQLResolveInfo | IInfoField[]): FindOptions {

    const result = argsToFindOptions(args, model);
    const options = result.options;
    const fields = _.isArray(info) ? info : getRealFields(info);
    //关联字段
    const associationFields = fields?.filter(t => !_.isEmpty(t.fields) && !_.isEmpty(model.associations[t.name]));
    //自身字段
    const attributeFields = fields?.filter(t => model.rawAttributes[t.name]);
    //聚合函数字段
    const aggregateFields = fields?.filter(t => t.name === CONS.aggregationName);
    //子级关联字段
    const subFields = fields?.filter(t => t.name === CONS.colName);

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
        options.include = associationFields
            .map(field => {
                const association = model.associations[field.name];
                return {
                    model: association.target,
                    as: field.name,
                    ...map2FindOptions(association.target, field.args, field.fields)
                };
            });
    }
    if (_.isEmpty(options.attributes) && !_.isEmpty(includeFieldNames)) {
        options.attributes = includeFieldNames;
    }

    function concatAssociations(fields: string[]) {
        fields.forEach(modelName => {
            if (_.isEmpty(_.find(options.include as [], {as: modelName}))) {
                if (!options.include) options.include = [];
                (options.include as Includeable[]).push({
                    model: model.associations[modelName].target,
                    as: modelName,
                    attributes: []
                });
            }
        });
    }

    concatAssociations(result.associationFields);

    if (!_.isEmpty(aggregateFields)) {
        const items = aggregateFields.map<ProjectionAlias>(info => {
            const {fn, as, args} = info.args;
            const otherOptions = argsToOtherOptions({fn, args}, model);
            concatAssociations(otherOptions.associationFields);
            return [otherOptions.options[0], as || `_${fn}`] as ProjectionAlias;
        });
        options.attributes = (options.attributes as (string | ProjectionAlias)[] || []).concat(items);
    }

    if (!_.isEmpty(subFields)) {
        const items = subFields.map(info => {
            const {name, as} = info.args;
            const otherOptions = argsToOtherOptions(name, model);
            concatAssociations(otherOptions.associationFields);
            return [otherOptions.options[0], as || `_${name}`];
        });
        // @ts-ignore
        options.attributes = (options.attributes as (string | ProjectionAlias)[] || []).concat(items);
    }

    return options;
}

type AggregationOptions = {
    fn: string;
    args?: AggregationArgs;
}

type AggregationArgs = Array<AggregationOptions | string | number> | AggregationOptions | string | number





