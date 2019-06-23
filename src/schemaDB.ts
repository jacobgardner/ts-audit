import * as ts from 'typescript';
import { log } from './logger';
import colors from 'colors';

export const schemas = new Map<ts.Type, number>();

export function addSchema(node: ts.Node, type: ts.Type) {
    let schemaId = schemas.get(type);

    if (schemaId === undefined) {
        schemaId = schemas.size;
        schemas.set(type, schemaId);

        const sourceFile = node.getSourceFile();
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.pos);

        log(colors.bgGreen(colors.black(`Adding type from: ${sourceFile.fileName}:${line + 1}`)));
    }

    return schemaId;
}
