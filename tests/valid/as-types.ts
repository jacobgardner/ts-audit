// TODO: This was copied from explicit-types, could we autogenerate this?
import { validateInterface } from 'ts-audit';
import {
    StringEnum,
    Mixed,
    ComplexInterface,
    GenericType,
    UnionIntersectionInterface,
} from '../shared';
import { expectValidationError } from '../utils';

// TODO: Right now, we require every line to be annotated with `as Type`, but we
// should try to infer the type if we can after the first usage.

// eslint-disable-next-line
let enum1 = validateInterface('apple') as StringEnum;
enum1 = validateInterface('orange') as StringEnum;

expectValidationError(() => {
    enum1 = validateInterface('ooooooooo') as StringEnum;
});

expectValidationError(() => {
    enum1 = validateInterface(12) as StringEnum;
});

expectValidationError(() => {
    enum1 = validateInterface([]) as StringEnum;
});

expectValidationError(() => {
    enum1 = validateInterface({}) as StringEnum;
});

// eslint-disable-next-line
let enum2 = validateInterface('Coke') as Mixed;
enum2 = validateInterface('Pepsi') as Mixed;
enum2 = validateInterface(29) as Mixed;
enum2 = validateInterface(24) as Mixed;
enum2 = validateInterface(25) as Mixed;

expectValidationError(() => {
    enum2 = validateInterface(23) as Mixed;
});

expectValidationError(() => {
    enum2 = validateInterface(26) as Mixed;
});

expectValidationError(() => {
    enum2 = validateInterface(-1) as Mixed;
});

// eslint-disable-next-line
let obj = validateInterface({
    mixed: [],
    circular: { value: 12 },
    tuple: [5, { value: 55 }],
}) as ComplexInterface<GenericType<number>>;

obj = validateInterface({
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
    obj = validateInterface({}) as ComplexInterface<GenericType<number>>;
});

expectValidationError(() => {
    obj = validateInterface({
        mixed: [],
        circular: {
            value: '5',
        },
        tuple: [5],
    }) as ComplexInterface<GenericType<number>>;
});

// TODO: Make root level union work

// // eslint-disable-next-line
// let union: UnionType = validateInterface({nonExport1: 'astring', nonExport2: 132});
// union = validateInterface({value: 5, circle: {value: 12}});

// eslint-disable-next-line
let iface = validateInterface({
    union: { value: 5, circular: { value: 8 } },
    intersection: {
        nonExport1: 'astring',
        nonExport2: 132,
        shallow1: 5,
        shallow2: 'sttrrr',
        optionalShallow: 'str',
    },
}) as UnionIntersectionInterface;

iface = validateInterface({
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
iface = validateInterface({
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
    iface = validateInterface({
        union: { nonExport1: 'astring', nonExport2: 132 },
        intersection: {
            shallow1: 5,
            shallow2: 'sttrrr',
            optionalShallow: 'str',
        },
    }) as UnionIntersectionInterface;
});

expectValidationError(() => {
    iface = validateInterface({
        union: { nonExport1: 'astring', nonExport2: 132 },
        intersection: {
            nonExport1: 'astring',
            nonExport2: 132,
        },
    }) as UnionIntersectionInterface;
});
