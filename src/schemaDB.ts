import * as schema from 'ts-json-schema-generator';
import * as ts from 'typescript';
import { JSONSchema7, JSONSchema7Definition } from 'json-schema';
import { AliasType } from 'ts-json-schema-generator';

// TODO: Make a PR against ts-json-schema-generator so I don't have to strip
// these.
// TODO: Make this configurable via a decorator.
/*
    The library I use to generate the schema attaches the `additionalProperties`
    modifier to all object schemas.  That sort of wrecks TypeScripts structual
    typing so we just strip it off.
*/
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

/*
JSONSchema does not allow slashes as part of names so until we minify (which
will just be numbers/letters, we're replacing slashes with underscores)
*/
function sanitizeId(id: string): string {
    return id.replace(/\//g, '_');
}

export type SchemaDefinitions = Record<string, schema.Definition>;

/*
    This builds up a record of all the definitions in the project we've used so
    we can memoize the results and dump them all out at the end.
*/
export class SchemaDB {
    private parser: schema.NodeParser;
    private formatter: schema.TypeFormatter;
    private definitions: SchemaDefinitions = {};
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
        const baseType = this.parser.createType(node, new schema.Context());
        let definition = this.schemasByType.get(baseType.getId());

        if (definition === undefined) {
            definition = this.formatter.getDefinition(baseType);
            const seen = new Set<string>();

            // TODO: This is a heavily modified version of:
            // https://github.com/vega/ts-json-schema-generator/blob/master/src/SchemaGenerator.ts
            // We should make A PR to make this functionality public.
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

    // TODO: Just use `schemaDB.definitions` directly.
    public getDefinitions() {
        return this.definitions;
    }
}
