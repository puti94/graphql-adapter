import argsToFindOptions from "./argsToFindOptions";
import argsToOtherOptions from "./argsToOtherOptions";
import {FindOptions, ModelType} from "sequelize";
import {GraphQLResolveInfo} from "graphql";
import {IInfoField, infoParser} from "../infoParse";
import _ from "lodash";
import {Includeable, ProjectionAlias} from "sequelize/types/lib/model";
import CONS from "../constant";
import {SequelizeAdapter} from "../SequelizeAdapter";
import {AuthorityError} from "../error";

function getRealFields(info: GraphQLResolveInfo): IInfoField[] {
    const parse = infoParser(info);
    return parse.fields;
}

export default function map2FindOptions(adapter: SequelizeAdapter<any, any, any>, args: {
    [key: string]: any;
}, info: GraphQLResolveInfo | IInfoField[]): {
    options: FindOptions;
    includeFields: string[];
} {
    const includeFields = new Set<string>();

    function _map2FindOptions(model: ModelType, args: {
        [key: string]: any;
    }, info: GraphQLResolveInfo | IInfoField[]): FindOptions {

        const result = argsToFindOptions(args, adapter);
        const options = result.options;
        const fields = _.uniqWith(_.isArray(info) ? info : getRealFields(info), _.isEqual);
        //关联字段
        const associationFields = fields?.filter(t => !_.isEmpty(t.fields) && !_.isEmpty(model.associations[t.name]));
        //自身字段
        const attributeFields = fields?.filter(t => model.rawAttributes[t.name]);
        //聚合函数字段
        const aggregateFields = fields?.filter(t => t.name === CONS.aggregationName);
        //子级关联字段
        const subFields = fields?.filter(t => t.name === CONS.colName);

        const includeFieldNames = !fields ? null : attributeFields.map(t => t.name);


        if (!_.isEmpty(associationFields)) {
            // @ts-ignore
            options.include = associationFields
                .map(field => {
                    const association = model.associations[field.name];
                    return {
                        model: association.target,
                        as: field.name,
                        ..._map2FindOptions(association.target, field.args, field.fields)
                    };
                });
        }
        if (_.isEmpty(options.attributes) && !_.isEmpty(includeFieldNames)) {
            includeFieldNames.forEach(t => includeFields.add(`${model.name}.${t}`));
            options.attributes = includeFieldNames;
        }

        options.attributes = options.attributes || [];

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
                const otherOptions = argsToOtherOptions({fn, args}, adapter);
                otherOptions.includeFields.forEach(name => includeFields.add(name));
                concatAssociations(otherOptions.associationFields);
                return [otherOptions.options[0], as || `_${fn}`] as ProjectionAlias;
            });
            options.attributes = (options.attributes as (string | ProjectionAlias)[]).concat(items);
        }

        if (!_.isEmpty(subFields)) {
            const items = subFields.map(info => {
                const {name, as} = info.args;
                const otherOptions = argsToOtherOptions(name, adapter);
                otherOptions.includeFields.forEach(name => includeFields.add(name));
                concatAssociations(otherOptions.associationFields);
                if (typeof otherOptions.options[0] === "string") {
                    throw new AuthorityError(`not ${name} field`);
                }
                return [otherOptions.options[0], as || `_${name}`];
            });
            // @ts-ignore
            options.attributes = (options.attributes as (string | ProjectionAlias)[]).concat(items);
        }

        return options;
    }

    const options = _map2FindOptions(adapter.model, args, info);
    return {
        options,
        includeFields: Array.from(includeFields)
    };
}
