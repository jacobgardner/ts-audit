import * as ts from 'typescript';
import * as util from 'util';
import { MULTILINE_LITERALS } from './config';
import { addSchema } from './schemaDB';
import { hideSymbol, hideNode, hide, parseTypeFlags, parseSymbolFlags } from './utils';
import colors from 'colors';
import { formatNode } from './printTS';
import { type } from 'os';
import { log } from './logger';

enum MatcherType {
    Interface = 'interface',
    String = 'string',
    Boolean = 'boolean',
    Number = 'number',
    Array = 'array',
    OneOf = 'oneof',
    Ref = 'ref'
}

interface TypeDetails {
    // type: MatcherType;
    isRequired?: boolean;
    [key: string]: any;
}

function buildSchemaFromSymbol(symbol: ts.Symbol, typeChecker: ts.TypeChecker): TypeDetails {
    const output: Record<string, TypeDetails> = {};
    const { exports, members } = symbol;
    // log(formatNode(symbol));
    // log(parseSymbolFlags(symbol));

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

                // log('While we do support non-initialized enums, we do not recommend it for APIs');
                values.push(currentIndex);
            }

            if (currentIndex !== undefined) {
                currentIndex += 1;
            }
        });

        return {
            type: MatcherType.OneOf,
            subType: values
        };
    } else if (symbol.getFlags() & ts.SymbolFlags.Interface) {
        if (!members) {
            throw new Error('No members associated with interface symbol');
        }

        log(colors.rainbow('====================================='));

        members.forEach((value, key) => {
            // value.declarations.forEach(value => {
            //     log(`${key} - ${ts.SyntaxKind[value.kind]}`);
            // });

            // log(colors.underline(colors.red(key.toString())));
            // log(formatNode(symbol.declarations, 4));

            if (value.declarations.length !== 1) {
                throw new Error('Did not expect more than 1 declaration');
            }
            output[key.toString()] = buildSchemaFromNode(value.declarations[0], typeChecker);
        });

        return {
            type: MatcherType.Interface,
            members: output
        };
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

    return {
        ...buildSchemaFromTypeNode(type, typeChecker),
        isRequired: !node.questionToken
        // subType: buildSchemaFromNode(type, typeChecker)
    };
}

function buildSchemaFromTypeNode(node: ts.TypeNode, typeChecker: ts.TypeChecker): Omit<TypeDetails, 'isRequired'> {
    switch (node.kind) {
        case ts.SyntaxKind.BooleanKeyword:
            return {
                type: MatcherType.Boolean
            };
        case ts.SyntaxKind.StringKeyword:
            return {
                type: MatcherType.String
            };
        case ts.SyntaxKind.NumberKeyword:
            return {
                type: MatcherType.Number
            };
        case ts.SyntaxKind.TypeReference:
            const type = typeChecker.getTypeFromTypeNode(node) as ts.TypeReference;

            return {
                type: MatcherType.Ref,
                subType: addSchema(node, type)
            };
        case ts.SyntaxKind.ArrayType:
            if (ts.isArrayTypeNode(node)) {
                return {
                    type: MatcherType.Array,
                    subType: buildSchemaFromTypeNode(node.elementType, typeChecker)
                };
            }
        case ts.SyntaxKind.UnionType:
            if (ts.isUnionTypeNode(node)) {
                return {
                    type: MatcherType.OneOf,
                    subType: node.types.map(type => buildSchemaFromTypeNode(type, typeChecker))
                };
            }
        case ts.SyntaxKind.TypeLiteral:
            if (ts.isTypeLiteralNode(node)) {
                const members: Record<string, TypeDetails> = {};

                node.members.forEach(value => {
                    if (!ts.isPropertySignature(value)) {
                        throw new Error('This should be a propertySignature, I think');
                    }

                    members[value.name.getText()] = buildSchemaFromPropertySignature(value, typeChecker);
                });

                return {
                    type: MatcherType.Interface,
                    members
                };
            }
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
        // case ts.SyntaxKind.InterfaceDeclaration:
        //     if (ts.isInterfaceDeclaration(node)) {

        //         return buildSchemaFromInterfaceDeclaration
        //     }
        //     break;
        default:
            throw new Error(`Unable to build schema from ${ts.SyntaxKind[node.kind]}`);
    }

    throw new Error(`Should not have fallen through`);
}

export function buildSchemaFromType(type: ts.Type, typeChecker: ts.TypeChecker): Object {
    if (!type) {
        throw new Error('WHERE TYPE GO?');
    }

    const symbol = type.getSymbol();
    if (symbol) {
        return buildSchemaFromSymbol(symbol, typeChecker);
    } else {
        // TODO: Make this in line with
        if (type.flags & ts.TypeFlags.Boolean) {
            return {
                type: MatcherType.Boolean
            };
        } else if (type.flags & ts.TypeFlags.Number) {
            return {
                type: MatcherType.Number
            };
        }

        throw new Error('No symbol associated with type.');
    }
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
