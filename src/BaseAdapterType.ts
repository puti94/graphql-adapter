import {
    GraphQLObjectType,
    GraphQLInputObjectType,
    GraphQLResolveInfo,
    GraphQLFieldResolver,
    GraphQLFieldConfigMap,
    GraphQLFieldConfigArgumentMap,
    Thunk, GraphQLInputObjectTypeConfig, GraphQLOutputType, FieldDefinitionNode
} from "graphql";

import {PubSub} from "graphql-subscriptions";
import Maybe from "graphql/tsutils/Maybe";

export enum Query {
    GET = "get",
    LIST = "list",
    LIST_PAGE = "listPage",
    AGGREGATION = "aggregation",
}

export enum Mutation {
    CREATE = "create",
    UPDATE = "update",
    REMOVE = "remove",
}

export enum Subscription {
    CREATED = "created",
    UPDATED = "updated",
    REMOVED = "removed",
}

export interface BaseHook<M, TSource, TArgs, TContext> {
    before?(source: TSource, args: TArgs, context: TContext, info: GraphQLResolveInfo): MaybePromise<TArgs>;

    after?(response: M, source: TSource, args: TArgs, context: TContext, info: GraphQLResolveInfo): MaybePromise<M>;
}

export type MaybePromise<T> = T | null | Promise<T | null>

export type Resolver<TSource, TContext, TArgs> = (resolve: GraphQLFieldResolver<TSource, TContext, TArgs>) => GraphQLFieldResolver<TSource, TContext, TArgs>

type GraphQLFieldConfigOptions<TSource, TContext, TArgs> = {
    description?: Maybe<string>;
    type?: GraphQLOutputType;
    args?: GraphQLFieldConfigArgumentMap;
    resolve?: GraphQLFieldResolver<TSource, TContext, TArgs>;
    subscribe?: GraphQLFieldResolver<TSource, TContext, TArgs>;
    deprecationReason?: Maybe<string>;
    extensions?: Maybe<Readonly<Record<string, any>>>;
    astNode?: Maybe<FieldDefinitionNode>;
}

export type BaseFieldConfig<M, TSource, TArgs, TContext> =
    GraphQLFieldConfigOptions<TSource, TContext, TArgs> &
    BaseHook<M, TSource, TArgs, TContext> &
    { name?: string }

export type PageType<M> = { count: number; rows: M[] }

export interface BaseQuery<M, TSource, TArgs, TContext> {
    getOne?: BaseFieldConfig<M, TSource, TArgs, TContext>;
    getList?: BaseFieldConfig<M[], TSource, TArgs, TContext>;
    getListPage?: BaseFieldConfig<PageType<M>, TSource, TArgs, TContext>;
    getAggregation?: BaseFieldConfig<number, TSource, TArgs, TContext>;
}

export interface BaseMutation<M, TSource, TArgs, TContext> {
    create?: BaseFieldConfig<M, TSource, TArgs, TContext>;
    update?: BaseFieldConfig<M, TSource, TArgs, TContext>;
    remove?: BaseFieldConfig<boolean, TSource, TArgs, TContext>;

}

export type FilterFn<M, TArgs, TContext> = (tag: string, rootValue: M, args: TArgs, context?: TContext, info?: any) => boolean | Promise<boolean>
export type BaseSubscriptionConfig<M, TSource, TArgs, TContext> = GraphQLFieldConfigOptions<TSource, TContext, TArgs>
    & {
    filter?: FilterFn<M, TArgs, TContext>;
    name?: string;
}

export interface BaseSubscription<M, TSource, TArgs, TContext> {
    created?: BaseSubscriptionConfig<M, TSource, TArgs, TContext>;
    updated?: BaseSubscriptionConfig<M, TSource, TArgs, TContext>;
    removed?: BaseSubscriptionConfig<M, TSource, TArgs, TContext>;
}

export interface BaseTypeConfig<TSource, TContext> {
    modelFields?: Thunk<GraphQLFieldConfigMap<TSource, TContext>>;
}

export interface BaseType<TSource, TContext> {
    modelType: GraphQLObjectType<TSource, TContext>;
    pageType: GraphQLObjectType<TSource, TContext>;
}

export interface BaseInputType {
    createType: GraphQLInputObjectType;
    updateType: GraphQLInputObjectType;
}

export interface BaseInputTypeConfig {
    createTypeConfig?: GraphQLInputObjectTypeConfig;
    updateTypeConfig?: GraphQLInputObjectTypeConfig;
}

export type FilterActions<T> = T[] | ((key: T) => boolean);

export interface CommonConfig {
    includeQuery?: boolean | FilterActions<Query>;
    includeMutation?: boolean | FilterActions<Mutation>;
    includeSubscription?: boolean | FilterActions<Subscription>;
    excludeQuery?: FilterActions<Query>;
    excludeMutation?: FilterActions<Mutation>;
    excludeSubscription?: FilterActions<Subscription>;
}

export interface BaseFieldsConfig<TSource, TContext> {
    associationsFields?: Thunk<GraphQLFieldConfigMap<TSource, TContext>>;
    associationsCreateFields?: Thunk<GraphQLFieldConfigArgumentMap>;
    associationsUpdateFields?: Thunk<GraphQLFieldConfigArgumentMap>;
}

export type BaseConfig<M, TSource, TArgs, TContext> =
    CommonConfig &
    BaseQuery<M, TSource, TArgs, TContext> &
    BaseMutation<M, TSource, TArgs, TContext> &
    BaseSubscription<M, TSource, TArgs, TContext> &
    BaseInputTypeConfig &
    BaseTypeConfig<TSource, TContext> &
    BaseFieldsConfig<TSource, TContext> &
    BaseHook<M, TSource, TArgs, TContext> &
    {
        name?: Thunk<string>;
        primaryKey?: GraphQLFieldConfigArgumentMap;
        description?: Thunk<string>;
        pubSub?: PubSub;
    }

export interface BaseAdapterInterface<M, TSource, TContext extends Record<string, any>, TArgs> extends BaseQuery<M, TSource, TArgs, TContext>,
    BaseMutation<M, TSource, TArgs, TContext>,
    BaseSubscription<M, TSource, TArgs, TContext>,
    BaseType<TSource, TContext>,
    BaseInputType,
    BaseFieldsConfig<TSource, TContext> {
    queryFields: GraphQLFieldConfigMap<TSource, TContext>;
    mutationFields: GraphQLFieldConfigMap<TSource, TContext>;
    subscriptionFields: GraphQLFieldConfigMap<TSource, TContext>;
}
