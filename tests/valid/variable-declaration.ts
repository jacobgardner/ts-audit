import {
    ComplexInterface,
    GenericType,
    Mixed,
    StringEnum,
    UnionIntersectionInterface,
} from '../shared';
import { assertIsType } from 'ts-audit';
import { expectValidationError } from '../utils';

let enum1: StringEnum = assertIsType('apple');
enum1 = assertIsType('orange');

expectValidationError(() => {
    enum1 = assertIsType('ooooooooo');
});

expectValidationError(() => {
    enum1 = assertIsType(12);
});

expectValidationError(() => {
    enum1 = assertIsType([]);
});

expectValidationError(() => {
    enum1 = assertIsType({});
});

let enum2: Mixed = assertIsType('Coke');
enum2 = assertIsType('Pepsi');
enum2 = assertIsType(29);
enum2 = assertIsType(24);
enum2 = assertIsType(25);

expectValidationError(() => {
    enum2 = assertIsType(23);
});

expectValidationError(() => {
    enum2 = assertIsType(26);
});

expectValidationError(() => {
    enum2 = assertIsType(-1);
});

let obj: ComplexInterface<GenericType<number>> = assertIsType({
    mixed: [],
    circular: { value: 12 },
    tuple: [5, { value: 55 }],
});

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
});

expectValidationError(() => {
    obj = assertIsType({});
});

expectValidationError(() => {
    obj = assertIsType({
        mixed: [],
        circular: {
            value: '5',
        },
        tuple: [5],
    });
});

// TODO: Make root level union work

// let union: UnionType = assertIsType({nonExport1: 'astring', nonExport2: 132});
// union = assertIsType({value: 5, circle: {value: 12}});

let iface: UnionIntersectionInterface = assertIsType({
    union: { value: 5, circular: { value: 8 } },
    intersection: {
        nonExport1: 'astring',
        nonExport2: 132,
        shallow1: 5,
        shallow2: 'sttrrr',
        optionalShallow: 'str',
    },
});

iface = assertIsType({
    union: { nonExport1: 'astring', nonExport2: 132 },
    intersection: {
        nonExport1: 'astring',
        nonExport2: 132,
        shallow1: 5,
        shallow2: 'sttrrr',
        optionalShallow: 'str',
    },
});

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
});

expectValidationError(() => {
    iface = assertIsType({
        union: { nonExport1: 'astring', nonExport2: 132 },
        intersection: {
            shallow1: 5,
            shallow2: 'sttrrr',
            optionalShallow: 'str',
        },
    });
});

expectValidationError(() => {
    iface = assertIsType({
        union: { nonExport1: 'astring', nonExport2: 132 },
        intersection: {
            nonExport1: 'astring',
            nonExport2: 132,
        },
    });
});
