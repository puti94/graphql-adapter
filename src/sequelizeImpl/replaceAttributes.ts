import {FindAttributeOptions, ProjectionAlias, Sequelize} from "sequelize";
import _ from "lodash";


function replaceProjectionAlias(attributes: string[]): (string | ProjectionAlias)[] {
    return attributes.map(item => {
        if (_.isString(item)) return item;
        if (_.isArray(item)) {
            const [fun, col, alias] = item as string[];
            if (fun.toUpperCase() === "COUNT") {
                // 如果是要包含统计分组的数量,避免字段不匹配，使用保留字段_count
                return [Sequelize.fn("COUNT", "*"), "_count"];
            } else if (fun.toUpperCase() === "AVG") {
                // 如果是要包含平均值,避免字段类型不匹配，使用保留字段_avg
                return [Sequelize.fn("AVG", Sequelize.col(col)), alias ? "_avg" : col];
            }
            return [Sequelize.fn(fun, Sequelize.col(col)), col];
        }
        return item;
    });
}

/**
 * Replace the where arguments object and return the sequelize compatible version.
 * @returns {any[] | null}
 * @param attributes
 */
export function replaceAttributes(attributes?: string[] | { exclude?: string[]; include: string[] } | { exclude: string[]; include?: string[] }): FindAttributeOptions | null {
    if (_.isArray(attributes)) {
        return replaceProjectionAlias(attributes);
    } else if (_.isArray(attributes.include)) {
        return {
            include: replaceProjectionAlias(attributes.include)
        };
    } else if (_.isArray(attributes.exclude)) {
        return {
            exclude: attributes.exclude
        };
    }
    return null;
}
