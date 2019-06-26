import * as ts from 'typescript';
import * as util from 'util';
import { astFormatter } from './formatter';
import * as path from 'path';
import { validateInterface } from '..';
import { buildSchemaFromType } from './schema';
import { schemas, addSchema, schemaList } from './schemaDB';
import colors from 'colors';
import { log } from './logger';
import {formatNode} from './printTS';

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

    return (context: ts.TransformationContext) => (file: ts.SourceFile) => {
        const finalNode = visitNodeAndChildren(file, program, context);
        filesRemaining -= 1;

        if (filesRemaining === 0) {
            if (errors.length) {
                const lines = errors.map(
                    ({ message, file, line, character }) =>
                        `Error [runtime-check transform]: ${message} occured in ${file}, Line: ${line}:${character}`
                );

                throw lines.join('\n');
            } else {
                dumpSchemas(program);
            }
        }

        return finalNode;
    };
}

function dumpSchemas(program: ts.Program) {
    const { outDir = '.', outFile, target = ts.ScriptTarget.ES3 } = program.getCompilerOptions();
    const typeChecker = program.getTypeChecker();

    if (outFile) {
        throw new Error('This does not work with outFile in tsconfig');
    }

    let sourceFile = ts.createSourceFile(
        path.join(program.getCurrentDirectory(), outDir, 'runTimeValidations.js'),
        '',
        target,
        undefined,
        ts.ScriptKind.JS
    );

    const schemasVariable = ts.createIdentifier('schemas');

    const schemaPropertyAssignments: ts.PropertyAssignment[] = [];
    const schemasById: Record<number, Object> = {};


    while (schemaList.length) {
        const [schemaId, type] = schemaList.pop() as [number, ts.Type];

        log(colors.underline(colors.bold(colors.yellow(`Processing schema ${schemaId}`))));
        log(formatNode(type, 2));

        const schema = buildSchemaFromType(type, typeChecker);

        schemaPropertyAssignments.push(
            ts.createPropertyAssignment(
                ts.createNumericLiteral(schemaId.toString()),
                ts.createLiteral(util.inspect(schema))
            )
        );

        schemasById[schemaId] = schema;
    }

    // console.log(schemas);

    log(colors.underline(colors.zebra('SCHEMAS')));
    log(util.inspect(schemasById, true, 80, true));

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

function visitNodeAndChildren(node: ts.Node, program: ts.Program, context: ts.TransformationContext): ts.Node {
    return ts.visitEachChild(
        visitNode(node, program),
        childNode => visitNodeAndChildren(childNode, program, context),
        context
    );
}

function visitNode(node: ts.Node, program: ts.Program): ts.Node {
    const typeChecker = program.getTypeChecker();

    if (ts.isImportDeclaration(node)) {
        return transformImport(node, program, typeChecker);
    } else if (isValidateFunction(typeChecker, node)) {
        const parent = node.parent;

        if (ts.isVariableDeclaration(parent) || ts.isAsExpression(parent)) {
            if (parent.type) {
                const refType = typeChecker.getTypeAtLocation(parent.type);

                return transformNode(node, refType);
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

            const refType = typeChecker.getTypeAtLocation(assignedNode);

            return transformNode(node, refType);
        } else if (ts.isExpressionStatement(parent)) {
            return error(node, 'Standalone expression statements are not supported');
        }
    }

    return node;
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

function transformImport(node: ts.ImportDeclaration, program: ts.Program, typeChecker: ts.TypeChecker) {
    if (!node.importClause) {
        return node;
    }

    const { namedBindings, name } = node.importClause;

    if (namedBindings) {
        if (ts.isNamespaceImport(namedBindings)) {
            // * as something
        } else {
            // {namedImports}
            for (const element of namedBindings.elements) {
                const type = typeChecker.getTypeAtLocation(element);

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

function isValidateFunction(typeChecker: ts.TypeChecker, node: ts.Node): node is ts.CallExpression {
    if (ts.isCallExpression(node)) {
        const t = typeChecker.getTypeAtLocation(node.expression);
        const declaration = t.symbol.declarations[0];
        if (ts.isFunctionDeclaration(declaration)) {
            return (declaration.type && isRuntimeChecker(declaration.type)) || false;
        }
    }

    return false;
}

function isRuntimeChecker(type: ts.TypeNode) {
    return (
        ts.isTypeReferenceNode(type) &&
        ts.isIdentifier(type.typeName) &&
        type.typeName.escapedText === RUNTIME_CHECK_SYMBOL
    );
}

function transformNode(node: ts.CallExpression, type: ts.Type) {
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

    addSchema(node, type);

    // console.log('---------------------------------');
    // console.log(astFormatter(node));

    return ts.updateCall(node, node.expression, node.typeArguments, [
        ...node.arguments,
        ts.createLiteral(type.symbol.escapedName.toString())
    ]);
    // return node;
    // return ts.createCall(
    //     validator,
    //     // ts.createPropertyAccess(ts.createIdentifier('console'), 'log'),
    //     [],
    //     [
    //         ts.createStringLiteral(`Runtime Validating`),
    //         node.arguments[0],
    //         ts.createStringLiteral(`against ${symbol.escapedName}`)
    //     ]
    // );
}
