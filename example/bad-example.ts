// tslint:disable:interface-name no-empty-interface
interface Validity<T extends string> {}

export interface NotExternalInterface extends Validity<'TestInterface'> {
    firstName: string;
    lastName: string;
}

export interface ExternalInterface extends Validity<'TestInterface'> {
    phone: string[];
}
