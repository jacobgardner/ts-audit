export enum Permission {
    Admin = 'admin',
    User = 'user',
    Anonymous = 'anonymous'
}

// Other comment
// @runtime
export interface ExternalInterface {
    user: {
        firstName: string;
        lastName: string;
        phoneNumber?: string;
        id: number;
    };
    permission: Permission;
}

export interface AlsoExternalInterface {
    firstName: string;
    lastName: string;
    phoneNumber?: string;
}

// @runtime
export type CustomName = AlsoExternalInterface;

// @runtime
export interface References extends AlsoExternalInterface {
    tacos: boolean;
    ref: AlsoExternalInterface;
}

export interface YetAnotherExternalInterface {
    firstName: string;
    phoneNumber: string;
}
