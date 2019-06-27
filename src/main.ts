import * as ts from 'typescript';
import * as util from 'util';
import { astFormatter } from './formatter';
import * as path from 'path';
import { validateInterface } from '..';
import { SchemaDB } from './schemaDB';
import colors from 'colors';
import { log } from './logger';
import { formatNode } from './printTS';

import * as schema from 'ts-json-schema-generator';
import { StringMap, Definition, DefinitionType } from 'ts-json-schema-generator';

const RUNTIME_CHECK_SYMBOL = '_RUNTIME_CHECK_ANY';

interface ErrorData {
    file: string;
    line: number;
    character: number;
    message: string;
}

export const errors: ErrorData[] = [];

function isTransformable(filename: string) {
    return !filename.endsWith('.d.ts') && (filename.endsWith('.ts') || filename.endsWith('.tsx'));
}

export default function transformer(program: ts.Program, config: any) {
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
                        `Error [runtime-check transform]: ${message} occured in ${file}, Line: ${line}:${character}`
                );

                throw lines.join('\n');
            } else {
                transformer.dumpSchemas();
            }
        }

        return finalNode;
    };
}

class TransformClass {
    private schemaDb: SchemaDB;
    private typeChecker: ts.TypeChecker;

    constructor(private program: ts.Program) {
        this.schemaDb = new SchemaDB(program, '.');
        this.typeChecker = program.getTypeChecker();
    }

    dumpSchemas() {
        const { outDir = '.', outFile, target = ts.ScriptTarget.ES3 } = this.program.getCompilerOptions();

        if (outFile) {
            throw new Error('This does not work with outFile in tsconfig');
        }

        let sourceFile = ts.createSourceFile(
            path.join(this.program.getCurrentDirectory(), outDir, 'runTimeValidations.js'),
            '',
            target,
            undefined,
            ts.ScriptKind.JS
        );

        const schemasVariable = ts.createIdentifier('schemas');

        const schemaPropertyAssignments: ts.PropertyAssignment[] = [];

        const schema = {
            $schema: 'http://json-schema.org/draft-07/schema#',
            definitions: this.schemaDb.dump()
        };

        log(colors.underline(colors.rainbow('SCHEMA')));
        log(util.inspect(schema, false, 1000, true));

        const schemaNode = ts.createVariableStatement(
            [],
            [
                ts.createVariableDeclaration(
                    schemasVariable,
                    undefined,
                    ts.createObjectLiteral([...schemaPropertyAssignments])
                )
            ]
        );

        sourceFile = ts.updateSourceFileNode(sourceFile, [
            schemaNode,
            ts.createFunctionDeclaration(
                [],
                [],
                undefined,
                'validateInterface',
                [],
                [ts.createParameter([], [], undefined, 'raw'), ts.createParameter([], [], undefined, 'interfaceId')],
                undefined,
                ts.createBlock([])
            )
        ]);

        const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
        const result = printer.printFile(sourceFile);

        ts.sys.writeFile(sourceFile.fileName, result);
    }

    visitNodeAndChildren(node: ts.Node, context: ts.TransformationContext): ts.Node {
        return ts.visitEachChild(
            this.visitNode(node),
            childNode => this.visitNodeAndChildren(childNode, context),
            context
        );
    }

    visitNode(node: ts.Node): ts.Node {
        if (ts.isImportDeclaration(node)) {
            return this.transformImport(node);
        } else if (this.isValidateFunction(node)) {
            const parent = node.parent;

            if (ts.isVariableDeclaration(parent) || ts.isAsExpression(parent)) {
                if (parent.type) {
                    const refType = this.typeChecker.getTypeAtLocation(parent.type);

                    return this.transformNode(node, parent.type, refType);
                } else {
                    // TODO: Build Error
                    console.log('No associated variable type');
                }
            } else if (ts.isBinaryExpression(parent)) {
                // TODO: Implement other types

                if (parent.operatorToken.kind !== ts.SyntaxKind.EqualsToken) {
                    throw new Error('Was expecting assignment');
                }

                let assignedNode = parent.left;

                const refType = this.typeChecker.getTypeAtLocation(assignedNode);

                const typeNode = this.typeChecker.typeToTypeNode(refType);

                if (ts.isIdentifier(assignedNode)) {
                    const sym = this.typeChecker.getSymbolAtLocation(assignedNode);
                    if (!sym) {
                        throw new Error('lsdkfjalkf');
                    }

                    // log(util.inspect(sym.valueDeclaration, false, 2, true));
                    if (ts.isVariableDeclaration(sym.valueDeclaration)) {
                        const type = sym.valueDeclaration.type;
                        log(colors.rainbow('TYPE'));
                        log(formatNode(type));

                        if (!type) {
                            throw new Error('ldfkasjl');
                        }

                        return this.transformNode(node, type, refType);
                    }
                }

                // log(util.inspect(assignedNode, false, 2, true));
                // log(formatNode(assignedNode, 4));
                // log(typeNode);

                if (!typeNode || 1) {
                    throw new Error('sadlfkjadsf');
                }

                return this.transformNode(node, typeNode, refType);
            } else if (ts.isExpressionStatement(parent)) {
                return error(node, 'Standalone expression statements are not supported');
            }
        }

        return node;
    }

