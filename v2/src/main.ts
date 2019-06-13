import * as ts from 'typescript';
import * as util from 'util';

const RUNTIME_CHECK_SYMBOL = '_RUNTIME_CHECK_ANY';

export function validateInterface(data: unknown): any {}

export default function transformer(program: ts.Program, config: any) {
    console.log(config);
    return (context: ts.TransformationContext) => (file: ts.SourceFile) => visitNodeAndChildren(file, program, context);
}

function visitNodeAndChildren(node: ts.Node, program: ts.Program, context: ts.TransformationContext): ts.Node {
    return ts.visitEachChild(
        visitNode(node, program),
        (childNode) => visitNodeAndChildren(childNode, program, context),
        context
    );
}

function visitNode(node: ts.Node, program: ts.Program): ts.Node {
    const typeChecker = program.getTypeChecker();

    if (isValidateFunction(typeChecker, node)) {
        if (ts.isVariableDeclaration(node.parent)) {
            const parent = node.parent;

            console.log(parent);
        }
    }

    return node;
}

function isValidateFunction(typeChecker: ts.TypeChecker, node: ts.Node) {
    if (ts.isCallExpression(node)) {
        const t = typeChecker.getTypeAtLocation(node.expression);
        const declaration = t.symbol.declarations[0];
        if (ts.isFunctionLike(declaration)) {
            if (
                declaration.type &&
                ts.isTypeReferenceNode(declaration.type) &&
                ts.isIdentifier(declaration.type.typeName)
            ) {
                return declaration.type.typeName.escapedText === RUNTIME_CHECK_SYMBOL;
            }
        }
    }

    return false;
}
