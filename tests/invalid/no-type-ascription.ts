/// <reference path="../ts-audit.d.ts" />
import { assertIsType } from 'ts-audit';

const inferred = assertIsType({ key: 'thing', certType: 'application' });
