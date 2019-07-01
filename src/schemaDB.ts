import * as schema from 'ts-json-schema-generator';
import * as ts from 'typescript';
import { JSONSchema7, JSONSchema7Definition } from 'json-schema';
import { AliasType } from 'ts-json-schema-generator';

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

function sanitizeId(id: string): string {
    return id.replace(/\//g, '_');
}

export class SchemaDB {
    private parser: schema.NodeParser;
    private formatter: schema.TypeFormatter;
    private definitions: Record<string, schema.Definition> = {};
    private schemasByType = new Map<string, JSONSchema7>();

    public constructor(program: ts.Program, path: string) {
        this.parser = schema.createParser(program, {
            ...schema.DEFAULT_CONFIG,
            jsDoc: 'none',
            skipTypeCheck: true,
            path,
        });
        this.formatter = schema.createFormatter();
    }

    public addSchema(node: ts.Node): JSONSchema7 {
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
                const name = sanitizeId(child.getName());
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

                // TODO: This is an ugly hack which fixes the definition  having
                // slashes and fucking up the json schema
                const defn = this.formatter.getDefinition(child);

                if (defn.$ref) {
                    const splits = defn.$ref.split(/#\/definitions\//);

                    defn.$ref = `${splits[0]}#/definitions/${sanitizeId(
                        splits[1],
                    )}`;
                }

                this.schemasByType.set(sanitizeId(child.getId()), defn);

                definitions[name] = childDefinition;
                return definitions;
            }, this.definitions);
        }

        return definition;
    }

    public dump() {
        return this.definitions;
    }
}
