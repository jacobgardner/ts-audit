import * as ts from 'typescript';

export function hide<T extends Record<any, any>>(obj: T, hiddenFields: string[]): T {
    const dup = { ...obj };

    for (const field of hiddenFields) {
        delete dup[field];
    }

    return dup;
}

export const hideSymbol = (symbol: ts.Symbol) => hide(symbol, ['parent']);
export const hideNode = (node: ts.Node) => hide(node, ['parent']);

export function parseTypeFlags(type: ts.Type) {
    const { flags } = type;

    const flagNames = [];
    for (const key of Object.keys(ts.TypeFlags)) {
        const num = (ts.TypeFlags[key as any] as any) as number;
        if (num & (flags as number)) {
            flagNames.push(key);
        }
    }

    return flagNames.join(', ');
}

export function parseSymbolFlags(type: ts.Symbol) {
    const { flags } = type;

    const flagNames = [];
    for (const key of Object.keys(ts.SymbolFlags)) {
        const num = (ts.SymbolFlags[key as any] as any) as number;
        if (num & (flags as number)) {
            flagNames.push(key);
        }
    }

    return flagNames.join(', ');
}