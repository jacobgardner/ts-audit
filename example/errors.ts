import { validateInterface as renamed } from 'runtime-check';

import { RecordKey } from './interfaces';

const inferred = renamed({ key: 'thing', certType: 'application' }); // Should error at build

let delayed: RecordKey;
delayed = renamed({ key: 'thing', certType: 'application' }) as any; // I'm honestly not sure

// renamed({ key: 'thing', certType: 'application' }); // Should error at build