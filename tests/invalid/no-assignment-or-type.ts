import { assertIsType } from '../..';

assertIsType({ key: 'thing', certType: 'application' }); // Should error at build
