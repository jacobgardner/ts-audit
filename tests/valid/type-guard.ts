/// <reference path="../ts-audit.d.ts" />
import { ComplexInterface, GenericType, StringEnum } from '../shared';
import { isType } from 'ts-audit';

// TODO: More tests
// TODO: Better tests

let rawData: unknown = 'apple';

if (isType<StringEnum>(rawData)) {
    rawData; // $ExpectType StringEnum
} else {
    throw new Error('Expected type guard to pass');
}

rawData = {
    mixed: [],
    circular: { value: 12 },
    tuple: [5, { value: 55 }],
};

if (isType<ComplexInterface<GenericType<number>>>(rawData)) {
    rawData; // $ExpectType ComplexInterface<GenericType<number>>

    rawData.circular.value === 12;
    rawData.tuple[0] === 5;
    rawData.tuple[1].value === 55;
}
