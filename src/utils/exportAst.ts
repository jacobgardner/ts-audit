import * as ts from 'typescript';
import { AnyObj } from './typeMatch';
import { MULTILINE_LITERALS } from '../config';

/*
    Generates AST node for export.
*/
export function generateNamedExport(identifier: ts.Identifier) {
    return ts.createStatement(
        ts.createAssignment(
            ts.createPropertyAccess(ts.createIdentifier('exports'), identifier),
            identifier,
        ),
    );
}

/*
    Building up a chain of the same operation manually is incredibly annoying.
    So this just lets you list them like a normal person.
 */
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

/*
    Takes an object literal and converts it to the corresponding AST. This
    makes our lives much easier because we can build a literal like normal and
    automate the conversion.
*/
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
