export enum CertificateType {
    Application = 'application',
    User = 'user'
}

export enum NonInitializedEnum {
    TWELVE,
    A = '5',
    B = 4,
    A1,
    C
}

interface TestGeneric<T = number> {
    data: T;
}

type TypeAlias = CertificateType[];

export interface RecordKey {
    key: string;
    num: CertificateType[];
    someKeyName: TypeAlias;
    // gType: TestGeneric;
    // nestedType: { nestedNumber?: number; nestedCert: CertificateType };
    // key2: string | number | CertificateType;
    // certType: CertificateType;
    // wat: NonInitializedEnum;
    // extras?: string[];
    // certs: CertificateType[];
}
