import * as ts from 'typescript';
import { AnyObj } from './typeMatch';

export function enumerateFlags<T extends { [key: string]: AnyObj }>(
    e: T,
    callback: (key: string, value: number) => void,
) {
    for (const key of Object.keys(e)) {
        const value = e[key];
        if (typeof value !== 'number') {
            throw new Error('Expected flag to be number');
        }
        callback(key, value);
    }
}

type FlagsKeys<B> = {
    [K in keyof B]: B[K] extends number ? K : never;
}[keyof B];

export function parseFlags<T, K extends FlagsKeys<T>, E extends AnyObj>(
    flagKey: K,
    type: T,
    enumType: E,
) {
    const flags = type[flagKey];
    if (typeof flags !== 'number') {
        throw new Error('This flag must be number');
    }

    const flagNames: string[] = [];

    enumerateFlags(enumType, (key, value) => {
        if (value & flags) {
            flagNames.push(key);
        }
    });

    return flagNames.join(', ');
}

export const parseTypeFlags = (type: ts.Type) =>
    parseFlags('flags', type, ts.TypeFlags);

export const parseObjectFlags = (type: ts.ObjectType) =>
    parseFlags('objectFlags', type, ts.ObjectFlags);

export const parseSymbolFlags = (symbol: ts.Symbol) =>
    parseFlags('flags', symbol, ts.SymbolFlags);
