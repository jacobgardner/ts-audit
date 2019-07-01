/* eslint @typescript-eslint/no-unused-vars: "off" */
/* eslint prefer-const: "off" */
/* eslint @typescript-eslint/no-explicit-any: "off" */
import { assertIsType as renamed } from 'ts-audit';

import { ShallowInterface } from '../shared';

const inferred = renamed({ key: 'thing', certType: 'application' }); // Should error at build

let delayed: ShallowInterface;
delayed = renamed({ key: 'thing', certType: 'application' }) as any; // I'm honestly not sure

renamed({ key: 'thing', certType: 'application' }); // Should error at build
