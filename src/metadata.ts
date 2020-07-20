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
import {SequelizeAdapter} from "./SequelizeAdapter";
import {DateType} from "./sequelizeImpl/types";

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
        allowNull: {
            description: "允许为空",
            type: GraphQLNonNull(GraphQLBoolean)
        },
        isList: {
            description: "是否列表",
            type: GraphQLNonNull(GraphQLBoolean)
        },
        isPk: {
            description: "是否主键",
            type: GraphQLBoolean
        },
        description: {
            description: "字段描述",
            type: GraphQLString
        },
        title: {
            description: "字段标签",
            type: GraphQLString
        },
        enable: {
            description: "是否可用",
            type: GraphQLBoolean
        },
        sortable: {
            description: "是否可以排序",
            type: GraphQLBoolean
        }
    }
});

const ActionMetaDataType = new GraphQLObjectType({
    name: "ActionMetaData",
    description: "操作描述",
    fields: {
        name: {
            description: "数据类型",
            type: new GraphQLNonNull(GraphQLString)
        },
        args: {
            description: "参数字段",
            type: new GraphQLList(FieldMetaDataType)
        },
        fields: {
            description: "返回字段",
            type: new GraphQLList(FieldMetaDataType)
        },
        enable: {
            description: "是否可用",
            type: GraphQLBoolean
        }
    }
});

export const MetaDataType = new GraphQLObjectType({
    name: "MetaData",
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
        findOne: {
            description: "查找单个",
            type: ActionMetaDataType
        },
        findList: {
            description: "查找列表",
            type: ActionMetaDataType
        },
        create: {
            description: "新建",
            type: ActionMetaDataType
        },
        update: {
            description: "更新",
            type: ActionMetaDataType
        },
        remove: {
            description: "删除",
            type: ActionMetaDataType
        },
        enable: {
            description: "是否可用",
            type: GraphQLBoolean
        },
    }
});


type FieldMetaData = {
    type: string;
    dataType?: string;
    name: string;
    description: string;
    title: string;
    allowNull: boolean;
    isPk?: boolean;
    isList: boolean;
    enable?: boolean;
    sortable?: boolean;
}

type ActionMetaData = {
    name: string;
    args?: FieldMetaData[];
    fields?: FieldMetaData[];
    enable: boolean;
}

type MetaData = {
    name: string;
    title: string;
    description: string;
    type: string;
    pkName?: string;
    enable?: boolean;
    fields?: FieldMetaData[];
    findOne?: ActionMetaData;
    findList?: ActionMetaData;
    create?: ActionMetaData;
    update?: ActionMetaData;
    remove?: ActionMetaData;
}


function getSortable(key: string, adapter: SequelizeAdapter<any, any, any>): boolean {
    const field = adapter.modelType.getFields()[key];
    // @ts-ignore
    const attribute = adapter.model.rawAttributes[key];
    if (attribute) {
        return ["TIME", "BIGINT", "DECIMAL", "DATE", "INTEGER", "FLOAT", "DOUBLE", "DOUBLE PRECISION"].some(type => (attribute.type as AbstractDataType).key === type);
    }
    return [GraphQLInt, GraphQLFloat, DateType].some(type => isEqualType(type, field.type));
}

function getTypeFieldsMetadata(type: GraphQLObjectType | GraphQLInputObjectType, adapter: SequelizeAdapter<any, any, any>) {
    const fields = type.getFields();
    return Object.keys(fields).map<FieldMetaData>(key => {
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
            enable: true
        };
    });
}


export function getMetaData(adapter: SequelizeAdapter<any, any, any>): MetaData {
    return {
        name: adapter.name,
        pkName: adapter.primaryKeyName,
        type: adapter.modelType.toString(),
        title: adapter.description,
        description: adapter.description,
        fields: getTypeFieldsMetadata(adapter.modelType, adapter),
        findOne: {
            name: adapter.getOne.description,
            enable: true,
        },
        findList: {
            name: adapter.getList.description,
            enable: true,
        },
        create: {
            name: adapter.getList.description,
            enable: true,
            args: getTypeFieldsMetadata(adapter.createType, adapter),
        },
        update: {
            name: adapter.getList.description,
            enable: true,
            args: getTypeFieldsMetadata(adapter.createType, adapter),
        },
    };
}

export function getMetaDataList(adapters: { [key: string]: SequelizeAdapter<any, any, any> }): MetaData[] {
    return Object.keys(adapters).map<MetaData>(key => {
        const adapter = adapters[key];
        return getMetaData(adapter);
    });
}
