import * as ts from 'typescript';
import { MULTILINE_LITERALS, RUNTIME_CHECK_SYMBOL } from './config';

export function hide<T extends {}>(obj: T, hiddenFields: string[]): T {
    const dup: Record<string | number | symbol, unknown> = { ...obj };

    for (const field of hiddenFields) {
        delete dup[field];
    }

    return dup as T;
}

export const hideSymbol = (symbol: ts.Symbol) => hide(symbol, ['parent']);
export const hideNode = (node: ts.Node) => hide(node, ['parent']);

// eslint-disable-next-line
type AnyObj = { [key: string]: any };

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

export function convertObjToAST(obj: unknown, depth = 0): ts.Expression {
    if (typeof obj === 'string') {
        return ts.createStringLiteral(obj);
    } else if (typeof obj === 'number') {
        return ts.createNumericLiteral(obj.toString());
    } else if (typeof obj === 'object') {
        if (Array.isArray(obj)) {
            return ts.createArrayLiteral(obj.map(convertObjToAST));
        } else if (obj === null) {
            return ts.createNull();
        }

        const properties: ts.PropertyAssignment[] = [];

        for (const key of Object.keys(obj)) {
            properties.push(
                ts.createPropertyAssignment(
                    ts.createStringLiteral(key),
                    convertObjToAST((obj as AnyObj)[key], depth + 1),
                ),
            );
        }

        return ts.createObjectLiteral(properties, MULTILINE_LITERALS);
    } else if (typeof obj === 'boolean') {
        if (obj) {
            return ts.createTrue();
        } else {
            return ts.createFalse();
        }
    } else if (typeof obj === 'undefined') {
        return ts.createNode(ts.SyntaxKind.UndefinedKeyword) as ts.Expression;
    }

    throw new Error(`${typeof obj} is not yet supported for AST dump`);
}

export function isRuntimeChecker(type: ts.TypeNode) {
    return (
        ts.isTypeReferenceNode(type) &&
        ts.isIdentifier(type.typeName) &&
        type.typeName.escapedText === RUNTIME_CHECK_SYMBOL
    );
}

export function addChain(
    firstOperand: ts.Expression,
    ...remaining: ts.Expression[]
): ts.Expression;
export function addChain(...operands: ts.Expression[]): ts.Expression {
    const remaining = operands.slice(0, -1);
    const lastOperand = operands[operands.length - 1];

    if (remaining.length) {
        return ts.createAdd(
            addChain(...(remaining as [ts.Expression, ...ts.Expression[]])),
            lastOperand,
        );
    } else {
        return lastOperand;
    }
}
