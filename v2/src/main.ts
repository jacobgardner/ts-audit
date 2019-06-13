import * as ts from 'typescript';
import * as util from 'util';

const RUNTIME_CHECK_SYMBOL = '_RUNTIME_CHECK_ANY';

export const schemas = new Map<ts.Symbol, number>();

export default function transformer(program: ts.Program, config: any) {
    return (context: ts.TransformationContext) => (file: ts.SourceFile) => visitNodeAndChildren(file, program, context);
}

function visitNodeAndChildren(node: ts.Node, program: ts.Program, context: ts.TransformationContext): ts.Node {
    return ts.visitEachChild(
        visitNode(node, program),
        childNode => visitNodeAndChildren(childNode, program, context),
        context
    );
}

function visitNode(node: ts.Node, program: ts.Program): ts.Node {
    const typeChecker = program.getTypeChecker();

    if (isValidateFunction(typeChecker, node)) {
        const parent = node.parent;

        if (ts.isVariableDeclaration(parent) || ts.isAsExpression(parent)) {
            // console.log(parent.type);
            if (parent.type) {
                const refType = typeChecker.getTypeAtLocation(parent.type);

                addSchema(refType.symbol);
                // console.log(refType.symbol);
            } else {
                // TODO: Build Error
                console.log('No associated variable type');
            }
        } else if (ts.isBinaryExpression(node.parent)) {
            // TODO: Implement other types

            console.log('Assignment Probably');
        }
    }

    return node;
}

function isValidateFunction(typeChecker: ts.TypeChecker, node: ts.Node) {
    if (ts.isCallExpression(node)) {
        const t = typeChecker.getTypeAtLocation(node.expression);
        const declaration = t.symbol.declarations[0];
        if (ts.isFunctionDeclaration(declaration)) {
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

function addSchema(symbol: ts.Symbol) {
    const count = schemas.get(symbol) || 0;
    schemas.set(symbol, count + 1);

}
