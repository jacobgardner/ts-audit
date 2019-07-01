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

// TODO: Same issue as in `as Type`.  We should preserve the type after the
// first call

// eslint-disable-next-line
let enum1 = validateInterface<StringEnum>('apple');
enum1 = validateInterface<StringEnum>('orange');

expectValidationError(() => {
    enum1 = validateInterface<StringEnum>('ooooooooo');
});

expectValidationError(() => {
    enum1 = validateInterface<StringEnum>(12);
});

expectValidationError(() => {
    enum1 = validateInterface<StringEnum>([]);
});

expectValidationError(() => {
    enum1 = validateInterface<StringEnum>({});
});

// eslint-disable-next-line
let enum2 = validateInterface<Mixed>('Coke');
enum2 = validateInterface<Mixed>('Pepsi');
enum2 = validateInterface<Mixed>(29);
enum2 = validateInterface<Mixed>(24);
enum2 = validateInterface<Mixed>(25);

expectValidationError(() => {
    enum2 = validateInterface<Mixed>(23);
});

expectValidationError(() => {
    enum2 = validateInterface<Mixed>(26);
});

expectValidationError(() => {
    enum2 = validateInterface<Mixed>(-1);
});

// eslint-disable-next-line
let obj = validateInterface<ComplexInterface<GenericType<number>>>({
    mixed: [],
    circular: { value: 12 },
    tuple: [5, { value: 55 }],
});

obj = validateInterface<ComplexInterface<GenericType<number>>>({
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
    obj = validateInterface<ComplexInterface<GenericType<number>>>({});
});

expectValidationError(() => {
    obj = validateInterface<ComplexInterface<GenericType<number>>>({
        mixed: [],
        circular: {
            value: '5',
        },
        tuple: [5],
    });
});

// TODO: Make root level union work

// // eslint-disable-next-line
// let union: UnionType = validateInterface({nonExport1: 'astring', nonExport2: 132});
// union = validateInterface({value: 5, circle: {value: 12}});

// eslint-disable-next-line
let iface = validateInterface<UnionIntersectionInterface>({
    union: { value: 5, circular: { value: 8 } },
    intersection: {
        nonExport1: 'astring',
        nonExport2: 132,
        shallow1: 5,
        shallow2: 'sttrrr',
        optionalShallow: 'str',
    },
});

iface = validateInterface<UnionIntersectionInterface>({
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
iface = validateInterface<UnionIntersectionInterface>({
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
    iface = validateInterface<UnionIntersectionInterface>({
        union: { nonExport1: 'astring', nonExport2: 132 },
        intersection: {
            shallow1: 5,
            shallow2: 'sttrrr',
            optionalShallow: 'str',
        },
    });
});

expectValidationError(() => {
    iface = validateInterface<UnionIntersectionInterface>({
        union: { nonExport1: 'astring', nonExport2: 132 },
        intersection: {
            nonExport1: 'astring',
            nonExport2: 132,
        },
    });
});
