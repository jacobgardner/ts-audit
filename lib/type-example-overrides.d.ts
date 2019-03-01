// tslint:disable
import * as lib from './src/lib';
import { ExternalInterface as _hashA, YetAnotherExternalInterface as _hashB } from './example/interfaces';

declare namespace Validate {
    function validate(interfaceName: 'TestInterface', obj: any): _hashA;
    function validate(interfaceName: string, obj: any): never;
}

declare namespace Validate2 {
    function validate(interfaceName: 'Examplo', obj: any): _hashB;
    function validate(interfaceName: string, obj: any): never;
}

declare module './src/lib' {
    // @ts-ignore
    export function validator(schemaPath: string): typeof Validate.validate;
    // @ts-ignore
    export function validator(schemaPath: string, schemaName: 'runtimeSchema'): typeof Validate.validate;
    // @ts-ignore
    export function validator(schemaPath: string, schemaName: 'otherSchema'): typeof Validate2.validate;
}
