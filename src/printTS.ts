import * as ts from 'typescript';
import colors from 'colors';
import { indent } from './formatter';
import * as fs from 'fs';
import { format } from 'util';

const EXCLUDE: Record<string, boolean> = { parent: true, pos: true, end: true, checker: true, nextContainer: true };

function isNode(node: any): node is ts.Node {
    return node && typeof node.kind === 'number';
}

const graph: any = {
    name: 'root',
    children: []
};

function graphNode(node: unknown, maxDepth: number): any {
    if (maxDepth <= 0) {
        return {
            color: 'red',
            underline: true,
            name: '[MAX_DEPTH]'
        };
    }

    switch (typeof node) {
        case 'number':
            return {
                color: 'yellow',
                name: node.toString()
            };
        case 'string':
            return {
                color: 'yellow',
                name: `"${node}"`
            };
        case 'boolean':
            return {
                color: 'green',
                name: node.toString()
            };
        case 'undefined':
            return {
                color: 'red',
                name: 'undefined'
            };
        case 'object':
            break;
        case 'function':
            return {
                color: 'blue',
                name: '[function]'
            };
        default:
            throw new Error(`No handler for ${typeof node}`);
    }

    if (node instanceof Array) {
        const arr = node.map(element => graphNode(element, maxDepth - 1));

        return arr;
    } else if (node === null) {
        return {
            color: 'red',
            name: 'null'
        };
    }

    if (isNode(node)) {
        if (ts.isIdentifier(node)) {
            return {
                color: 'blue',
                name: node.escapedText.toString()
            };
        }
    }

    const members: any = [];

    for (const key of Object.keys(node)) {
        if (key === 'pos' && isNode(node)) {
            const source = node.getSourceFile();
            const { line: lineNumber, character } = source.getLineAndCharacterOfPosition(node.pos);
            members.push({
                name: 'location',
                color: 'cyan',
                value: `${source.fileName}:${lineNumber + 1}`
            });
            continue;
        } else if (EXCLUDE[key] !== undefined) {
            continue;
        }

        let value: unknown = node[key as keyof Object];

        if (key === 'kind' && typeof value === 'number') {
            members.push({
                name: key,
                children: [
                    {
                        name: ts.SyntaxKind[value],
                        color: 'green',
                        bold: true
                    }
                ]
            });
        } else {
            const g = graphNode(value, maxDepth - 1);

            const entry: any = {
                name: key
            };

            if (Array.isArray(g)) {
                entry.children = g;
            } else {
                entry.value = g;
            }

            members.push(entry);
        }
    }

    return members;
}

let count = 0;
export function formatNode(node: unknown, maxDepth = 6): string {
    // const root = graphNode(node, maxDepth);
    // graph.children.push({ name: count.toString(), children: root });
    // count += 1;

    // fs.writeFileSync('output.json', JSON.stringify(graph, null, '  '));

    return stringifyNode(node, maxDepth);
}

export function stringifyNode(node: unknown, maxDepth = 6): string {
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
        output += indent(node.map(element => stringifyNode(element, maxDepth - 1)).join(', '), 2);
        output += '\n]';

        return output;
    } else if (node === null) {
        return colors.red('null');
    }

    if (isNode(node)) {
        if (ts.isIdentifier(node)) {
            return colors.blue(node.escapedText.toString());
        }
    }

    output += '{\n';

    const lines = [];

    for (const key of Object.keys(node)) {
        if (key === 'pos' && isNode(node)) {
            const source = node.getSourceFile();
            const { line: lineNumber, character } = source.getLineAndCharacterOfPosition(node.pos);
            lines.push(`location: ` + colors.cyan(`${source.fileName}:${lineNumber + 1}`));
            continue;
        } else if (EXCLUDE[key] !== undefined) {
            continue;
        }

        let value: unknown = node[key as keyof Object];
        let line = `${key}: `;

        if (key === 'kind' && typeof value === 'number') {
            line += colors.bold(colors.green(ts.SyntaxKind[value]));
        } else {
            line += stringifyNode(value, maxDepth - 1);
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
