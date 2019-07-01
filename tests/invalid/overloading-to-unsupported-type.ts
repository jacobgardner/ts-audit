import { assertIsType } from 'ts-audit';
import { ShallowInterface } from '../shared';

let delayed: ShallowInterface;
delayed = assertIsType({ key: 'thing', certType: 'application' }) as any; // I'm honestly not sure
