export enum CertificateType {
    Application = 'application',
    User = 'user'
}

export interface RecordKey {
    key: string;
    certType: CertificateType;
    extras?: string[];
}
