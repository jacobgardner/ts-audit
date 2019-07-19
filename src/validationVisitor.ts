import * as ts from 'typescript';
import {
    transformValidationCallFromAssignment,
    transformValidationCallFromExplicitType,
    transformValidationCallFromGeneric,
} from './transforms/validationCall';
import { emitErrorFromNode } from './errors';
import { isTypeTheValidateFunction } from './utils/typeMatch';
import pjson from 'pjson';
import { SchemaDB } from './schemaDB';
import { transformNamedImport } from './transforms/validationImport';
import { TYPE_ASSERTION_NAME } from './config';
import { writeRuntimeValidatorToFile } from './buildRuntimeValidator';

// TODO: This can all be broken up/abstracted/fped quite a bit.
// TODO: Organize this better in a way that makes more logical sense

function isImportThisModule(node: ts.ImportDeclaration): boolean {
    const { moduleSpecifier } = node;

    if (ts.isStringLiteral(moduleSpecifier)) {
        if (moduleSpecifier.text === pjson.name) {
            return true;
        }
    }

    return false;
}

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
            return transformValidationCallFromGeneric(
                this.typeChecker,
                this.schemaDb,
                node,
            );
        } else if (
            ts.isVariableDeclaration(parent) ||
            ts.isAsExpression(parent) ||
            ts.isTypeAssertion(parent)
        ) {
            // const var: CheckedType = assertIsType({...});
            //  or
            // const var = assertIsType({...}) as CheckedType;
            return transformValidationCallFromExplicitType(
                this.typeChecker,
                this.schemaDb,
                node,
                parent,
            );
        } else if (ts.isBinaryExpression(parent)) {
            // const

            return transformValidationCallFromAssignment(
                this.typeChecker,
                this.schemaDb,
                node,
                parent,
            );
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

                if (isImportThisModule(node)) {
                    // TODO: Implement
                    return emitErrorFromNode(
                        node,
                        `Namespace import is not yet supported.  Please use \`import { ${TYPE_ASSERTION_NAME} } from '${pjson.name}';\``,
                    );
                }

                return node;
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

            // TODO: Add regression tests making sure to test files where other
            // modules are being imported....
            if (isImportThisModule(node)) {
                return emitErrorFromNode(
                    node,
                    `Default import is not yet supported.  Please use \`import { ${TYPE_ASSERTION_NAME} } from '${pjson.name}';\``,
                );
            }

            return node;
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
}
