export type ValidateFunction = (interfaceName: string, obj: unknown) => any;

export function validator(schemaPath: string, schemaName?: string): ValidateFunction {
    return (interfaceName: string, obj: unknown): any => {
        return true;
    };
}
