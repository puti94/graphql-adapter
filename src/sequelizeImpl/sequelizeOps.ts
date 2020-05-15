import {Op} from "sequelize";
import {transform} from "lodash";

export default transform(Op, (o, v, k) => {
    if (typeof v !== "symbol") {
        return;
    }
    // @ts-ignore
    o[`${k}`] = v;
});
