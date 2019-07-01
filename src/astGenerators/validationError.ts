import * as ts from 'typescript';
import { MULTILINE_LITERALS, VALIDATION_ERROR_NAME } from '../config';

// TODO: Add import for `ts-audit/validationError` so we can use the actual
// package and not have to generate this code.  Seems safer and easier to
// reference.

/*

This roughly generates:

function ValidationError(message) {
    this.name = "ValidationError";
    this.message = message;
    this.validationError = true;
    this.stack = new Error(message).stack;
}
ValidationError.prototype = new Error;
exports.ValidationError = ValidationError;

*/
export function generateValidationError() {
    const exportValidationError = ts.createStatement(
        ts.createAssignment(
            ts.createPropertyAccess(
                ts.createIdentifier('exports'),
                VALIDATION_ERROR_NAME,
            ),
            ts.createIdentifier(VALIDATION_ERROR_NAME),
        ),
    );

    const thisId = ts.createIdentifier('this');
    const messageArg = ts.createIdentifier('message');

    const validationError = ts.createFunctionDeclaration(
        [],
        [],
        undefined,
        VALIDATION_ERROR_NAME,
        [],
        [ts.createParameter([], [], undefined, messageArg)],
        undefined,
        ts.createBlock(
            [
                ts.createStatement(
                    ts.createAssignment(
                        ts.createPropertyAccess(thisId, 'name'),
                        ts.createStringLiteral(VALIDATION_ERROR_NAME),
                    ),
                ),
                ts.createStatement(
                    ts.createAssignment(
                        ts.createPropertyAccess(thisId, 'message'),
                        messageArg,
                    ),
                ),
                ts.createStatement(
                    ts.createAssignment(
                        ts.createPropertyAccess(thisId, 'validationError'),
                        ts.createTrue(),
                    ),
                ),
                ts.createStatement(
                    ts.createAssignment(
                        ts.createPropertyAccess(thisId, 'stack'),
                        ts.createPropertyAccess(
                            ts.createNew(
                                ts.createIdentifier('Error'),
                                [],
                                [messageArg],
                            ),
                            'stack',
                        ),
                    ),
                ),
            ],
            MULTILINE_LITERALS,
        ),
    );

    const errorPrototypeExtend = ts.createStatement(
        ts.createAssignment(
            ts.createPropertyAccess(
                ts.createIdentifier(VALIDATION_ERROR_NAME),
                'prototype',
            ),
            ts.createNew(ts.createIdentifier('Error'), [], undefined),
        ),
    );

    return [validationError, errorPrototypeExtend, exportValidationError];
}
