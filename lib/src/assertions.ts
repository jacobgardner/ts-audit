import * as ts from 'typescript';

export function assertHeritageExtends(node: ts.InterfaceDeclaration) {
    if (node.heritageClauses) {
        if (node.heritageClauses.length !== 1 || node.heritageClauses[0].token !== ts.SyntaxKind.ExtendsKeyword) {
            throw new Error("There should only be 1 heritage clause and it should be 'extends'");
        }
    }
}

export function assertKind(node: ts.Node, kind: ts.SyntaxKind) {
    if (node.kind !== kind) {
        throw new Error(`Expected node kind to be ${ts.SyntaxKind[kind]}, but found ${ts.SyntaxKind[node.kind]}`);
    }
}

export function assertExists<T>(obj: T, message: string): Exclude<T, undefined | null> {
    if (obj == null) {
        throw new Error(`Expected an object to exist where it did not. ${message}`);
    }

    return obj as Exclude<T, undefined | null>;
}

// DEPRECATED: Removing soon, I think
function isValidated(node: ts.InterfaceDeclaration) {
    assertHeritageExtends(node);
    if (node.heritageClauses) {
        const clause = node.heritageClauses[0];

        for (const clauseType of clause.types) {
            // assertKind(clauseType, ts.SyntaxKind.ExpressionWithTypeArguments);
            if (clauseType.expression.getText() === 'Validity') {
                return true;
            }
        }
    }

    return false;
}
