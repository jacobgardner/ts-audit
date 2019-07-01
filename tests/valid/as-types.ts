// TODO: This was copied from variable-declaration, could we autogenerate this?
import {
    ComplexInterface,
    GenericType,
    Mixed,
    StringEnum,
    UnionIntersectionInterface,
} from '../shared';
import { assertIsType } from 'ts-audit';
import { expectValidationError } from '../utils';

// TODO: Right now, we require every line to be annotated with `as Type`, but we
// should try to infer the type if we can after the first usage.

// eslint-disable-next-line
let enum1 = assertIsType('apple') as StringEnum;
enum1 = assertIsType('orange') as StringEnum;

expectValidationError(() => {
    enum1 = assertIsType('ooooooooo') as StringEnum;
});

expectValidationError(() => {
    enum1 = assertIsType(12) as StringEnum;
});

expectValidationError(() => {
    enum1 = assertIsType([]) as StringEnum;
});

expectValidationError(() => {
    enum1 = assertIsType({}) as StringEnum;
});

// eslint-disable-next-line
let enum2 = assertIsType('Coke') as Mixed;
enum2 = assertIsType('Pepsi') as Mixed;
enum2 = assertIsType(29) as Mixed;
enum2 = assertIsType(24) as Mixed;
enum2 = assertIsType(25) as Mixed;

expectValidationError(() => {
    enum2 = assertIsType(23) as Mixed;
});

expectValidationError(() => {
    enum2 = assertIsType(26) as Mixed;
});

expectValidationError(() => {
    enum2 = assertIsType(-1) as Mixed;
});

// eslint-disable-next-line
let obj = assertIsType({
    mixed: [],
    circular: { value: 12 },
    tuple: [5, { value: 55 }],
}) as ComplexInterface<GenericType<number>>;

obj = assertIsType({
    mixed: ['Coke', 25],
    genericType: {
        value: {
            value: 12,
        },
    },
    circular: {
        value: 1,
        circle: {
            value: 2,
            circle: {
                value: 3,
            },
        },
    },
    tuple: [1, { value: 5 }],
}) as ComplexInterface<GenericType<number>>;

expectValidationError(() => {
    obj = assertIsType({}) as ComplexInterface<GenericType<number>>;
});

expectValidationError(() => {
    obj = assertIsType({
        mixed: [],
        circular: {
            value: '5',
        },
        tuple: [5],
    }) as ComplexInterface<GenericType<number>>;
});

// TODO: Make root level union work

// // eslint-disable-next-line
// let union: UnionType = assertIsType({nonExport1: 'astring', nonExport2: 132});
// union = assertIsType({value: 5, circle: {value: 12}});

// eslint-disable-next-line
let iface = assertIsType({
    union: { value: 5, circular: { value: 8 } },
    intersection: {
        nonExport1: 'astring',
        nonExport2: 132,
        shallow1: 5,
        shallow2: 'sttrrr',
        optionalShallow: 'str',
    },
}) as UnionIntersectionInterface;

iface = assertIsType({
    union: { nonExport1: 'astring', nonExport2: 132 },
    intersection: {
        nonExport1: 'astring',
        nonExport2: 132,
        shallow1: 5,
        shallow2: 'sttrrr',
        optionalShallow: 'str',
    },
}) as UnionIntersectionInterface;

// Even though the union has parts of both, it technically works because it
// meets the critera for at least one of them.  This could be corrected by
// disabling additional properties on the schema.
iface = assertIsType({
    union: { nonExport1: 'astring', nonExport2: 132, value: 6 },
    intersection: {
        nonExport1: 'astring',
        nonExport2: 132,
        shallow1: 5,
        shallow2: 'sttrrr',
        optionalShallow: 'str',
    },
}) as UnionIntersectionInterface;

expectValidationError(() => {
    iface = assertIsType({
        union: { nonExport1: 'astring', nonExport2: 132 },
        intersection: {
            shallow1: 5,
            shallow2: 'sttrrr',
            optionalShallow: 'str',
        },
    }) as UnionIntersectionInterface;
});

expectValidationError(() => {
    iface = assertIsType({
        union: { nonExport1: 'astring', nonExport2: 132 },
        intersection: {
            nonExport1: 'astring',
            nonExport2: 132,
        },
    }) as UnionIntersectionInterface;
});
