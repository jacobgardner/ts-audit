import * as ts from 'typescript';
import { log } from './logger';
import colors from 'colors';

export const schemas = new Map<ts.Type, number>();
export const schemaList: Array<[number, ts.Type]> = [];

export function addSchema(node: ts.Node | undefined, type: ts.Type) {
    let schemaId = schemas.get(type);

    if (schemaId === undefined) {
        schemaId = schemas.size;
        schemas.set(type, schemaId);
        schemaList.push([schemaId, type]);

        if (node) {
            const sourceFile = node.getSourceFile();
            const { line } = sourceFile.getLineAndCharacterOfPosition(node.pos);

            log(colors.bgGreen(colors.black(`Adding type from: ${sourceFile.fileName}:${line + 1}`)));
        }
    }

    return schemaId;
}
