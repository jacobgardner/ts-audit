import { validator } from 'ts-validate';
import { assertError, assertEqual } from './assert';
import { Permission } from './interfaces';

const validate = validator('./runtimeSchema.json');

const parsedExternalInterface = JSON.parse(`{
    "user": {
        "firstName": "Jacob",
        "lastName": "Gardner",
        "id": 12
    },
    "permission": "anonymous"
}`);
const parsedCustumInterface = JSON.parse(`{
    "firstName": "Jacob",
    "lastName": "Gardner",
    "extraField": 182301,
    "phoneNumber": "1238"
}`);

parsedExternalInterface; // $ExpectType any

const validated = validate('ExternalInterface', parsedExternalInterface); // $ExpectType ExternalInterface
assertEqual(validated.permission, Permission.Anonymous);
assertEqual(validated.user.firstName, "Jacob");
assertEqual(validated.user.lastName, "Gardner");
assertEqual(validated.user.id, 12);
assertEqual(validated.user.phoneNumber, undefined);

const custom = validate('CustomName', parsedCustumInterface); // $ExpectType AlsoExternalInterface
assertEqual(custom.firstName, 'Jacob');
assertEqual(custom.lastName, 'Gardner');
assertEqual(custom.phoneNumber, '1238');

assertError(() => {
    validate('UnknownInterface', parsedExternalInterface); // $ExpectType never
});

assertError(() => {
    const { firstName, ...obj } = parsedCustumInterface;

    validate('CustomName', obj); // $ExpectType AlsoExternalInterface
});
