import { validateInterface } from 'ts-audit';
import { StringEnum, Mixed, ComplexInterface, GenericType } from '../shared';
import { expectValidationError } from '../utils';

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
const obj: ComplexInterface<GenericType<number>> = validateInterface({
    mixed: [],
    circular: { value: 12 },
    tuple: [5, { value: 55 }],
});
