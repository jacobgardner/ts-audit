import * as ts from 'typescript';

export function generateNamedExport(identifier: ts.Identifier) {
    return ts.createStatement(
        ts.createAssignment(
            ts.createPropertyAccess(ts.createIdentifier('exports'), identifier),
            identifier,
        ),
    );
}
