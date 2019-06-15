import * as ts from 'typescript';
import * as util from 'util';
import { MULTILINE_LITERALS } from './config';
import { addSchema } from './schemaDB';
import { hideSymbol, hideNode, hide } from './utils';
import colors from 'colors';

enum MatcherType {
    String = 'string',
    Array = 'array',
    OneOf = 'oneof',
    Ref = 'ref'
}

interface TypeDetails {
    // type: MatcherType;
    isRequired: boolean;
    [key: string]: any;
}

// type TypeDetails = any;

function buildSchemaFromSymbol(symbol: ts.Symbol, typeChecker: ts.TypeChecker) {
    const output: Record<string, TypeDetails> = {};
    const { exports, members } = symbol;

    if (symbol.getFlags() & ts.SymbolFlags.RegularEnum) {
        if (!exports) {
            throw new Error('No exports associated with enum');
        }

        const values: (string | number)[] = [];

        let currentIndex: number | undefined = 0;

        exports.forEach((value, key) => {
            if (value.declarations.length !== 1) {
                throw new Error('Did not expect more than 1 declaration');
            }
            const enumMember = value.declarations[0];

            if (!ts.isEnumMember(enumMember)) {
                throw new Error('Expected enum member to be enum member');
            }

            const { initializer } = enumMember;

            if (initializer) {
                if (ts.isStringLiteral(initializer)) {
                    values.push(initializer.text);
                    currentIndex = undefined;
                } else if (ts.isNumericLiteral(initializer)) {
                    currentIndex = parseInt(initializer.text);
                    values.push(currentIndex);
                } else {
                    throw new Error('Not yet supported');
                }
            } else {
                if (currentIndex === undefined) {
                    throw new Error('Cannot have automatically indexed element after string');
                }
                values.push(currentIndex);
            }

            if (currentIndex !== undefined) {
                currentIndex += 1;
            }
            // values.push(enumMember.initializer.getText())
        });

        return {
            type: MatcherType.OneOf,
            subType: values
        };

        // console.log(util.inspect(symbol.exports, true, 1, true));
    } else if (symbol.getFlags() & ts.SymbolFlags.Interface) {
        if (!members) {
            throw new Error('No members associated with interface symbol');
        }

        members.forEach((value, key) => {
            if (value.declarations.length !== 1) {
                throw new Error('Did not expect more than 1 declaration');
            }

            console.log(colors.underline(colors.red(key.toString())));
            output[key.toString()] = buildSchemaFromNode(value.declarations[0], typeChecker);
        });
    }

    return output;
}

function buildSchemaFromPropertySignature(node: ts.PropertySignature, typeChecker: ts.TypeChecker): TypeDetails {
    const { type } = node;

    if (!type) {
        throw new Error('Expected property signature to have type');
    }

    if (!ts.isTypeNode(type)) {
        throw new Error('Expected type node to be TypeNode...');
    }
    // console.log(ts.SyntaxKind[node.kind]);
    // console.log(util.inspect(hideNode(node), false, 3, true));

    return {
        ...buildSchemaFromTypeNode(type, typeChecker),
        isRequired: !node.questionToken
        // subType: buildSchemaFromNode(type, typeChecker)
    };
}

function buildSchemaFromTypeNode(node: ts.TypeNode, typeChecker: ts.TypeChecker): Omit<TypeDetails, 'isRequired'> {
    switch (node.kind) {
        case ts.SyntaxKind.StringKeyword:
            return {
                type: MatcherType.String
            };
        case ts.SyntaxKind.TypeReference:
            const type = typeChecker.getTypeFromTypeNode(node);
            return {
                type: MatcherType.Ref,
                subType: addSchema(type)
            };
        case ts.SyntaxKind.ArrayType:
            if (ts.isArrayTypeNode(node)) {
                return {
                    type: MatcherType.Array,
                    subType: buildSchemaFromTypeNode(node.elementType, typeChecker)
                };
            }
        // console.log(util.inspect())
    }

    throw new Error(`Should not have fallen through for ${ts.SyntaxKind[node.kind]}`);
}

