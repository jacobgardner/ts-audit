import * as ts from 'typescript';
import { RUNTIME_CHECK_SYMBOL } from '../config';

// eslint-disable-next-line
export type AnyObj = { [key: string]: any };

export function isRuntimeChecker(type: ts.TypeNode) {
    return (
        ts.isTypeReferenceNode(type) &&
        ts.isIdentifier(type.typeName) &&
        type.typeName.escapedText === RUNTIME_CHECK_SYMBOL
    );
}
