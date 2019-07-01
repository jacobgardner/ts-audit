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

/*
    This determines if the type passed in corresponds to the validation
    function in our declaration file (index.d.ts).  It performs this check
    by checking if the return value matches the unique name we have given
    the validate function. (See isRuntimeChecker for that part)
*/
export function isTypeTheValidateFunction(nodeType: ts.Type): boolean {
    // valueDeclaration is a reference to the first  line where the node
    // is found in the AST. This  means it is where the node is declared
    // and hopefully typed.  This **SHOULD** be the same as
    // `.declarations[0]`.
    if (!nodeType.symbol) {
        return false;
    }

    // TODO: Figure out why this doesn't work with nodeType.symbol.valueDeclaration....
    const valueDeclaration = nodeType.symbol.declarations[0];

    // TODO: we can unify these two checks more...
    if (ts.isFunctionDeclaration(valueDeclaration)) {
        if (
            valueDeclaration.typeParameters &&
            valueDeclaration.typeParameters.length === 1
        ) {
            const firstTypeParam = valueDeclaration.typeParameters[0];

            if (
                firstTypeParam.default &&
                isRuntimeChecker(firstTypeParam.default)
            ) {
                return true;
            }
        } else if (
            valueDeclaration.type &&
            isRuntimeChecker(valueDeclaration.type)
        ) {
            return true;
        }
    }

    return false;
}
