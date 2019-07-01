import { assertIsType } from 'ts-audit';
import { ShallowInterface } from '../shared';

// eslint-disable-next-line
let delayed: ShallowInterface;
// eslint-disable-next-line
delayed = assertIsType({ key: 'thing', certType: 'application' }) as any; // I'm honestly not sure
