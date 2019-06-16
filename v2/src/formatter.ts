import * as ts from 'typescript';
import * as util from 'util';
import colors from 'colors';

function printNode(node: ts.Node) {
    const outFile = ts.createSourceFile('bogus', '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);

    const printer = ts.createPrinter({
        newLine: ts.NewLineKind.LineFeed
    });

    const result = printer.printNode(ts.EmitHint.Unspecified, node, outFile);

    return result;
}

export function indent(lines: string, spaceCount: number) {
    const spaces = new Array(spaceCount + 1).map(() => '').join(' ');

    return lines
        .split('\n')
        .map(line => spaces + line)
        .join('\n');
}

export function astFormatter(node: ts.Node, depth = 0): string {
    let output = colors.green(ts.SyntaxKind[node.kind]) + '\n';

    switch (node.kind) {
        case ts.SyntaxKind.CallExpression:
            if (ts.isCallExpression(node)) {
                console.log(util.inspect(node, false, 1, true));

                output += `  Expression: ${colors.yellow(astFormatter(node.expression))}\n`;
                output += `  Arguments:\n`;

                for (const argument of node.arguments) {
                    output += indent(astFormatter(argument), 4) + '\n';
                }
            }

            break;
        case ts.SyntaxKind.ObjectLiteralExpression:
            if (ts.isObjectLiteralExpression(node)) {
                output += `  ${printNode(node)}\n`;
            }

            break;
        case ts.SyntaxKind.Identifier:
            if (ts.isIdentifier(node)) {
                return node.escapedText.toString();
            }

            break;
        case ts.SyntaxKind.ImportDeclaration:
            if (ts.isImportDeclaration(node)) {
                output += `  importClause:\n`;
                output += node.importClause
                    ? indent(astFormatter(node.importClause), 4)
                    : `    ${colors.red('undefined')}`;
                output += '\n';
                output += `  moduleSpecifier:\n`;
                output += indent(astFormatter(node.moduleSpecifier), 4) + '\n';
            }

            break;
        case ts.SyntaxKind.ImportClause:
            if (ts.isImportClause(node)) {
                if (node.namedBindings) {
                    output += `  namedBindings:\n`;
                    output += indent(astFormatter(node.namedBindings), 4);
                }

                if (node.name) {
                    output += `  name:\n`;
                    output += indent(astFormatter(node.name), 4);
                }
            }

            break;
        case ts.SyntaxKind.StringLiteral:
            if (ts.isStringLiteral(node)) {
                return `"${node.text}"\n`;
            }

            break;
        case ts.SyntaxKind.ImportSpecifier:
            if (ts.isImportSpecifier(node)) {
                if (node.propertyName) {
                    output += '  propertyName:\n';
                    output += indent(astFormatter(node.propertyName), 4) + '\n';
                }

                if (node.name) {
                    output += '  name:\n';
                    output += indent(astFormatter(node.name), 4) + '\n';
                }
            }

            break;
        case ts.SyntaxKind.NamedImports:
            if (ts.isNamedImports(node)) {
                output += '  elements:\n';

                for (const element of node.elements) {
                    output += indent(astFormatter(element), 4);
                }
            }

            break;
        default:
            output += colors.red(`No formatter for ${ts.SyntaxKind[node.kind]}`);
    }
    // console.log(util.inspect(node, false, 0, true));

    return output;
}
