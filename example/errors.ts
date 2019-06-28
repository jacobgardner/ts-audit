/* eslint @typescript-eslint/no-unused-vars: "off" */
/* eslint prefer-const: "off" */
/* eslint @typescript-eslint/no-explicit-any: "off" */
import { validateInterface as renamed } from 'runtime-check';

import { RecordKey } from './interfaces';

const inferred = renamed({ key: 'thing', certType: 'application' }); // Should error at build

let delayed: RecordKey;
delayed = renamed({ key: 'thing', certType: 'application' }) as any; // I'm honestly not sure

renamed({ key: 'thing', certType: 'application' }); // Should error at build
