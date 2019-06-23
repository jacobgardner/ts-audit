import * as ts from 'typescript';

export const schemas = new Map<ts.Type, number>();

export function addSchema(type: ts.Type) {
    let schemaId = schemas.get(type);

    if (schemaId === undefined) {
        schemaId = schemas.size;
        schemas.set(type, schemaId);
    }

    return schemaId;
}
