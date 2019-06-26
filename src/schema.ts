import * as ts from 'typescript';
import * as util from 'util';
import { MULTILINE_LITERALS } from './config';
import { addSchema } from './schemaDB';
import { hideSymbol, hideNode, hide, parseTypeFlags, parseSymbolFlags, parseObjectFlags } from './utils';
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

interface OneOfType {
    type: MatcherType.OneOf;
    options: (TypeDetails | number | string)[];
}

interface RefType {
    type: MatcherType.Ref;
    subType: number;
}

interface ArrayType {
    type: MatcherType.Array;
    subType: TypeDetails;
}

interface PrimitiveType {
    type: MatcherType.String | MatcherType.Number | MatcherType.Boolean;
}

interface MemberDetails {
    name: string;
    isRequired?: boolean;
    type: TypeDetails;
}

interface InterfaceType {
    type: MatcherType.Interface;
    members: MemberDetails[];
}

type TypeDetails = InterfaceType | PrimitiveType | RefType | ArrayType | OneOfType;

function buildSchemaFromSymbol(symbol: ts.Symbol, typeChecker: ts.TypeChecker): TypeDetails {
    log('------buildSchemaFromSymbol------');

    log(parseSymbolFlags(symbol));
    log(formatNode(symbol, 2));

    const flags = symbol.getFlags();

    if (flags & ts.SymbolFlags.Interface) {
        log(' -- Interface');
        const members: MemberDetails[] = [];

        if (symbol.declarations.length === 0) {
            throw new Error('Expected interface to have at least one declaration');
        }

        for (const declaration of symbol.declarations) {
            if (!ts.isInterfaceDeclaration(declaration)) {
                throw new Error('Expected all declarations to be of type interface');
            }

            for (const member of declaration.members) {
                if (!ts.isPropertySignature(member)) {
                    throw new Error('Expected member to be property signature');
                }

                // log(formatNode(member, 5));

                if (member.type) {
                    log(colors.rainbow(`----- ${ts.SyntaxKind[member.type.kind]} -----`));
                    if (member.type.kind === ts.SyntaxKind.TypeReference) {
                        log(member.name.getText());
                        // log(formatNode(member.type));
                        const type = typeChecker.getTypeFromTypeNode(member.type) as ts.TypeReference;

                        // log(parseSymbolFlags(type.symbol));
                        // log(formatNode(type, 6));

                        // // if (type.target)
                        // log('Object Flags');
                        // log(parseObjectFlags(type.target));

                        if (type.target.symbol.getName() === 'Array') {
                            if (!type.typeArguments) {
                                throw new Error('Expected Array to have type argument');
                            }

                            const t = type.typeArguments[0];

                            members.push({
                                name: member.name.getText(),
                                isRequired: true, // TODO: Implement
                                type: {
                                    type: MatcherType.Array,
                                    subType: {
                                        type: MatcherType.Ref,
                                        subType: addSchema(undefined, t)
                                    }
                                }
                            });

                            continue;
                        }

                        members.push({
                            name: member.name.getText(),
                            type: {
                                type: MatcherType.Ref,
                                subType: addSchema(member.type, type)
                            }
                        });
                    } else if (member.type.kind === ts.SyntaxKind.ArrayType) {
                        if (!ts.isArrayTypeNode(member.type)) {
                            throw new Error('Expected type to be array');
                        }

                        members.push({
                            name: member.name.getText(),
                            isRequired: false,
                            type: {
                                type: MatcherType.Ref,
                                subType: addSchema(
                                    member.type.elementType,
                                    typeChecker.getTypeFromTypeNode(member.type.elementType)
                                )
                            }
                        });
                        // member.type.elementType

                        log(formatNode(member));
                    } else if (member.type.kind === ts.SyntaxKind.StringKeyword) {
                        members.push({
                            name: member.name.getText(),
                            type: {
                                type: MatcherType.String
                            }
                        });
                    } else {
                        throw new Error(`Did not match member type for ${ts.SyntaxKind[member.type.kind]}`);
                    }
                }

                // members.push({

                // });
                // key/type
            }
        }

        return {
            type: MatcherType.Interface,
            members
        };
    } else if (flags & ts.SymbolFlags.RegularEnum) {
        log(' -- Enum');
        log(formatNode(symbol));

        for (const declaration of symbol.declarations) {
            log(formatNode(declaration));

            if (!ts.isEnumDeclaration(declaration)) {
                throw new Error('Expected to be enum declaration');
            }

            const options: Array<string | number> = [];

            let currentIndex: number | undefined = 0;

            for (const enumMember of declaration.members) {
                const { initializer } = enumMember;

                if (initializer) {
                    if (ts.isStringLiteral(initializer)) {
                        options.push(initializer.text);
                        currentIndex = undefined;
                    } else if (ts.isNumericLiteral(initializer)) {
                        currentIndex = parseInt(initializer.text);
                        options.push(currentIndex);
                    } else {
                        throw new Error('Not yet supported');
                    }
                } else {
                    if (currentIndex === undefined) {
                        throw new Error('Cannot have automatically indexed element after string');
                    }

                    // log('While we do support non-initialized enums, we do not recommend it for APIs');
                    options.push(currentIndex);
                }

                if (currentIndex !== undefined) {
                    currentIndex += 1;
                }
            }

            return {
                type: MatcherType.OneOf,
                options
            };
        }
    }

    throw new Error(`No matcher supported for ${parseSymbolFlags(symbol)}`);

    // log(formatNode(symbol));
    // log(parseSymbolFlags(symbol));

    // if (symbol.getFlags() & ts.SymbolFlags.RegularEnum) {
    //     if (!exports) {
    //         throw new Error('No exports associated with enum');
    //     }

    //     const values: (string | number)[] = [];

    //     let currentIndex: number | undefined = 0;

    //     exports.forEach((value, key) => {
    //         if (value.declarations.length !== 1) {
    //             throw new Error('Did not expect more than 1 declaration');
    //         }
    //         const enumMember = value.declarations[0];

    //         if (!ts.isEnumMember(enumMember)) {
    //             throw new Error('Expected enum member to be enum member');
    //         }

    //         const { initializer } = enumMember;

    //         if (initializer) {
    //             if (ts.isStringLiteral(initializer)) {
    //                 values.push(initializer.text);
    //                 currentIndex = undefined;
    //             } else if (ts.isNumericLiteral(initializer)) {
    //                 currentIndex = parseInt(initializer.text);
    //                 values.push(currentIndex);
    //             } else {
    //                 throw new Error('Not yet supported');
    //             }
    //         } else {
    //             if (currentIndex === undefined) {
    //                 throw new Error('Cannot have automatically indexed element after string');
    //             }

    //             // log('While we do support non-initialized enums, we do not recommend it for APIs');
    //             values.push(currentIndex);
    //         }

    //         if (currentIndex !== undefined) {
    //             currentIndex += 1;
    //         }
    //     });

    //     return {
    //         type: MatcherType.OneOf,
    //         subType: values
    //     };
    // } else if (symbol.getFlags() & ts.SymbolFlags.Interface) {
    //     if (!members) {
    //         throw new Error('No members associated with interface symbol');
    //     }

    //     log(colors.rainbow('====================================='));

    //     members.forEach((value, key) => {
    //         // value.declarations.forEach(value => {
    //         //     log(`${key} - ${ts.SyntaxKind[value.kind]}`);
    //         // });

    //         // log(colors.underline(colors.red(key.toString())));
    //         // log(formatNode(symbol.declarations, 4));

    //         if (value.declarations.length !== 1) {
    //             throw new Error('Did not expect more than 1 declaration');
    //         }
    //         output[key.toString()] = buildSchemaFromNode(value.declarations[0], typeChecker);
    //     });

    //     return {
    //         type: MatcherType.Interface,
    //         members: output
    //     };
    // }

    // return output;
}

