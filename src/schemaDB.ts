import * as ts from 'typescript';
import { log } from './logger';
import colors from 'colors';
import * as schema from 'ts-json-schema-generator';
import { TypeFormatter, AliasType } from 'ts-json-schema-generator';
import { JSONSchema7, JSONSchema7Definition } from 'json-schema';
import * as util from 'util';

// export const schemas = new Map<ts.Type, number>();
// export const nodes = new Map<ts.Node, number>();
// export const schemaList: Array<[number, ts.Type]> = [];
// export const nodeList: Array<[number, ts.Node]> = [];
// export const definitions: Record<string, schema.Definition> = {};

export class SchemaDB {
    private parser: schema.NodeParser;
    private formatter: schema.TypeFormatter;
    private definitions: Record<string, schema.Definition> = {};
    private schemasByType = new Map<string, JSONSchema7>();

    constructor(program: ts.Program, path: string) {
        this.parser = schema.createParser(program, {
            ...schema.DEFAULT_CONFIG,
            jsDoc: 'none',
            skipTypeCheck: true,
            path,
        });
        this.formatter = schema.createFormatter();
    }

    addSchema(node: ts.Node): JSONSchema7 {
        // log(node);
        const baseType = this.parser.createType(node, new schema.Context());
        let definition = this.schemasByType.get(baseType.getId());

        // log('Base:', util.inspect(baseType, false, 1000, true));
        // log(' -', baseType.getName(), baseType.getId());
        // if (definition) {
        //     log(' -', definition);
        // }

        if (definition === undefined) {
            definition = this.formatter.getDefinition(baseType);
            // log(' -', definition);
            // this.schemasByType.set(baseType.getId(), definition);
            const seen = new Set<string>();

            // TODO: This was taken from
            // https://github.com/vega/ts-json-schema-generator/blob/master/src/SchemaGenerator.ts
            // Make A PR to make this functionality public.
            const children = this.formatter
                .getChildren(baseType)
                .filter(
                    (child): child is schema.DefinitionType =>
                        child instanceof schema.DefinitionType,
                )
                .filter(child => {
                    if (!seen.has(child.getId())) {
                        seen.add(child.getId());
                        return true;
                    }
                    return false;
                });

            children.reduce((definitions, child) => {
                const name = child.getName();
                // log('childId', child.getId());
                // log(child);

                if (this.schemasByType.get(child.getId())) {
                    return definitions;
                }

                if (name in definitions) {
                    throw new Error(`Type "${name}" has multiple definitions.`);
                }

                let childBaseType = child.getType();

                while (childBaseType instanceof AliasType) {
                    childBaseType = childBaseType.getType();
                }

                const childDefinition = this.formatter.getDefinition(
                    childBaseType,
                );

                stripAdditionalProperties(childDefinition);

                // log('ChildBase:', util.inspect(childBaseType, false, 1000, true));
                // log(' -', childBaseType.getName(), childBaseType.getId());
                // log(' -', childDefinition);
                this.schemasByType.set(
                    child.getId(),
                    this.formatter.getDefinition(child),
                );

                definitions[name] = childDefinition;
                return definitions;
            }, this.definitions);
        }

        return definition;
    }

    dump() {
        return this.definitions;
    }
}

function cleanId(baseTypeName: string) {
    const m = baseTypeName.match(/^(def-)?(.*)$/);
    if (!m) {
        throw new Error('m should definitely exist. Trust me');
    }

    // log('Match:', m[2]);
    return m[2];
}

function stripAdditionalProperties(defn: JSONSchema7 | JSONSchema7Definition) {
    if (typeof defn === 'boolean') {
        return;
    }

    delete defn.additionalProperties;

    if (defn.properties) {
        for (const key of Object.keys(defn.properties)) {
            stripAdditionalProperties(defn.properties[key]);
        }
    }
}
