/*
  This file is just used for debugging.  It's for helping print AST nodes in a
  very slightly more readable way.
*/
import * as ts from 'typescript';
import colors from 'colors';

export function indent(lines: string, spaceCount: number) {
    const spaces = new Array(spaceCount + 1).map(() => '').join(' ');

    return lines
        .split('\n')
        .map(line => spaces + line)
        .join('\n');
}

const EXCLUDE: Record<string, boolean> = {
    parent: true,
    pos: true,
    end: true,
    checker: true,
    nextContainer: true,
};

// eslint-disable-next-line
function isNode(node: any): node is ts.Node {
    return node && typeof node.kind === 'number';
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
        output += indent(
            node
                .map(element => stringifyNode(element, maxDepth - 1))
                .join(', '),
            2,
        );
        output += '\n]';

        return output;
    } else if (node === null) {
        return colors.red('null');
    }

    // if (isNode(node)) {
    //     if (ts.isIdentifier(node)) {
    //         return colors.blue(node.escapedText.toString());
    //     }
    // }

    output += '{\n';

    const lines = [];

    for (const key of Object.keys(node)) {
        if (key === 'pos' && isNode(node)) {
            const source = node.getSourceFile();

            if (source) {
                const {
                    line: lineNumber,
                } = source.getLineAndCharacterOfPosition(node.pos);
                lines.push(
                    `location: ` +
                        colors.cyan(`${source.fileName}:${lineNumber + 1}`),
                );
            } else {
                lines.push('location: unknown');
            }
            continue;
        } else if (EXCLUDE[key] !== undefined) {
            continue;
        }

        const value: unknown = node[key as keyof typeof node];
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

export function formatNode(node: unknown, maxDepth = 6): string {
    // const root = graphNode(node, maxDepth);
    // graph.children.push({ name: count.toString(), children: root });
    // count += 1;

    // fs.writeFileSync('output.json', JSON.stringify(graph, null, '  '));

    return stringifyNode(node, maxDepth);
}
