import * as ts from 'typescript';
import { ajvInstance } from './schemaBoilerplate';
import { generateNamedExport } from '../utils/exportAst';
import { TYPE_SOFT_CHECK_NAME } from '../config';

export const isTypeIdentifier = ts.createIdentifier(TYPE_SOFT_CHECK_NAME);
export const rawArg = ts.createIdentifier('raw');
export const definitionReferenceArg = ts.createIdentifier(
    'definitionReference',
);

export function generateIsTypeFn() {
    const validateStatement = ts.createCall(
        ts.createPropertyAccess(ajvInstance, 'validate'),
        [],
        [definitionReferenceArg, rawArg],
    );

    const isTypeFunction = ts.createFunctionDeclaration(
        [],
        [],
        undefined,
        isTypeIdentifier,
        [],
        [
            ts.createParameter([], [], undefined, rawArg),
            ts.createParameter([], [], undefined, definitionReferenceArg),
        ],
        undefined,
        ts.createBlock([ts.createReturn(validateStatement)]),
    );

    const exportAssertIs = generateNamedExport(isTypeIdentifier);

    return [isTypeFunction, exportAssertIs];
}
