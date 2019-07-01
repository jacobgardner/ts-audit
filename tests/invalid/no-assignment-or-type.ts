/// <reference path="../ts-audit.d.ts" />
import { assertIsType } from 'ts-audit';

assertIsType({ key: 'thing', certType: 'application' }); // Should error at build
