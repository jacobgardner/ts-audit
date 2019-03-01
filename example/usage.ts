import { validator } from 'ts-validate';

const validate = validator('./runtimeSchema.json');

const parsedObj = JSON.parse(`{
    "user": {
        "firstName": "Jacob",
        "lastName": "Gardner",
        "id": 12
    },
    permission: "anonymous"
}`);

parsedObj; // $ExpectType any

const validated = validate('ExternalInterface', parsedObj); // $ExpectType ExternalInterface
validated.permission; // $ExpectType Permission

validate('CustomName', parsedObj); // $ExpectType AlsoExternalInterface
validate('UnknownInterface', parsedObj); // $ExpectType never
