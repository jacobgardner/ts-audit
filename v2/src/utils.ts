import * as ts from 'typescript';

export function hide<T extends Record<any, any>>(obj: T, hiddenFields: string[]): T {
    const dup = {...obj};

    for (const field of hiddenFields) {
        delete dup[field];
    }

    return dup;
}

export const hideSymbol = (symbol: ts.Symbol) => hide(symbol, ['parent']);
export const hideNode = (node: ts.Node) => hide(node, ['parent']);