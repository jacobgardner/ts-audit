import * as ts from 'typescript';
import { definitionReferenceArg, isTypeIdentifier, rawArg } from './isType';
import { addChain } from '../utils';
import { ajvInstance } from './schemaBoilerplate';
import { generateNamedExport } from '../utils/exportAst';
import { TYPE_ASSERTION_NAME } from '../config';
import { validationErrorIdentifier } from './validationError';

export const assertIsTypeIdentifier = ts.createIdentifier(TYPE_ASSERTION_NAME);

/*
This roughly generates:

var Validator = require('ajv');
var validator = new Validator({
    schemas: [
        {
            $id: 'root',
            $schema: 'http://json-schema.org/draft-07/schema#',
            definitions: {
                // schema definitions here...
            }
        },
    ],
});
function assertIsType(raw, definitionReference) {
    if (validator.validate(definitionReference, raw)) {
        return raw;
    } else {
        throw new ValidationError(
            'Validation Failure: ' +
            validator.errorsText() +
            '\n' +
            JSON.stringify(validator.errors, null, '  ') +
            '\nPassed in value:\n' +
            JSON.stringify(raw),
        );
    }
}
*/

export function generateAssertIsTypeFn() {
    const exportAssertIsType = generateNamedExport(assertIsTypeIdentifier);

    const errorMessage = addChain(
        ts.createStringLiteral('Validation Failure: '),
        ts.createCall(
            ts.createPropertyAccess(ajvInstance, 'errorsText'),
            [],
            [],
        ),
        ts.createStringLiteral('\n'),
        ts.createCall(
            ts.createPropertyAccess(ts.createIdentifier('JSON'), 'stringify'),
            [],
            [
                ts.createPropertyAccess(ajvInstance, 'errors'),
                ts.createNull(),
                ts.createStringLiteral('  '),
            ],
        ),
        ts.createStringLiteral('\nPassed in value:\n'),
        ts.createCall(
            ts.createPropertyAccess(ts.createIdentifier('JSON'), 'stringify'),
            [],
            [rawArg],
        ),
    );

    const assertIsTypeFunction = ts.createFunctionDeclaration(
        [],
        [],
        undefined,
        assertIsTypeIdentifier,
        [],
        [
            ts.createParameter([], [], undefined, rawArg),
            ts.createParameter([], [], undefined, definitionReferenceArg),
        ],
        undefined,
        ts.createBlock([
            ts.createIf(
                ts.createCall(
                    isTypeIdentifier,
                    [],
                    [rawArg, definitionReferenceArg],
                ),
                ts.createReturn(rawArg),
                ts.createThrow(
                    ts.createNew(validationErrorIdentifier, [], [errorMessage]),
                ),
            ),
        ]),
    );

    return [assertIsTypeFunction, exportAssertIsType];
}
