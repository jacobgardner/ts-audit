import * as ts from 'typescript';

const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed
});

export function printNode(node: ts.Node) {
    console.log(printer.printNode(ts.EmitHint.Unspecified, node, node.getSourceFile()));
}
