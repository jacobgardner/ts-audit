import * as fs from 'fs';
import * as util from 'util';
import colors from 'colors';

const f = fs.openSync('output', 'w');

export function log(...params: any[]) {
    console.log(...params);
    fs.writeSync(
        f,
        Buffer.from(
            params
                .map(param => {
                    if (typeof param === 'string') {
                        return param;
                    } else {
                        return util.inspect(param);
                    }
                })
                .map(param => colors.stripColors(param))
                .join(' ') + '\n'
        )
    );
}
