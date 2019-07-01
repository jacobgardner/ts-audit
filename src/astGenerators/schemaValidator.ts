import * as ts from 'typescript';
import { addChain, convertObjToAST } from '../utils';
import {
    INTERFACE_ASSERTION_NAME,
    MULTILINE_LITERALS,
    ROOT_SCHEMA_ID,
} from '../config';
import { JSONSchema7 } from 'json-schema';

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
function validateInterface(raw, definitionReference) {
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

export function generateSchemaValidator(
    schemaDefinitions: Record<string, JSONSchema7>,
) {
    const schema = {
        $id: ROOT_SCHEMA_ID,
        $schema: 'http://json-schema.org/draft-07/schema#',
        definitions: schemaDefinitions,
    };

    const ajvClass = ts.createIdentifier('Validator');
    const ajvInstance = ts.createIdentifier('validator');

    // TODO: Check tsconfig to see if we should be using require or import
    // in final version.
    const validateImport = ts.createVariableStatement(
        [],
        [
            ts.createVariableDeclaration(
                ajvClass,
                undefined,
                ts.createCall(
                    ts.createIdentifier('require'),
                    [],
                    [ts.createStringLiteral('ajv')],
                ),
            ),
        ],
    );

    // const validateImportV2 = ts.createImportDeclaration(
    //     [],
    //     [],
    //     ts.createImportClause(ajvClass, undefined),
    //     ts.createStringLiteral('ajv')
    // );

    const ajvInit = ts.createVariableStatement(
        [],
        [
            ts.createVariableDeclaration(
                ajvInstance,
                undefined,
                ts.createNew(
                    ajvClass,
                    [],
                    [
                        ts.createObjectLiteral(
                            [
                                ts.createPropertyAssignment(
                                    'schemas',
                                    ts.createArrayLiteral([
                                        convertObjToAST(schema),
                                    ]),
                                ),
                            ],
                            MULTILINE_LITERALS,
                        ),
                    ],
                ),
            ),
        ],
    );

    const exportValidate = ts.createStatement(
        ts.createAssignment(
            ts.createPropertyAccess(
                ts.createIdentifier('exports'),
                INTERFACE_ASSERTION_NAME,
            ),
            ts.createIdentifier(INTERFACE_ASSERTION_NAME),
        ),
    );

    const rawArg = ts.createIdentifier('raw');
    const definitionReferenceArg = ts.createIdentifier('definitionReference');

    const validateStatement = ts.createCall(
        ts.createPropertyAccess(ajvInstance, 'validate'),
        [],
        [definitionReferenceArg, rawArg],
    );

    const validateInterfaceFunction = ts.createFunctionDeclaration(
        [],
        [],
        undefined,
        INTERFACE_ASSERTION_NAME,
        [],
        [
            ts.createParameter([], [], undefined, rawArg),
            ts.createParameter([], [], undefined, definitionReferenceArg),
        ],
        undefined,
        ts.createBlock([
            ts.createIf(
                validateStatement,
                ts.createReturn(rawArg),
                ts.createThrow(
                    ts.createNew(
                        ts.createIdentifier('ValidationError'),
                        [],
                        [
                            addChain(
                                ts.createStringLiteral('Validation Failure: '),
                                ts.createCall(
                                    ts.createPropertyAccess(
                                        ajvInstance,
                                        'errorsText',
                                    ),
                                    [],
                                    [],
                                ),
                                ts.createStringLiteral('\n'),
                                ts.createCall(
                                    ts.createPropertyAccess(
                                        ts.createIdentifier('JSON'),
                                        'stringify',
                                    ),
                                    [],
                                    [
                                        ts.createPropertyAccess(
                                            ajvInstance,
                                            'errors',
                                        ),
                                        ts.createNull(),
                                        ts.createStringLiteral('  '),
                                    ],
                                ),
                                ts.createStringLiteral('\nPassed in value:\n'),
                                ts.createCall(
                                    ts.createPropertyAccess(
                                        ts.createIdentifier('JSON'),
                                        'stringify',
                                    ),
                                    [],
                                    [rawArg],
                                ),
                            ),
                        ],
                    ),
                ),
            ),
        ]),
    );

    return [validateImport, ajvInit, validateInterfaceFunction, exportValidate];
}
