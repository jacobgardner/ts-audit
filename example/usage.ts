import { validator } from 'ts-validate';
import { assertError } from './assert';

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
    "phoneNumber": "818182381238"
}`);

parsedExternalInterface; // $ExpectType any

const validated = validate('ExternalInterface', parsedExternalInterface); // $ExpectType ExternalInterface
validated.permission; // $ExpectType Permission

validate('CustomName', parsedCustumInterface); // $ExpectType AlsoExternalInterface

assertError(() => {
    validate('UnknownInterface', parsedExternalInterface); // $ExpectType never
});

assertError(() => {
    const { firstName, ...obj } = parsedCustumInterface;

    validate('CustomName', obj); // $ExpectType AlsoExternalInterface
});
