import * as ts from 'typescript';

interface ErrorData {
    file: string;
    line: number;
    character: number;
    message: string;
}

export const errors: ErrorData[] = [];

export function emitErrorFromNode(node: ts.Node, message: string): ts.Node {
    const sourceFile = node.getSourceFile();

    const { line, character } = sourceFile.getLineAndCharacterOfPosition(
        node.pos,
    );

    errors.push({
        file: sourceFile.fileName,
        line: line + 1,
        character,
        message,
    });

    const newError = ts.createNew(
        ts.createIdentifier('Error'),
        [],
        [ts.createStringLiteral(message)],
    );
    const throwNode = ts.createThrow(newError);

    return throwNode;
}

// export function formatErrors(): string {

// }
