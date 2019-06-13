import { validateInterface as renamed } from 'runtime-check';

enum CertificateType {
    Application = 'application',
    User = 'user'
}

interface RecordKey {
    key: string;
    certType: CertificateType;
    extras?: string[];
}

const key: RecordKey = renamed({ key: 'thing', certType: 'application' });
const key2 = renamed({ key: 'thing', certType: 'application' }) as RecordKey;

const inferred = renamed({ key: 'thing', certType: 'application' }); // Should error at build
