import * as fs from "fs";
import { Validator } from 'jsonschema';

export type ValidateFunction = (interfaceName: string, obj: unknown) => any;

export function validator(schemaPath: string, schemaName?: string): ValidateFunction {
    const schema = JSON.parse(fs.readFileSync(schemaPath).toString());

    const validator = new Validator();
    validator.addSchema(schema);

    return (interfaceName: string, obj: unknown): any => {
        if (!(interfaceName in schema.definitions)) {
            throw new Error(`Interface does not exist: ${interfaceName}`);
        }

        const v = validator.validate(obj, schema.definitions[interfaceName]);

        if (v.valid) {
            return obj as any;
        }

        throw new Error(v.toString());
    };
}
