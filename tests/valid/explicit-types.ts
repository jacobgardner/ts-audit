import {
    ComplexInterface,
    GenericType,
    Mixed,
    StringEnum,
    UnionIntersectionInterface,
} from '../shared';
import { expectValidationError } from '../utils';
import { validateInterface } from 'ts-audit';

// eslint-disable-next-line
let enum1: StringEnum = validateInterface('apple');
enum1 = validateInterface('orange');

expectValidationError(() => {
    enum1 = validateInterface('ooooooooo');
});

expectValidationError(() => {
    enum1 = validateInterface(12);
});

expectValidationError(() => {
    enum1 = validateInterface([]);
});

expectValidationError(() => {
    enum1 = validateInterface({});
});

// eslint-disable-next-line
let enum2: Mixed = validateInterface('Coke');
enum2 = validateInterface('Pepsi');
enum2 = validateInterface(29);
enum2 = validateInterface(24);
enum2 = validateInterface(25);

expectValidationError(() => {
    enum2 = validateInterface(23);
});

expectValidationError(() => {
    enum2 = validateInterface(26);
});

expectValidationError(() => {
    enum2 = validateInterface(-1);
});

// eslint-disable-next-line
let obj: ComplexInterface<GenericType<number>> = validateInterface({
    mixed: [],
    circular: { value: 12 },
    tuple: [5, { value: 55 }],
});

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
});

expectValidationError(() => {
    obj = validateInterface({});
});

expectValidationError(() => {
    obj = validateInterface({
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
let iface: UnionIntersectionInterface = validateInterface({
    union: { value: 5, circular: { value: 8 } },
    intersection: {
        nonExport1: 'astring',
        nonExport2: 132,
        shallow1: 5,
        shallow2: 'sttrrr',
        optionalShallow: 'str',
    },
});

iface = validateInterface({
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
iface = validateInterface({
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
    iface = validateInterface({
        union: { nonExport1: 'astring', nonExport2: 132 },
        intersection: {
            shallow1: 5,
            shallow2: 'sttrrr',
            optionalShallow: 'str',
        },
    });
});

expectValidationError(() => {
    iface = validateInterface({
        union: { nonExport1: 'astring', nonExport2: 132 },
        intersection: {
            nonExport1: 'astring',
            nonExport2: 132,
        },
    });
});
