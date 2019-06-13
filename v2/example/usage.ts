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

type Dup = RecordKey;

const key: RecordKey = renamed({ key: 'thing', certType: 'application' });
const key2 = renamed({ key: 'thing', certType: 'application' }) as RecordKey;

const inferred = renamed({ key: 'thing', certType: 'application' }); // Should error at build

let delayed: RecordKey;

delayed = renamed({ key: 'thing', certType: 'application' });
delayed = renamed({ key: 'thing', certType: 'application' }) as any;

let delayedType;
delayedType = renamed({ key: 'thing', certType: 'application' }) as Dup;

renamed({ key: 'thing', certType: 'application' }); // Should error at build
