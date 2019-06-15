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

export interface RecordKey {
    key: string;
    certType: CertificateType;
    wat: NonInitializedEnum;
    extras?: string[];
    certs: CertificateType[];
}
