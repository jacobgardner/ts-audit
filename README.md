# TS-AUDIT

`ts-audit` is a Typescript transform plugin that verifies external data
structures match what you expect them to be inside your typescript ecosystem.

Typescript's safety guarentees can only work on data that originated inside your
code. Performing a type assertion on a JSON object downloaded from an external
API or library can lead to odd, hard to debug, runtime errors that Typescript
would otherwise have prevented at compile time. `ts-audit` solves that by
verifying that external data structures match the structure of the types inside
your system before you can start to interact with them. What this provides is a
barrier between your safe and unsafe code and clearly shows when untyped data
doesn't match your expections. We can't stop mismatched expectations from
occurring at runtime, but we can do is isolate where that can occur and provide
clear indicators of where a mismatch occured and why.

## Installation

You'll need to install two packages, `ts-audit` and `ttypescript` which is used
to run the transform plugin.

    npm install -S ts-audit ttypescript

Your `tsconfig.json` will need to be modified to use `ts-audit` during the
compilation process.

```javascript
{
    "compilerOptions": {
        /* Basic Options */
        "plugins": [
            {
                "transform": "ts-audit",
            }
        ],
        /* ... */
    }
}
```

Finally, you'll need to change your build setup to use `ttsc` instead of `tsc`.

And you're ready to go!!!!!!

## Usage

All you have to do to use `ts-audit` is use `validateInterface` (TODO: change
name) from the library, making sure to annotate the type of the assigned value.

```typescript
import { validateInterface } from 'ts-audit';

enum Animal {
    Cat = 'cat',
    Dog = 'dog',
    Goat = 'goat',
}

interface UserData {
    username: string;
    phoneNumber: string;
    age: number;
    pet: Animal;
    notes?: string;
}

const fredsData: UserData = validateInterface(await fetchUser('fred'));
```

In this example `fetchUser` hits an API that returns a JSON object that we
expect to match UserData. If the object matches correctly, then we can use it
safely in our system using the power of the typescript type-system. If there's
a mispelling, missing required key, or type-mismatch we'll throw a runtime error
indicating that the JSON returned does not match what we were expecting.

## TODO

-   [ ] Add `matchesInterface` function which returns `true`/`false` instead of
        throwing assertions
-   [ ] Minify schema output
-   [ ] Performance test against typescript-is
-   [ ] Allow namespace imports at least.
-   [ ] Make readme better
-   [ ] Add tests
-   [ ] Add CI pipeline so we don't screw up the project
-   [ ] Support watch mode
-   [ ] Find better names for functions