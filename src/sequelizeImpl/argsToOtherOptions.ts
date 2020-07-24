import {ModelType, Sequelize} from "sequelize";
import _ from "lodash";
import {isObjectType} from "graphql";
import {Col, Fn} from "sequelize/types/lib/utils";
import {SequelizeAdapter} from "../SequelizeAdapter";

type OtherOptions = {
    fn: string;
    args?: OtherArgs;
}

type OtherArgs = Array<OtherOptions | string | number> | OtherOptions | string | number

export default function argsToOtherOptions(args: OtherArgs, adapter: SequelizeAdapter<any, any, any>): {
    options: (string | Fn | Col)[];
    associationFields: string[];
    includeFields: string[];
} {
    const associationFields = new Set<string>();
    const includeFields = new Set<string>();

    function _argsToOtherOptions(args: OtherArgs): (string | Fn | Col)[] {
        const argList: (OtherOptions | string | number)[] = _.isUndefined(args) ? [] : (_.isArray(args) ? args : [args]);
        // @ts-ignore
        return argList.map<string | Fn | Col>((arg, i) => {
            if (i === 0 && _.isString(arg)) {
                const [field, subField] = arg.split(".");
                const fieldConfig = adapter.modelType.getFields()[field];
                if (fieldConfig && !isObjectType(fieldConfig.type) && adapter.model.rawAttributes[field]) {
                    includeFields.add(`${adapter.model.name}.${field}`);
                    return Sequelize.col(adapter.model.rawAttributes[field].field || field);
                } else if (
                    fieldConfig
                    && isObjectType(fieldConfig.type)
                    && fieldConfig.type.getFields()[subField]
                    && adapter.model.associations[field]?.target.rawAttributes[subField]
                ) {
                    const target = adapter.model.associations[field].target;
                    associationFields.add(field);
                    includeFields.add(`${target.name}.${subField}`);
                    return Sequelize.col(`${field}.${target.rawAttributes[subField].field || subField}`);
                }
                return field;
            } else if (_.isObject(arg)) {
                return Sequelize.fn(arg.fn, ..._argsToOtherOptions(arg.args));
            } else {
                return arg;
            }
        });
    }

    return {
        options: _argsToOtherOptions(args),
        associationFields: Array.from(associationFields),
        includeFields: Array.from(includeFields)
    };
}
