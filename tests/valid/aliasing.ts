import { validateInterface as aliasCheck } from 'ts-audit';
import { ComplexInterface } from '../shared';

type AliasGeneric<T> = ComplexInterface<T>;

// eslint-disable-next-line
let t = aliasCheck<AliasGeneric<string>>({
    mixed: ['Coke'],
    genericType: {
        value: 'someString',
    },
    circular: {
        value: 5,
        circular: {
            value: 12,
        },
    },
    tuple: [100, 'str'],
});
