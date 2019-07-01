import * as path from 'path';
import * as ts from 'typescript';
import { convertObjToAST, isRuntimeChecker } from './utils';
import { assertExists } from './utils/assert';
import { emitErrorFromNode } from './errors';
import { generateSchemaValidator } from './astGenerators/schemaValidator';
import { generateValidationError } from './astGenerators/validationError';
import { INTERFACE_ASSERTION_NAME } from './config';
import pjson from 'pjson';
import { SchemaDB } from './schemaDB';

export class ValidationTransformer {
    private schemaDb: SchemaDB;
    private typeChecker: ts.TypeChecker;

    public constructor(private program: ts.Program, private baseDir: string) {
        this.schemaDb = new SchemaDB(program, '.');
        this.typeChecker = program.getTypeChecker();
    }

    public dumpSchemas() {
        const {
            outDir = '.',
            outFile,
            target = ts.ScriptTarget.ES3,
        } = this.program.getCompilerOptions();

        if (outFile) {
            throw new Error(
                `${pjson.name} does not work with outFile in tsconfig...`,
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
            ...generateSchemaValidator(this.schemaDb.dump()),
            ...generateValidationError(),
        ]);

        const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
        const result = printer.printFile(sourceFile);

        ts.sys.writeFile(sourceFile.fileName, result);
    }

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

    public visitNode(node: ts.Node): ts.Node {
        if (ts.isImportDeclaration(node)) {
            return this.transformImport(node);
        } else if (this.isValidateFunction(node)) {
            const parent = node.parent;

            if (node.typeArguments && node.typeArguments.length) {
                const [arg] = node.typeArguments;

                const refType = this.typeChecker.getTypeFromTypeNode(arg);

                return this.transformNode(node, arg, refType);
            } else if (
                ts.isVariableDeclaration(parent) ||
                ts.isAsExpression(parent)
            ) {
                if (parent.type) {
                    const refType = this.typeChecker.getTypeAtLocation(
                        parent.type,
                    );

                    return this.transformNode(node, parent.type, refType);
                } else {
                    return emitErrorFromNode(
                        node,
                        'No type was found to be associated with variable; make sure type is annotated',
                    );
                }
            } else if (ts.isBinaryExpression(parent)) {
                // TODO: Implement other types

                if (parent.operatorToken.kind !== ts.SyntaxKind.EqualsToken) {
                    throw new Error('Was expecting assignment');
                }

                const assignedNode = parent.left;
                const refType = this.typeChecker.getTypeAtLocation(
                    assignedNode,
                );

                if (ts.isIdentifier(assignedNode)) {
                    const sym = assertExists(
                        this.typeChecker.getSymbolAtLocation(assignedNode),
                        'A symbol must be attached to an assigned node',
                    );

                    if (ts.isVariableDeclaration(sym.valueDeclaration)) {
                        const type = assertExists(
                            sym.valueDeclaration.type,
                            'Type must exist on variable declaration node',
                        );

                        return this.transformNode(node, type, refType);
                    }

                    throw new Error(
                        'Value declaration of assignment must be a variable declaration',
                    );
                }

                throw new Error('Assigned Node must be an identifier');
            } else if (ts.isTypeAssertion(parent)) {
                const { type } = parent;

                const refType = this.typeChecker.getTypeFromTypeNode(type);

                return this.transformNode(node, type, refType);
            }

            return emitErrorFromNode(
                node,
                `validationFunction not used in a supported way.  Please see documentation for details on usage`,
            );
        }

        return node;
    }

    public transformImport(node: ts.ImportDeclaration) {
        if (!node.importClause) {
            return node;
        }

        const { namedBindings, name } = node.importClause;

        if (namedBindings) {
            if (ts.isNamespaceImport(namedBindings)) {
                // * as something
                return emitErrorFromNode(
                    node,
                    `Namespace import is not yet supported.  Please use \`import { ${INTERFACE_ASSERTION_NAME} } from '${pjson.name}';\``,
                );
            } else {
                // {namedImports}
                for (const element of namedBindings.elements) {
                    const type = this.typeChecker.getTypeAtLocation(element);

                    if (!type.symbol) {
                        return node;
                    }

                    const declaration = type.symbol.declarations[0];
                    if (ts.isFunctionDeclaration(declaration)) {
                        if (
                            declaration.type &&
                            isRuntimeChecker(declaration.type)
                        ) {
                            const sourceDir = path.dirname(
                                path.normalize(node.getSourceFile().fileName),
                            );
                            const relative = path.relative(
                                sourceDir,
                                this.baseDir,
                            );

                            return ts.updateImportDeclaration(
                                node,
                                node.decorators,
                                node.modifiers,
                                node.importClause,
                                ts.createLiteral(
                                    `${relative}/runTimeValidations`,
                                ),
                            );
                        }
                    }
                }
            }
        }

        if (name) {
            // defaultImport
            return emitErrorFromNode(
                node,
                `Default import is not yet supported.  Please use \`import { ${INTERFACE_ASSERTION_NAME} } from '${pjson.name}';\``,
            );
        }

        return node;
    }

    public isValidateFunction(node: ts.Node): node is ts.CallExpression {
        if (ts.isCallExpression(node)) {
            const t = this.typeChecker.getTypeAtLocation(node.expression);
            const declaration = t.symbol.declarations[0];
            if (ts.isFunctionDeclaration(declaration)) {
                return (
                    (declaration.type && isRuntimeChecker(declaration.type)) ||
                    false
                );
            }
        }

        return false;
    }

    public transformNode(
        node: ts.CallExpression,
        typeNode: ts.TypeNode,
        type: ts.Type,
    ) {
        assertExists(
            type,
            "This was null at some point during development, even though it's typed as required.",
        );

        if (!type.symbol) {
            return emitErrorFromNode(
                node,
                'The type associated with this variable cannot currently be validated. Make sure you are performing this operation on interface or enum',
            );
        }

        let defn = this.schemaDb.addSchema(typeNode);

        defn = {
            $ref: 'root' + defn['$ref'],
        };

        return ts.updateCall(node, node.expression, node.typeArguments, [
            ...node.arguments,
            convertObjToAST(defn),
        ]);
    }
}