// function buildSchemaFromPropertySignature(node: ts.PropertySignature, typeChecker: ts.TypeChecker): TypeDetails {
//     const { type } = node;

//     if (!type) {
//         throw new Error('Expected property signature to have type');
//     }

//     if (!ts.isTypeNode(type)) {
//         throw new Error('Expected type node to be TypeNode...');
//     }

//     return {
//         ...buildSchemaFromTypeNode(type, typeChecker),
//         isRequired: !node.questionToken
//         // subType: buildSchemaFromNode(type, typeChecker)
//     };
// }

// function buildSchemaFromTypeNode(node: ts.TypeNode, typeChecker: ts.TypeChecker): Omit<TypeDetails, 'isRequired'> {
//     switch (node.kind) {
//         case ts.SyntaxKind.BooleanKeyword:
//             return {
//                 type: MatcherType.Boolean
//             };
//         case ts.SyntaxKind.StringKeyword:
//             return {
//                 type: MatcherType.String
//             };
//         case ts.SyntaxKind.NumberKeyword:
//             return {
//                 type: MatcherType.Number
//             };
//         case ts.SyntaxKind.TypeReference:
//             const type = typeChecker.getTypeFromTypeNode(node) as ts.TypeReference;
//             // This is all fucky for aliases still

//             if (type.symbol.escapedName === 'Array') {
//                 if (type.typeArguments) {
//                     const typeNode = type.typeArguments[0];

