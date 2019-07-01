import * as path from 'path';
import * as ts from 'typescript';
import { ROOT_SCHEMA_ID, TYPE_ASSERTION_NAME } from './config';
import { assertExists } from './utils/assert';
import { convertObjToAST } from './utils/exportAst';
import { emitErrorFromNode } from './errors';
import { generateAssertIsTypeFn } from './astGenerators/assertIsType';
import { generateIsTypeFn } from './astGenerators/isType';
import { generateSchemaBoilerplate } from './astGenerators/schemaBoilerplate';
import { generateValidationError } from './astGenerators/validationError';
import { isRuntimeChecker } from './utils/typeMatch';
import { JSONSchema7 } from 'json-schema';
import pjson from 'pjson';
import { SchemaDB } from './schemaDB';

// TODO: This can all be broken up/abstracted/fped quite a bit.
// TODO: Organize this better in a way that makes more logical sense

/*
    This is where most of the work occurs for discovering the validation
    functions and converting them to the usable types in the final build.
*/

export class ValidationTransformer {
    private schemaDb: SchemaDB;
    private typeChecker: ts.TypeChecker;

    public constructor(private program: ts.Program, private baseDir: string) {
        this.schemaDb = new SchemaDB(program, '.');
        this.typeChecker = program.getTypeChecker();
    }

    public writeSchemaToFile() {
        const {
            outDir = '.',
            outFile,
            target = ts.ScriptTarget.ES3,
        } = this.program.getCompilerOptions();

        if (outFile) {
            throw new Error(
                `${pjson.name} does not work with outFile in tsconfig. Use a bundler with this transformer to bundle your output.`,
            );
        }

        let fullPath;

        if (path.isAbsolute(outDir)) {
            fullPath = outDir;
        } else {
            fullPath = path.join(this.program.getCurrentDirectory(), outDir);
        }

        let sourceFile = ts.createSourceFile(
            path.join(fullPath, 'runTimeValidations.js'),
            '',
            target,
            undefined,
            ts.ScriptKind.TS,
        );

        sourceFile = ts.updateSourceFileNode(sourceFile, [
            ...generateSchemaBoilerplate(this.schemaDb.dump()),
            ...generateIsTypeFn(),
            ...generateAssertIsTypeFn(),
            ...generateValidationError(),
        ]);

        const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
        const result = printer.printFile(sourceFile);

        ts.sys.writeFile(sourceFile.fileName, result);
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
                return this.transformNamedImport(node, namedBindings);
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

            return this.isTypeTheValidateFunction(nodeType);
        }

        return false;
    }

    /*
        This determines if the type passed in corresponds to the validation
        function in our declaration file (index.d.ts).  It performs this check
        by checking if the return value matches the unique name we have given
        the validate function. (See isRuntimeChecker for that part)
    */
    private isTypeTheValidateFunction(nodeType: ts.Type): boolean {
        // valueDeclaration is a reference to the first  line where the node
        // is found in the AST. This  means it is where the node is declared
        // and hopefully typed.  This **SHOULD** be the same as
        // `.declarations[0]`.
        if (!nodeType.symbol) {
            return false;
        }

        // TODO: Figure out why this doesn't work with nodeType.symbol.valueDeclaration....
        const valueDeclaration = nodeType.symbol.declarations[0];

        // TODO: we can unify these two checks more...
        if (ts.isFunctionDeclaration(valueDeclaration)) {
            if (
                valueDeclaration.typeParameters &&
                valueDeclaration.typeParameters.length === 1
            ) {
                const firstTypeParam = valueDeclaration.typeParameters[0];

                if (
                    firstTypeParam.default &&
                    isRuntimeChecker(firstTypeParam.default)
                ) {
                    return true;
                }
            } else if (
                valueDeclaration.type &&
                isRuntimeChecker(valueDeclaration.type)
            ) {
                return true;
            }
        }

        return false;
    }

    /*
        This method attempts to find a named import function (e.g.
            `import {namedExport} from 'ts-audit';`) which
        where `namedExport` has the validate function signature.

        If found, it then finds where this source file is relative to
        `runtimeValidations.js` and modifies the original import accordingly
        since the original input pointed to the module and not the generated
        code which is where the function actually exists.
    */
    private transformNamedImport(
        node: ts.ImportDeclaration,
        namedBindings: ts.NamedImports,
    ): ts.Node {
        for (const element of namedBindings.elements) {
            const type = this.typeChecker.getTypeAtLocation(element);

            if (this.isTypeTheValidateFunction(type)) {
                const sourceDir = path.dirname(
                    path.normalize(node.getSourceFile().fileName),
                );
                const relative = path.relative(sourceDir, this.baseDir);

                return ts.updateImportDeclaration(
                    node,
                    node.decorators,
                    node.modifiers,
                    node.importClause,
                    ts.createLiteral(`${relative}/runTimeValidations`),
                );
            }
        }

        return node;
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
