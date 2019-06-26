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
}
