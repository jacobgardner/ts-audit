import * as ts from 'typescript';
import colors from 'colors';
import { indent } from './formatter';

const EXCLUDE: Record<string, boolean> = { parent: true, pos: true, end: true, checker: true };

function isNode(node: any): node is ts.Node {
    return node && typeof node.kind === 'number';
}

export function formatNode(node: unknown, maxDepth = 6): string {
    // colors.disable();

    if (maxDepth <= 0) {
        return colors.red(colors.underline('[MAX DEPTH]'));
    }

    switch (typeof node) {
        case 'number':
            return colors.yellow(node.toString());
        case 'string':
            return `"${colors.yellow(node)}"`;
        case 'boolean':
            return colors.green(node.toString());
        case 'undefined':
            return colors.red('undefined');
        case 'object':
            break;
        case 'function':
            return colors.blue('[function]');
        default:
            throw new Error(`No handler for ${typeof node}`);
    }

    let output = '\n';
    if (node instanceof Array) {
        output += '[\n';
        output += indent(node.map(element => formatNode(element, maxDepth - 1)).join(', '), 2);
        output += '\n]';

        return output;
    } else if (node === null) {
        return colors.red('null');
    }

    if (isNode(node)) {
        if (ts.isIdentifier(node)) {
            return colors.green(node.escapedText.toString());
        }
    }

    output += '{\n';

    const lines = [];

    for (const key of Object.keys(node)) {
        if (EXCLUDE[key] !== undefined) {
            continue;
        }

        let value: unknown = node[key as keyof Object];
        let line = `${key}: `;

        if (key === 'kind' && typeof value === 'number') {
            line += colors.bold(colors.green(ts.SyntaxKind[value]));
        } else {
            line += formatNode(value, maxDepth - 1);
        }
        lines.push(line);
    }

    output += indent(lines.join('\n'), 2);
    output += '\n}';

    if (!lines.length) {
        return '{}';
    }

    return output;
    // return indent(output, 2);
}
