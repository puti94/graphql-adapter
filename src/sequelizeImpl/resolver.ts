import {GraphQLResolveInfo} from "graphql";
import _ from "lodash";
import map2FindOptions from "./map2FindOptions";
import {
    FindOptions,
    WhereOptions,
    HasMany,
    Model,
    HasOne,
    BelongsTo,
    BelongsToMany
} from "sequelize";
import {SequelizeAdapter} from "../SequelizeAdapter";

function whereQueryVarsToValues(o: WhereOptions, vals: any) {
    [
        ...Object.getOwnPropertyNames(o),
        ...Object.getOwnPropertySymbols(o)
    ].forEach(k => {
        // @ts-ignore
        if (_.isFunction(o[k])) {
            // @ts-ignore
            o[k] = o[k](vals);
            return;
        }
        // @ts-ignore
        if (_.isObject(o[k])) {
            // @ts-ignore
            whereQueryVarsToValues(o[k], vals);
        }
    });
}

type ResolverOptions<M> = {
    before?: (options: FindOptions, includeFields: string[], args: any, context: any, info: any) => FindOptions | Promise<FindOptions>;
    resolve: (options: FindOptions, source: any, args: any, context: any, info: any) => any;
}
export type AssociationType = HasOne | HasMany | BelongsToMany | BelongsTo

export default function resolver<M extends Model, TSource, TContext, TArgs>(adapter: SequelizeAdapter<any, any, any>, options: ResolverOptions<M>) {
    return async function (source: any, args: any, context: any, info: GraphQLResolveInfo) {
        const {before = (options: any) => options, resolve} = options;
        const mapOptions = map2FindOptions(adapter, args, info);
        context = context || {};
        mapOptions.options = await Promise.resolve(before(mapOptions.options, mapOptions.includeFields, args, context, info));
        if (args.where && !_.isEmpty(info.variableValues)) {
            whereQueryVarsToValues(args.where, info.variableValues);
            whereQueryVarsToValues(mapOptions.options.where, info.variableValues);
        }

        return resolve(mapOptions.options, source, args, context, info);
    };
}

