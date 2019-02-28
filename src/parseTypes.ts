// TODO: Circular Dependency
import { AliasData } from './process';
import { assertExists } from './assertions';
import * as tjs from 'typescript-json-schema';
import * as ts from 'typescript';

export function parseSourceFile(
    src: ts.SourceFile,
    checker: ts.TypeChecker,
    generator: tjs.JsonSchemaGenerator,
) {
    const symbols: AliasData[] = [];

    traverse(src);

    function traverse(node: ts.Node) {
        switch (node.kind) {
            // case ts.SyntaxKind.TypeAliasDeclaration: {
            //     const n = node as ts.TypeAliasDeclaration;

            //     const runtimeInfo = getRuntimeName(n, src);

            //     if (!runtimeInfo) {
            //         break;
            //     }

            //     const symbol = assertExists(checker.getSymbolAtLocation(n.name));

            //     console.log(`Found runtime interface: ${runtimeInfo.original} => ${runtimeInfo.alias}`);
            //     const r = assertExists(
            //         generator.getSymbols(runtimeInfo.original).find((item) => item.symbol === symbol)
            //     );

            //     const srcPath: string = (src as any).path || src.fileName;
            //     symbols.push({
            //         refName: r.name,
            //         alias: runtimeInfo.alias,
            //         srcPath
            //     });
            //     break;
            // }
            case ts.SyntaxKind.TypeAliasDeclaration:
            case ts.SyntaxKind.InterfaceDeclaration: {
                const n = node as ts.InterfaceDeclaration;

                const runtimeInfo = getRuntimeName(n, src);

                if (!runtimeInfo) {
                    break;
                }

                const symbol = assertExists(checker.getSymbolAtLocation(n.name));
                // console.log(symbol);

                console.log(`Found runtime interface: ${runtimeInfo.original} => ${runtimeInfo.alias}`);
                const r = assertExists(
                    generator.getSymbols(runtimeInfo.original).find((item) => item.symbol === symbol)
                );

                const srcPath: string = (src as any).path || src.fileName;

                symbols.push({
                    refName: r.name,
                    alias: runtimeInfo.alias,
                    srcPath
                });
                break;
            }
        }

        ts.forEachChild(node, traverse);
    }

    return symbols;
}

// TODO: Figure out why I can't reference this directly lol?
const RUNTIME_NAME = /^\/\/ @runtime( +(.*))?$/;

// TODO: Make the '@runtime' keyword configurable
function getRuntimeName(
    node: ts.InterfaceDeclaration | ts.TypeAliasDeclaration,
    src: ts.SourceFile
): { alias: string; original: string } | undefined {
    const runtimeComment = getComments(node, src).find((comment) => comment.startsWith('// @runtime'));

    if (!runtimeComment) {
        return;
    }

    const m = assertExists(runtimeComment.match(/^\/\/ @runtime( +(.*))?$/));

    const original = node.name.text;

    if (m[2]) {
        return {
            alias: m[2],
            original
        };
    }

    return {
        original,
        alias: original
    };
}

function getComments(node: ts.Node, src: ts.SourceFile) {
    return src.text
        .substring(node.getFullStart(), node.getStart())
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length);
}