//                     return {
//                         type: MatcherType.Array,
//                         subType: {
//                             type: MatcherType.Ref,
//                             subType: addSchema(undefined, typeNode)
//                         }
//                         // }buildSchemaFromSymbol(type.typeArguments[0].symbol, typeChecker)
//                     };
//                 } else {
//                     throw new Error('Expected Array to have type arguments');
//                 }
//             }

//             return {
//                 type: MatcherType.Ref,
//                 subType: addSchema(node, type)
//             };
//         case ts.SyntaxKind.ArrayType:
//             if (ts.isArrayTypeNode(node)) {
//                 return {
//                     type: MatcherType.Array,
//                     subType: buildSchemaFromTypeNode(node.elementType, typeChecker)
//                 };
//             }
//         case ts.SyntaxKind.UnionType:
//             if (ts.isUnionTypeNode(node)) {
//                 return {
//                     type: MatcherType.OneOf,
//                     subType: node.types.map(type => buildSchemaFromTypeNode(type, typeChecker))
//                 };
//             }
//         case ts.SyntaxKind.TypeLiteral:
//             if (ts.isTypeLiteralNode(node)) {
//                 const members: Record<string, TypeDetails> = {};

//                 node.members.forEach(value => {
//                     if (!ts.isPropertySignature(value)) {
//                         throw new Error('This should be a propertySignature, I think');
//                     }

//                     members[value.name.getText()] = buildSchemaFromPropertySignature(value, typeChecker);
//                 });

//                 return {
//                     type: MatcherType.Interface,
//                     members
//                 };
//             }
//     }

//     throw new Error(`Should not have fallen through for ${ts.SyntaxKind[node.kind]}`);
// }

// function buildSchemaFromNode(node: ts.Node, typeChecker: ts.TypeChecker): TypeDetails {
//     const output = {};

//     switch (node.kind) {
//         case ts.SyntaxKind.PropertySignature:
//             if (ts.isPropertySignature(node)) {
//                 return buildSchemaFromPropertySignature(node, typeChecker);
//             }
//             break;
//         // case ts.SyntaxKind.InterfaceDeclaration:
//         //     if (ts.isInterfaceDeclaration(node)) {

//         //         return buildSchemaFromInterfaceDeclaration
//         //     }
//         //     break;
//         default:
//             throw new Error(`Unable to build schema from ${ts.SyntaxKind[node.kind]}`);
//     }

//     throw new Error(`Should not have fallen through`);
// }

export function buildSchemaFromType(type: ts.Type, typeChecker: ts.TypeChecker): Object {
    if (!type) {
        throw new Error('WHERE TYPE GO?');
    }

    const symbol = type.getSymbol();
    if (!symbol) {
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
    } else {
        return buildSchemaFromSymbol(symbol, typeChecker);
    }
}

interface TypeMatcherOptions {
    subType?: number | ts.Expression;
}

// function createTypeMatcher(type: MatcherType, isRequired: boolean, { subType }: TypeMatcherOptions = {}) {
//     const properties = [
//         ts.createPropertyAssignment('type', ts.createStringLiteral(type)),
//         ts.createPropertyAssignment('required', isRequired ? ts.createTrue() : ts.createFalse())
//     ];

//     if (subType) {
//         if (typeof subType === 'number') {
//             properties.push(ts.createPropertyAssignment('subType', ts.createNumericLiteral(subType.toString())));
//         } else {
//             properties.push(ts.createPropertyAssignment('subType', subType));
//         }
//     }

//     return ts.createObjectLiteral(properties, MULTILINE_LITERALS);
// }

// const createStringMatcher = (isRequired: boolean) => createTypeMatcher(MatcherType.String, isRequired);
// const createRefTypeMatcher = (refId: number, isRequired: boolean) =>
//     createTypeMatcher(MatcherType.Ref, isRequired, { subType: refId });
// const createArrayMatcher = (subType: ts.Expression | number, isRequired: boolean) =>
//     createTypeMatcher(MatcherType.Array, isRequired, { subType });
