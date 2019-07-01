import * as ts from 'typescript';
import { assertExists } from '../utils/assert';
import { convertObjToAST } from '../utils/exportAst';
import { emitErrorFromNode } from '../errors';
import { JSONSchema7 } from 'json-schema';
import { ROOT_SCHEMA_ID } from '../config';
import { SchemaDB } from '../schemaDB';

/*
    This is what ultimates converts the pseudo-function call with the type
    information into the call we use at runtime which references the schema.
*/
function transformValidateCallToRuntimeForm(
    schemaDb: SchemaDB,
    node: ts.CallExpression,
    typeNode: ts.TypeNode,
    type: ts.Type,
) {
    assertExists(
        type,
        "This was null at some point during development, even though it's typed as required.",
    );

    // NOTE: This is undefined when the type is a primitive OR union/intersection
    if (!type.symbol) {
        return emitErrorFromNode(
            node,
            'The type associated with this variable cannot currently be validated. Make sure you are performing this operation on interface or enum',
        );
    }

    const definition = schemaDb.addSchema(typeNode);
    const referenceSchema: JSONSchema7 = {
        $ref: `${ROOT_SCHEMA_ID}${definition['$ref']}`,
    };

    return ts.updateCall(node, node.expression, node.typeArguments, [
        ...node.arguments,
        convertObjToAST(referenceSchema),
    ]);
}

/*
    The three functions below work to find the appropriate type to pass to
    the function above which ultimately transforms it.  The type is stored
    differently for various declaration formats, so we have to approach it
    different ways depending on the kind of node is is.
*/

export function transformValidationCallFromGeneric(
    typeChecker: ts.TypeChecker,
    schemaDb: SchemaDB,
    node: ts.CallExpression,
) {
    const [arg] = assertExists(
        node.typeArguments,
        'This should be called after we already checked if this existed.',
    );

    const refType = typeChecker.getTypeFromTypeNode(arg);

    return transformValidateCallToRuntimeForm(schemaDb, node, arg, refType);
}

export function transformValidationCallFromExplicitType(
    typeChecker: ts.TypeChecker,
    schemaDb: SchemaDB,
    node: ts.CallExpression,
    containingExpression:
        | ts.AsExpression
        | ts.VariableDeclaration
        | ts.TypeAssertion,
) {
    if (containingExpression.type) {
        const refType = typeChecker.getTypeAtLocation(
            containingExpression.type,
        );

        return transformValidateCallToRuntimeForm(
            schemaDb,
            node,
            containingExpression.type,
            refType,
        );
    } else {
        return emitErrorFromNode(
            node,
            'No type was found to be associated with variable; make sure type is annotated',
        );
    }
}

export function transformValidationCallFromAssignment(
    typeChecker: ts.TypeChecker,
    schemaDb: SchemaDB,
    node: ts.CallExpression,
    containingExpression: ts.BinaryExpression,
) {
    if (containingExpression.operatorToken.kind !== ts.SyntaxKind.EqualsToken) {
        return emitErrorFromNode(node, 'Was expecting assignment here.');
    }

    const assignedNode = containingExpression.left;
    const refType = typeChecker.getTypeAtLocation(assignedNode);

    if (ts.isIdentifier(assignedNode)) {
        const sym = typeChecker.getSymbolAtLocation(assignedNode);

        if (!sym) {
            // TODO: This error makes no sense to a user
            return emitErrorFromNode(
                node,
                'A symbol must be attached to an assigned node',
            );
        }

        if (ts.isVariableDeclaration(sym.valueDeclaration)) {
            const type = sym.valueDeclaration.type;

            if (!type) {
                return emitErrorFromNode(
                    node,
                    'Type must exist on variable declaration node',
                );
            }

            return transformValidateCallToRuntimeForm(
                schemaDb,
                node,
                type,
                refType,
            );
        }

        return emitErrorFromNode(
            node,
            'Value declaration of assignment must be a variable declaration',
        );
    }

    return emitErrorFromNode(node, 'Assigned Node must be an identifier');
}
