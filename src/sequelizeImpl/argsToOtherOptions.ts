import {ModelType, Sequelize} from "sequelize";
import _ from "lodash";

import {Col, Fn} from "sequelize/types/lib/utils";

type OtherOptions = {
    fn: string;
    args?: OtherArgs;
}

type OtherArgs = Array<OtherOptions | string | number> | OtherOptions | string | number

export default function argsToOtherOptions(args: OtherArgs, model: ModelType): {
    options: (string | Fn | Col)[];
    associationFields: string[];
} {
    const associationFields: string[] = [];

    function _argsToOtherOptions(args: OtherArgs): (string | Fn | Col)[] {
        const argList: (OtherOptions | string | number)[] = _.isUndefined(args) ? [] : (_.isArray(args) ? args : [args]);
        // @ts-ignore
        return argList.map<string | Fn | Col>((arg, i) => {
            if (i === 0 && _.isString(arg)) {
                const [field, subField] = arg.split(".");
                if (model.rawAttributes[field]) {
                    return Sequelize.col(model.rawAttributes[field].field || field);
                } else if (model.associations[field]) {
                    associationFields.push(field);
                    const target = model.associations[field].target;
                    return Sequelize.col(`${field}.${target.rawAttributes[subField].field || subField}`);
                }
                return arg;
            } else if (_.isObject(arg)) {
                return Sequelize.fn(arg.fn, ..._argsToOtherOptions(arg.args));
            } else {
                return arg;
            }
        });
    }

    return {
        options: _argsToOtherOptions(args),
        associationFields
    };
}
