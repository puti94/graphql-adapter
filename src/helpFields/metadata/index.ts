import {GraphQLEnumType, GraphQLFieldConfigMap, GraphQLList, GraphQLNonNull} from "graphql";
import {getMetaData, getMetaDataList, MetaDataType} from "./metadata";
import {AdapterMaps} from "../../utils";
import {ModelCtor} from "sequelize";
import {JSONType} from "../../sequelizeImpl/types";
import * as Utils from "@puti94/gql-utils";

/**
 *
 * @param adapters
 */
export default function <T extends { [key: string]: ModelCtor<any> }>(adapters: AdapterMaps<T>): GraphQLFieldConfigMap<any, any> {
    return {
        _metadataList: {
            type: new GraphQLList(MetaDataType),
            description: "获取源数据列表",
            resolve: () => {
                return getMetaDataList(adapters);
            }
        },
        _metadataMap: {
            type: JSONType,
            description: "基本数据，以类型名为键值",
            resolve: () => {
                return Utils.tableList2Map(getMetaDataList(adapters));
            }
        },
        _typeNameMap: {
            type: JSONType,
            description: "获取类型名对应table名",
            resolve: () => {
                return Utils.tableList2TypeNameMap(getMetaDataList(adapters));
            }
        },
        _metadata: {
            type: MetaDataType,
            description: "获取单个表格源数据",
            args: {
                name: {
                    type: new GraphQLNonNull(new GraphQLEnumType({
                        name: "GqlAdapterEnum",
                        values: Object.keys(adapters).reduce<any>((memo, key) => {
                            const name = adapters[key].name;
                            memo[name] = {value: key};
                            return memo;
                        }, {})
                    })),
                    description: "模型"
                }
            },
            resolve: (source: any, {name}: { name: string }) => {
                return getMetaData(adapters[name]);
            }
        },
    };
}