function buildSchemaFromNode(node: ts.Node, typeChecker: ts.TypeChecker): TypeDetails {
    const output = {};

    switch (node.kind) {
        case ts.SyntaxKind.PropertySignature:
            if (ts.isPropertySignature(node)) {
                return buildSchemaFromPropertySignature(node, typeChecker);
            }
            break;

        default:
            throw new Error(`Unable to build schema from ${ts.SyntaxKind[node.kind]}`);
    }

    throw new Error(`Should not have fallen through`);
}

export function buildSchemaFromType(type: ts.Type, typeChecker: ts.TypeChecker): Object {
    const obj = {};
    if (!type) {
        throw new Error('WHERE TYPE GO?');
    }

    const symbol = type.getSymbol();
    if (symbol) {
        return buildSchemaFromSymbol(symbol, typeChecker);
    } else {
        throw new Error('No symbol associated with type.');
    }

    // const { members } = symbol;

    // console.log(util.inspect(type, false, 1, true));

    // if (members) {
    //     const properties: ts.PropertyAssignment[] = [];
    //     members.forEach((value, key) => {
    //         properties.push(ts.createPropertyAssignment(key.toString(), buildSchemaNode(value, typeChecker)));

    //         // console.log(util.inspect(value, false, 2, true));
    //     });

    //     return ts.createObjectLiteral(properties, MULTILINE_LITERALS);
    // } else {
    //     // console.log('No Members');
    //     // console.log('-----------------------');
    //     // console.log(util.inspect(symbol, false, 1, true));

    //     if (symbol.declarations.length !== 1) {
    //         throw new Error('I never expected this.');
    //     }

    //     const declaration = symbol.declarations[0];
    //     if (ts.isPropertySignature(declaration)) {
    //         const { type, questionToken } = declaration;

    //         if (type) {
    //             switch (type.kind) {
    //                 case ts.SyntaxKind.StringKeyword:
    //                     return createStringMatcher(!questionToken);
    //                 case ts.SyntaxKind.TypeReference:
    //                     const t = typeChecker.getTypeAtLocation(type);
    //                     const refId = addSchema(t.symbol);

    //                     return createRefTypeMatcher(refId, !questionToken);
    //                 case ts.SyntaxKind.ArrayType:
    //                     if (ts.isArrayTypeNode(type)) {
    //                         const t = typeChecker.getTypeAtLocation(type.elementType);
    //                         // console.log(util.inspect(t, false, 1, true));
    //                         // console.log('-----------------------------------------');
    //                         // console.log(util.inspect(type, false, 1, true));
    //                         const refId = addSchema(t.symbol);
    //                         // const types = buildSchemaNode(t.symbol, typeChecker);
    //                         // console.log(types);

    //                         return createArrayMatcher(refId, !questionToken);
    //                     }
    //                 default:
    //                     console.error(`No Handler defined for ${ts.SyntaxKind[type.kind]}`);
    //                     break;
    //             }
    //         } else {
    //             return ts.createLiteral('No type of type reference');
    //         }
    //     } else {
    //         console.log(util.inspect(declaration, false, 1, true));

    //         return ts.createLiteral('Not a property signature');
    //     }
    // }

    return obj;
}

interface TypeMatcherOptions {
    subType?: number | ts.Expression;
}

function createTypeMatcher(type: MatcherType, isRequired: boolean, { subType }: TypeMatcherOptions = {}) {
    const properties = [
        ts.createPropertyAssignment('type', ts.createStringLiteral(type)),
        ts.createPropertyAssignment('required', isRequired ? ts.createTrue() : ts.createFalse())
    ];

    if (subType) {
        if (typeof subType === 'number') {
            properties.push(ts.createPropertyAssignment('subType', ts.createNumericLiteral(subType.toString())));
        } else {
            properties.push(ts.createPropertyAssignment('subType', subType));
        }
    }

    return ts.createObjectLiteral(properties, MULTILINE_LITERALS);
}

const createStringMatcher = (isRequired: boolean) => createTypeMatcher(MatcherType.String, isRequired);
const createRefTypeMatcher = (refId: number, isRequired: boolean) =>
    createTypeMatcher(MatcherType.Ref, isRequired, { subType: refId });
const createArrayMatcher = (subType: ts.Expression | number, isRequired: boolean) =>
    createTypeMatcher(MatcherType.Array, isRequired, { subType });
