import * as ts from 'typescript';

export function hide<T extends {}>(obj: T, hiddenFields: string[]): T {
    const dup: Record<string | number | symbol, unknown> = { ...obj };

    for (const field of hiddenFields) {
        delete dup[field];
    }

    return dup as T;
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

export function parseObjectFlags(type: ts.Type) {
    const { objectFlags = 0 } = type as any;

    const flagNames = [];

    for (const key of Object.keys(ts.ObjectFlags)) {
        const num = (ts.ObjectFlags[key as any] as any) as number;

        if (num & (objectFlags as number)) {
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
                    convertObjToAST((obj as any)[key], depth + 1),
                ),
            );
        }

        return ts.createObjectLiteral(properties);
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

const RUNTIME_CHECK_SYMBOL = '_RUNTIME_CHECK_ANY';

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
): ts.Expression {
    if (remaining.length) {
        return ts.createAdd(
            firstOperand,
            addChain(...(remaining as [ts.Expression, ...ts.Expression[]])),
        );
    } else {
        return firstOperand;
    }
}
