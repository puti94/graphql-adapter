import {GraphQLResolveInfo} from "graphql";
import _ from "lodash";
import map2FindOptions from "./map2FindOptions";
import assert from "assert";
import {
    ModelType,
    Association,
    FindOptions,
    WhereOptions,
    ModelCtor,
    HasMany,
    Model,
    HasOne,
    BelongsTo,
    BelongsToMany
} from "sequelize";

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

function checkIsModel(target: TargetType) {
    return !!(target as ModelType).getTableName;
}

function checkIsAssociation(target: TargetType) {
    return !!(target as Association).associationType;
}

type ResolverOptions = {
    before?: (options: FindOptions, args: any, context: any, info: any) => FindOptions | Promise<FindOptions>;
    resolve: (options: FindOptions, source: any, args: any, context: any, info: any) => any;
    isCountType?: boolean;
}
type FunctionModelType = (source: any, args: any, context: any, info: any) => ModelType;
type TargetType = ModelType | Association | FunctionModelType;
export type AssociationType = HasOne | HasMany | BelongsToMany | BelongsTo

export default function resolver<M extends Model, TSource, TArgs, TContext>(targetMaybeThunk: TargetType, options: ResolverOptions) {
    assert(
        _.isFunction(targetMaybeThunk) || checkIsModel(targetMaybeThunk) || checkIsAssociation(targetMaybeThunk),
        "resolverFactory should be called with a model, an association or a function (which resolves to a model or an association)"
    );

    return async function (source: any, args: any, context: any, info: GraphQLResolveInfo) {
        const {before = (options: any) => options, resolve} = options;
        const target = _.isFunction(targetMaybeThunk) && !checkIsModel(targetMaybeThunk) ?
            await (targetMaybeThunk as FunctionModelType)(source, args, context, info) : targetMaybeThunk;
        const isModel = checkIsModel(target);
        const isAssociation = checkIsAssociation(target);
        const model: ModelCtor<M> = (isAssociation && (target as AssociationType).target || isModel && target) as ModelCtor<M>;

        let findOptions = map2FindOptions(model, args, info, options.isCountType);

        context = context || {};
        findOptions = await Promise.resolve(before(findOptions, args, context, info));

        if (args.where && !_.isEmpty(info.variableValues)) {
            whereQueryVarsToValues(args.where, info.variableValues);
            whereQueryVarsToValues(findOptions.where, info.variableValues);
        }

        return resolve(findOptions, source, args, context, info);
    };
}

