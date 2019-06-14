import { validateInterface as renamed } from 'runtime-check';

import { RecordKey } from './interfaces';

// type Dup = RecordKey;

const key: RecordKey = renamed({ key: 'thing', certType: 'application' }); // $ExpectType RecordKey
const key2 = renamed({ key: 'thing', certType: 'application' }) as RecordKey; // $ExpectType RecordKey

// let delayed: RecordKey;

// delayed = renamed({ key: 'thing', certType: 'application' }); // $ExpectType RecordKey

// let delayedType;
// delayedType = renamed({ key: 'thing', certType: 'application' }) as Dup; // $ExpectType RecordKey

