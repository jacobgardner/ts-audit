import * as path from 'path';
import * as ts from 'typescript';
import { isTypeTheValidateFunction } from '../utils/typeMatch';
import { VALIDATIONS_GENERATED_FILENAME } from '../config';
import { formatNode } from '../utils/printTS';

/*
    This method attempts to find a named import function (e.g.
        `import {namedExport} from 'ts-audit';`) which
    where `namedExport` has the validate function signature.

    If found, it then finds where this source file is relative to
    `runtimeValidations.js` and modifies the original import accordingly
    since the original input pointed to the module and not the generated
    code which is where the function actually exists.
*/
export function transformNamedImport(
    typeChecker: ts.TypeChecker,
    baseDir: string,
    node: ts.ImportDeclaration,
    namedBindings: ts.NamedImports,
    isTsNode: boolean,
): ts.Node {
    const isTsAudit = node.moduleSpecifier.getText().includes('ts-audit');

    for (const element of namedBindings.elements) {
        const type = typeChecker.getTypeAtLocation(element);

        if (
            isTypeTheValidateFunction(type) ||
            (isTsNode &&
                isTsAudit &&
                type &&
                (type as any).intrinsicName === 'error') // TODO: This occurs with ts-node for some reason.  Investigate
        ) {
            const sourceDir = path.dirname(
                path.normalize(node.getSourceFile().fileName),
            );
            const relative = path.relative(sourceDir, baseDir);

            return ts.updateImportDeclaration(
                node,
                node.decorators,
                node.modifiers,
                node.importClause,
                ts.createLiteral(
                    `${relative}/${VALIDATIONS_GENERATED_FILENAME}`,
                ),
            );
        }
    }

    return node;
}