    transformImport(node: ts.ImportDeclaration) {
        if (!node.importClause) {
            return node;
        }

        const { namedBindings, name } = node.importClause;

        // parser.createType(node, new schema.Context());

        // const formatter = schema.createFormatter();
        // formatter.getDefinition()

        // const generator = new schema.SchemaGenerator(program, parser, formatter);

        if (namedBindings) {
            if (ts.isNamespaceImport(namedBindings)) {
                // * as something
            } else {
                // {namedImports}
                for (const element of namedBindings.elements) {
                    const type = this.typeChecker.getTypeAtLocation(element);

                    // console.log(astFormatter(node));

                    if (!type.symbol) {
                        return node;
                    }

                    // ts.createIdentifier('flkadj')

                    // const importDeclaration = ts.createImportDeclaration(
                    //             undefined,
                    //             undefined,
                    //             // undefined,
                    //             ts.createImportClause(
                    //                 validator,
                    //                 undefined,
                    //                 // ts.createNamedImports([ts.createImportSpecifier(validator, validator)])
                    //             ),
                    //             ts.createLiteral('./runtimeValidations')
                    //         );

                    const declaration = type.symbol.declarations[0];
                    if (ts.isFunctionDeclaration(declaration)) {
                        if (declaration.type && isRuntimeChecker(declaration.type)) {
                            return ts.updateImportDeclaration(
                                node,
                                node.decorators,
                                node.modifiers,

                                node.importClause,
                                ts.createLiteral('./runTimeValidations')
                            );
                            // return importDeclaration;
                        }
                    }
                }
            }
        }

        if (name) {
            // defaultImport
        }

        return node;
    }

    isValidateFunction(node: ts.Node): node is ts.CallExpression {
        if (ts.isCallExpression(node)) {
            const t = this.typeChecker.getTypeAtLocation(node.expression);
            const declaration = t.symbol.declarations[0];
            if (ts.isFunctionDeclaration(declaration)) {
                return (declaration.type && isRuntimeChecker(declaration.type)) || false;
            }
        }

        return false;
    }

    transformNode(node: ts.CallExpression, typeNode: ts.TypeNode, type: ts.Type) {
        if (!type) {
            throw new Error('wat');
        }

        if (!type.symbol) {
            console.error('No data associated with node');
            return ts.createCall(
                ts.createPropertyAccess(ts.createIdentifier('console'), 'log'),
                [],
                [ts.createStringLiteral('This line is fucked')]
            );
        }

        const defn = this.schemaDb.addSchema(typeNode);

        return ts.updateCall(node, node.expression, node.typeArguments, [
            ...node.arguments,
            // TODO: Fix this output
            ts.createLiteral(JSON.stringify(defn))
        ]);
    }
}

function isRuntimeChecker(type: ts.TypeNode) {
    return (
        ts.isTypeReferenceNode(type) &&
        ts.isIdentifier(type.typeName) &&
        type.typeName.escapedText === RUNTIME_CHECK_SYMBOL
    );
}

function error(node: ts.Node, message: string): ts.Node {
    const sourceFile = node.getSourceFile();

    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.pos);

    errors.push({
        file: sourceFile.fileName,
        line: line + 1,
        character,
        message
    });

    const newError = ts.createNew(ts.createIdentifier('Error'), [], [ts.createStringLiteral(message)]);

    // TODO: Figure out why createThrow doesn't want to work;
    // const throwNode = ts.createThrow(newError)
    // // printNode(throwNode);
    // const throwNode = ts.createNode(ts.SyntaxKind.ThrowStatement);
    // if (ts.isThrowStatement(throwNode)) {
    //     throwNode.expression = newError;
    // }
    return newError;
}
