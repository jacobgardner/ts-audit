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

// TODO: Same comment as the others about inference

let enum1 = <StringEnum>assertIsType('apple');
enum1 = <StringEnum>assertIsType('orange');

expectValidationError(() => {
    enum1 = <StringEnum>assertIsType('ooooooooo');
});

expectValidationError(() => {
    enum1 = <StringEnum>assertIsType(12);
});

expectValidationError(() => {
    enum1 = <StringEnum>assertIsType([]);
});

expectValidationError(() => {
    enum1 = <StringEnum>assertIsType({});
});

let enum2 = <Mixed>assertIsType('Coke');
enum2 = <Mixed>assertIsType('Pepsi');
enum2 = <Mixed>assertIsType(29);
enum2 = <Mixed>assertIsType(24);
enum2 = <Mixed>assertIsType(25);

expectValidationError(() => {
    enum2 = <Mixed>assertIsType(23);
});

expectValidationError(() => {
    enum2 = <Mixed>assertIsType(26);
});

expectValidationError(() => {
    enum2 = <Mixed>assertIsType(-1);
});

let obj = <ComplexInterface<GenericType<number>>>assertIsType({
    mixed: [],
    circular: { value: 12 },
    tuple: [5, { value: 55 }],
});

obj = <ComplexInterface<GenericType<number>>>assertIsType({
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
    obj = <ComplexInterface<GenericType<number>>>assertIsType({});
});

expectValidationError(() => {
    obj = <ComplexInterface<GenericType<number>>>assertIsType({
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

let iface = <UnionIntersectionInterface>assertIsType({
    union: { value: 5, circular: { value: 8 } },
    intersection: {
        nonExport1: 'astring',
        nonExport2: 132,
        shallow1: 5,
        shallow2: 'sttrrr',
        optionalShallow: 'str',
    },
});

iface = <UnionIntersectionInterface>assertIsType({
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
iface = <UnionIntersectionInterface>assertIsType({
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
    iface = <UnionIntersectionInterface>assertIsType({
        union: { nonExport1: 'astring', nonExport2: 132 },
        intersection: {
            shallow1: 5,
            shallow2: 'sttrrr',
            optionalShallow: 'str',
        },
    });
});

expectValidationError(() => {
    iface = <UnionIntersectionInterface>assertIsType({
        union: { nonExport1: 'astring', nonExport2: 132 },
        intersection: {
            nonExport1: 'astring',
            nonExport2: 132,
        },
    });
});
