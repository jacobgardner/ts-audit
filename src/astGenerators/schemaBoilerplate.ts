import * as ts from 'typescript';
import { MULTILINE_LITERALS, ROOT_SCHEMA_ID } from '../config';
import { convertObjToAST } from '../utils/exportAst';
import { JSONSchema7 } from 'json-schema';

export const ajvClass = ts.createIdentifier('Validator');
export const ajvInstance = ts.createIdentifier('validator');

export function generateSchemaBoilerplate(
    schemaDefinitions: Record<string, JSONSchema7>,
) {
    const schema = {
        $id: ROOT_SCHEMA_ID,
        definitions: schemaDefinitions,
    };

    // TODO: Check tsconfig to see if we should be using require or import
    // in final version.
    const ajvImport = ts.createVariableStatement(
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

    return [ajvImport, ajvInit];
}
