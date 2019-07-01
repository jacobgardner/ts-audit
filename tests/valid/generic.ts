/// <reference path="../ts-audit.d.ts" />
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

// TODO: Same issue as in `as Type`.  We should preserve the type after the
// first call

let enum1 = assertIsType<StringEnum>('apple');
enum1 = assertIsType<StringEnum>('orange');

expectValidationError(() => {
    enum1 = assertIsType<StringEnum>('ooooooooo');
});

expectValidationError(() => {
    enum1 = assertIsType<StringEnum>(12);
});

expectValidationError(() => {
    enum1 = assertIsType<StringEnum>([]);
});

expectValidationError(() => {
    enum1 = assertIsType<StringEnum>({});
});

let enum2 = assertIsType<Mixed>('Coke');
enum2 = assertIsType<Mixed>('Pepsi');
enum2 = assertIsType<Mixed>(29);
enum2 = assertIsType<Mixed>(24);
enum2 = assertIsType<Mixed>(25);

expectValidationError(() => {
    enum2 = assertIsType<Mixed>(23);
});

expectValidationError(() => {
    enum2 = assertIsType<Mixed>(26);
});

expectValidationError(() => {
    enum2 = assertIsType<Mixed>(-1);
});

let obj = assertIsType<ComplexInterface<GenericType<number>>>({
    mixed: [],
    circular: { value: 12 },
    tuple: [5, { value: 55 }],
});

obj = assertIsType<ComplexInterface<GenericType<number>>>({
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
    obj = assertIsType<ComplexInterface<GenericType<number>>>({});
});

expectValidationError(() => {
    obj = assertIsType<ComplexInterface<GenericType<number>>>({
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

let iface = assertIsType<UnionIntersectionInterface>({
    union: { value: 5, circular: { value: 8 } },
    intersection: {
        nonExport1: 'astring',
        nonExport2: 132,
        shallow1: 5,
        shallow2: 'sttrrr',
        optionalShallow: 'str',
    },
});

iface = assertIsType<UnionIntersectionInterface>({
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
iface = assertIsType<UnionIntersectionInterface>({
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
    iface = assertIsType<UnionIntersectionInterface>({
        union: { nonExport1: 'astring', nonExport2: 132 },
        intersection: {
            shallow1: 5,
            shallow2: 'sttrrr',
            optionalShallow: 'str',
        },
    });
});

expectValidationError(() => {
    iface = assertIsType<UnionIntersectionInterface>({
        union: { nonExport1: 'astring', nonExport2: 132 },
        intersection: {
            nonExport1: 'astring',
            nonExport2: 132,
        },
    });
});
