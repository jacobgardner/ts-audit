import * as ts from 'typescript';
import { ROOT_SCHEMA_ID, TYPE_ASSERTION_NAME } from './config';
import { assertExists } from './utils/assert';
import { convertObjToAST } from './utils/exportAst';
import { emitErrorFromNode } from './errors';
import { isTypeTheValidateFunction } from './utils/typeMatch';
import { JSONSchema7 } from 'json-schema';
import pjson from 'pjson';
import { SchemaDB } from './schemaDB';
import { transformNamedImport } from './transforms/validationImport';
import { writeRuntimeValidatorToFile } from './buildRuntimeValidator';

// TODO: This can all be broken up/abstracted/fped quite a bit.
// TODO: Organize this better in a way that makes more logical sense

/*
    This is where most of the work occurs for discovering the validation
    functions and converting them to the usable types in the final build.
*/
export class ValidationVisitor {
    private schemaDb: SchemaDB;
    private typeChecker: ts.TypeChecker;

    public constructor(private program: ts.Program, private baseDir: string) {
        this.schemaDb = new SchemaDB(program, '.');
        this.typeChecker = program.getTypeChecker();
    }

    public writeRuntimeValidatorToFile() {
        return writeRuntimeValidatorToFile(
            this.program,
            this.schemaDb.getDefinitions(),
        );
    }

    /*
      Just kicks off the recursive node search.
    */
    public visitNodeAndChildren(
        node: ts.Node,
        context: ts.TransformationContext,
    ): ts.Node {
        return ts.visitEachChild(
            this.visitNode(node),
            childNode => this.visitNodeAndChildren(childNode, context),
            context,
        );
    }

    /*
      This function is called recursively for every node in our AST. We use it
       as the gateway to the transformation if necessary. (thanks to visitNodeAndChildren)
    */
    private visitNode(node: ts.Node): ts.Node {
        if (ts.isImportDeclaration(node)) {
            return this.visitImport(node);
        } else if (this.isCallToValidateFunction(node)) {
            return this.visitValidateFunctionCall(node);
        }

        return node;
    }

    private visitValidateFunctionCall(node: ts.CallExpression) {
        const parent = node.parent;

        if (node.typeArguments && node.typeArguments.length) {
            return this.transformValidationCallFromGeneric(node);
        } else if (
            ts.isVariableDeclaration(parent) ||
            ts.isAsExpression(parent) ||
            ts.isTypeAssertion(parent)
        ) {
            // const var: CheckedType = assertIsType({...});
            //  or
            // const var = assertIsType({...}) as CheckedType;
            return this.transformValidationCallFromExplicitType(node, parent);
        } else if (ts.isBinaryExpression(parent)) {
            // const

            return this.transformValidationCallFromAssignment(node, parent);
        }

        // TODO: Implement other types as figured out.
        return emitErrorFromNode(
            node,
            `validationFunction not used in a supported way.  Please see documentation for details on usage`,
        );
    }

    private visitImport(node: ts.ImportDeclaration): ts.Node {
        if (!node.importClause) {
            return node;
        }

        const { namedBindings, name } = node.importClause;

        if (namedBindings) {
            if (ts.isNamespaceImport(namedBindings)) {
                // * as something
                // TODO: Implement
                return emitErrorFromNode(
                    node,
                    `Namespace import is not yet supported.  Please use \`import { ${TYPE_ASSERTION_NAME} } from '${pjson.name}';\``,
                );
            } else {
                // {namedImports}
                return transformNamedImport(
                    this.typeChecker,
                    this.baseDir,
                    node,
                    namedBindings,
                );
            }
        } else if (name) {
            // defaultImport
            // TODO: Implement
            return emitErrorFromNode(
                node,
                `Default import is not yet supported.  Please use \`import { ${TYPE_ASSERTION_NAME} } from '${pjson.name}';\``,
            );
        }

        return node;
    }

    /*
        Checks to see if the call expression matches the validate function call
        signature, so we know if we need to transform it.
    */
    private isCallToValidateFunction(node: ts.Node): node is ts.CallExpression {
        if (ts.isCallExpression(node)) {
            const nodeType = this.typeChecker.getTypeAtLocation(
                node.expression,
            );

            return isTypeTheValidateFunction(nodeType);
        }

        return false;
    }

    /*
        This is what ultimates converts the pseudo-function call with the type
        information into the call we use at runtime which references the schema.
    */
    private transformValidateCallToRuntimeForm(
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

        const definition = this.schemaDb.addSchema(typeNode);
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

    private transformValidationCallFromGeneric(node: ts.CallExpression) {
        const [arg] = assertExists(
            node.typeArguments,
            'This should be called after we already checked if this existed.',
        );

        const refType = this.typeChecker.getTypeFromTypeNode(arg);

        return this.transformValidateCallToRuntimeForm(node, arg, refType);
    }

    private transformValidationCallFromExplicitType(
        node: ts.CallExpression,
        containingExpression:
            | ts.AsExpression
            | ts.VariableDeclaration
            | ts.TypeAssertion,
    ) {
        if (containingExpression.type) {
            const refType = this.typeChecker.getTypeAtLocation(
                containingExpression.type,
            );

            return this.transformValidateCallToRuntimeForm(
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

    private transformValidationCallFromAssignment(
        node: ts.CallExpression,
        containingExpression: ts.BinaryExpression,
    ) {
        if (
            containingExpression.operatorToken.kind !==
            ts.SyntaxKind.EqualsToken
        ) {
            return emitErrorFromNode(node, 'Was expecting assignment here.');
        }

        const assignedNode = containingExpression.left;
        const refType = this.typeChecker.getTypeAtLocation(assignedNode);

        if (ts.isIdentifier(assignedNode)) {
            const sym = this.typeChecker.getSymbolAtLocation(assignedNode);

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

                return this.transformValidateCallToRuntimeForm(
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
}
