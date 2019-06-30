import * as ts from 'typescript';
import * as path from 'path';
import { SchemaDB } from './schemaDB';
import pjson from 'pjson';
import { assertExists } from './assert';
import { convertObjToAST, isRuntimeChecker, addChain } from './utils';
import { errors, emitErrorFromNode } from './errors';
import { MULTILINE_LITERALS } from './config';

const INTERFACE_ASSERTION_NAME = 'validateInterface';

class TransformClass {
    private schemaDb: SchemaDB;
    private typeChecker: ts.TypeChecker;

    public constructor(private program: ts.Program) {
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
            throw new Error('This does not work with outFile in tsconfig...');
        }

        let sourceFile = ts.createSourceFile(
            path.join(
                this.program.getCurrentDirectory(),
                outDir,
                'runTimeValidations.js',
            ),
            '',
            target,
            undefined,
            ts.ScriptKind.TS,
        );

        const schema = {
            $id: 'root',
            $schema: 'http://json-schema.org/draft-07/schema#',
            definitions: this.schemaDb.dump(),
        };

        const ajvClass = ts.createIdentifier('Validator');
        const ajvInstance = ts.createIdentifier('validator');

        // TODO: Check tsconfig to see if we should be using require or import
        // in final version.
        const validateImport = ts.createVariableStatement(
            [],
            [
                ts.createVariableDeclaration(
                    ajvClass,
                    undefined,
                    ts.createCall(
                        ts.createIdentifier('require'),
                        [],
                        [ts.createStringLiteral('ajv')],
                    ),
                ),
            ],
        );

        // const validateImportV2 = ts.createImportDeclaration(
        //     [],
        //     [],
        //     ts.createImportClause(ajvClass, undefined),
        //     ts.createStringLiteral('ajv')
        // );

        const ajvInit = ts.createVariableStatement(
            [],
            [
                ts.createVariableDeclaration(
                    ajvInstance,
                    undefined,
                    ts.createNew(
                        ajvClass,
                        [],
                        [
                            ts.createObjectLiteral(
                                [
                                    ts.createPropertyAssignment(
                                        'schemas',
                                        ts.createArrayLiteral([
                                            convertObjToAST(schema),
                                        ]),
                                    ),
                                ],
                                MULTILINE_LITERALS,
                            ),
                        ],
                    ),
                ),
            ],
        );

        const exportValidate = ts.createStatement(
            ts.createAssignment(
                ts.createPropertyAccess(
                    ts.createIdentifier('exports'),
                    INTERFACE_ASSERTION_NAME,
                ),
                ts.createIdentifier(INTERFACE_ASSERTION_NAME),
            ),
        );

        const rawArg = ts.createIdentifier('raw');
        const definitionReferenceArg = ts.createIdentifier(
            'definitionReference',
        );

        const validateStatement = ts.createCall(
            ts.createPropertyAccess(ajvInstance, 'validate'),
            [],
            [definitionReferenceArg, rawArg],
        );

        const validateInterfaceFunction = ts.createFunctionDeclaration(
            [],
            [],
            undefined,
            INTERFACE_ASSERTION_NAME,
            [],
            [
                ts.createParameter([], [], undefined, rawArg),
                ts.createParameter([], [], undefined, definitionReferenceArg),
            ],
            undefined,
            ts.createBlock([
                ts.createIf(
                    validateStatement,
                    ts.createReturn(rawArg),
                    ts.createThrow(
                        ts.createNew(
                            ts.createIdentifier('Error'),
                            [],
                            [
                                addChain(
                                    ts.createStringLiteral(
                                        'Validation Failure: ',
                                    ),
                                    ts.createCall(
                                        ts.createPropertyAccess(
                                            ajvInstance,
                                            'errorsText',
                                        ),
                                        [],
                                        [],
                                    ),
                                    ts.createStringLiteral('\n'),
                                    ts.createCall(
                                        ts.createPropertyAccess(
                                            ts.createIdentifier('JSON'),
                                            'stringify',
                                        ),
                                        [],
                                        [
                                            ts.createPropertyAccess(
                                                ajvInstance,
                                                'errors',
                                            ),
                                            ts.createNull(),
                                            ts.createStringLiteral('  '),
                                        ],
                                    ),
                                    ts.createStringLiteral(
                                        '\nPassed in value:\n',
                                    ),
                                    ts.createCall(
                                        ts.createPropertyAccess(
                                            ts.createIdentifier('JSON'),
                                            'stringify',
                                        ),
                                        [],
                                        [rawArg],
                                    ),
                                ),
                            ],
                        ),
                    ),
                ),
            ]),
        );

        sourceFile = ts.updateSourceFileNode(sourceFile, [
            validateImport,
            ajvInit,
            validateInterfaceFunction,
            exportValidate,
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
                            return ts.updateImportDeclaration(
                                node,
                                node.decorators,
                                node.modifiers,

                                node.importClause,
                                ts.createLiteral('./runTimeValidations'),
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

function isTransformable(filename: string): boolean {
    return (
        !filename.endsWith('.d.ts') &&
        (filename.endsWith('.ts') || filename.endsWith('.tsx'))
    );
}

export default function transformer(program: ts.Program /*, config: Config*/) {
    const filesToTransform = program
        .getSourceFiles()
        .map(sourceFile => sourceFile.fileName)
        .filter(isTransformable);

    let filesRemaining = filesToTransform.length;
    const transformer = new TransformClass(program);

    return (context: ts.TransformationContext) => (file: ts.SourceFile) => {
        const finalNode = transformer.visitNodeAndChildren(file, context);
        filesRemaining -= 1;

        if (filesRemaining === 0) {
            if (errors.length) {
                const lines = errors.map(
                    ({ message, file, line, character }) =>
                        `Error [runtime-check transform]: ${message}. This error occured in ${file}, Line: ${line}:${character}`,
                );

                throw lines.join('\n');
            } else {
                transformer.dumpSchemas();
            }
        }

        return finalNode;
    };
}
