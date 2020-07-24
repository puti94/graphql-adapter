import {
    GraphQLBoolean,
    GraphQLFloat, GraphQLInt,
    GraphQLList,
    GraphQLNonNull,
    GraphQLObjectType,
    GraphQLString,
    isEqualType,
    getNamedType,
    isNullableType,
    isListType, GraphQLInputObjectType
} from "graphql";
import * as _ from "lodash";
import {AbstractDataType} from "sequelize";
import {SequelizeAdapter} from "../../SequelizeAdapter";
import {DateType, JSONType} from "../../sequelizeImpl/types";
import CONS from "../../constant";
import {ModelValidateOptions} from "sequelize/types/lib/model";


type FieldMetaData = {
    type: string;
    dataType: string;
    name: string;
    description: string;
    title: string;
    allowNull: boolean;
    isPk: boolean;
    isList: boolean;
    editable: boolean;
    createAble: boolean;
    sortable: boolean;
    validate?: ModelValidateOptions;
}

const FieldMetaDataType = new GraphQLObjectType({
    name: "FieldMetaData",
    description: "字段描述",
    fields: {
        type: {
            description: "gql数据类型",
            type: GraphQLNonNull(GraphQLString)
        },
        dataType: {
            description: "sequelize定义类型",
            type: GraphQLString
        },
        name: {
            description: "字段键值",
            type: GraphQLNonNull(GraphQLString)
        },
        description: {
            description: "字段描述",
            type: GraphQLString
        },
        title: {
            description: "字段标签",
            type: GraphQLString
        },
        allowNull: {
            description: "允许为空",
            type: GraphQLNonNull(GraphQLBoolean)
        },
        isPk: {
            description: "是否主键",
            type: GraphQLBoolean
        },
        isList: {
            description: "是否列表",
            type: GraphQLNonNull(GraphQLBoolean)
        },
        sortable: {
            description: "是否可以排序",
            type: GraphQLNonNull(GraphQLBoolean)
        },
        editable: {
            description: "是否可编辑",
            type: GraphQLNonNull(GraphQLBoolean)
        },
        createAble: {
            description: "是否可创建",
            type: GraphQLNonNull(GraphQLBoolean)
        },
        validate: {
            description: "验证规则",
            type: JSONType
        }
    }
});


export const MetaDataType = new GraphQLObjectType({
    name: "GqlMetaData",
    description: "单表的定义",
    fields: {
        name: {
            description: "表名",
            type: new GraphQLNonNull(GraphQLString)
        },
        type: {
            description: "类型",
            type: new GraphQLNonNull(GraphQLString)
        },
        pkName: {
            description: "组件字段",
            type: GraphQLString
        },
        title: {
            description: "显示标签",
            type: GraphQLString
        },
        fields: {
            description: "模型字段",
            type: new GraphQLList(FieldMetaDataType)
        },
        description: {
            description: "描述字段",
            type: GraphQLString
        },
        editable: {
            description: "是否可编辑",
            type: GraphQLNonNull(GraphQLBoolean)
        },
        createAble: {
            description: "是否可创建",
            type: GraphQLNonNull(GraphQLBoolean)
        },
        removeAble: {
            description: "是否可删除",
            type: GraphQLNonNull(GraphQLBoolean)
        },
    }
});

type TableMetaData = {
    name: string;
    title: string;
    description: string;
    type: string;
    pkName?: string;
    createAble: boolean;
    editable: boolean;
    removeAble: boolean;
    fields: FieldMetaData[];
}


function getSortable(key: string, adapter: SequelizeAdapter<any, any, any>): boolean {
    const field = adapter.modelType.getFields()[key];
    const attribute = adapter.model.rawAttributes[key];
    if (attribute) {
        return ["TIME", "BIGINT", "DECIMAL", "DATE", "INTEGER", "FLOAT", "DOUBLE", "DOUBLE PRECISION"].some(type => (attribute.type as AbstractDataType).key === type);
    }
    return [GraphQLInt, GraphQLFloat, DateType].some(type => isEqualType(type, field.type));
}

function getTypeFieldsMetadata(type: GraphQLObjectType | GraphQLInputObjectType, adapter: SequelizeAdapter<any, any, any>) {
    const fields = type.getFields();
    return Object.keys(fields).filter(key => ![CONS.aggregationName, CONS.colName].includes(key)).map<FieldMetaData>(key => {
        const field = fields[key];
        const attribute = adapter.model.rawAttributes[key];
        return {
            type: getNamedType(field.type).toString(),
            dataType: attribute ? (_.isString(attribute.type) ? attribute.type : attribute.type.key) : undefined,
            isPk: attribute ? Boolean(attribute.primaryKey) : undefined,
            isList: isListType(field.type),
            allowNull: isNullableType(field.type),
            name: key,
            description: field.description,
            title: field.description || key,
            sortable: getSortable(key, adapter),
            editable: !!adapter.updateType.getFields()[key],
            createAble: !!adapter.createType.getFields()[key],
            validate: attribute?.validate
        };
    });
}


export function getMetaData(adapter: SequelizeAdapter<any, any, any>): TableMetaData {
    const mutationFields = (adapter.mutationFields[adapter.name]?.type as GraphQLObjectType)?.getFields() || {};
    return {
        name: adapter.name,
        pkName: adapter.primaryKeyName,
        type: adapter.modelType.toString(),
        title: adapter.description,
        description: adapter.description,
        createAble: !!mutationFields[adapter.nameMutationCreate],
        editable: !!mutationFields[adapter.nameMutationUpdate],
        removeAble: !!mutationFields[adapter.nameMutationRemove],
        fields: getTypeFieldsMetadata(adapter.modelType, adapter),
    };
}

export function getMetaDataList(adapters: { [key: string]: SequelizeAdapter<any, any, any> }): TableMetaData[] {
    return Object.keys(adapters).map<TableMetaData>(key => {
        const adapter = adapters[key];
        return getMetaData(adapter);
    });
}
