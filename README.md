# TS-AUDIT

[![Build
Status](https://travis-ci.com/jacobgardner/ts-audit.svg?branch=master)](https://travis-ci.com/jacobgardner/ts-audit)

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
occurring at runtime, but we can do is isolate where they can occur and provide
clear indicators of where a mismatch occured and why.

## Installation

You'll need to install two packages, `ts-audit` and `ttypescript` which is used
to run the transform plugin. (You'll still need `typescript` as `ttypescript`
uses whatever version of `typescript` you have installed)

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

All you have to do to use `ts-audit` is use `assertIsType` (TODO: change
name) from the library, making sure to annotate the type of the assigned value.

```typescript
import { assertIsType } from 'ts-audit';

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

const fredsData: UserData = assertIsType(await fetchUser('fred'));

const rawData: unknown = await fetchUser('jake');
if (isType<UserData>(rawData)) {
    // rawData is typeGuarded as UserData if true
    assert(rawData.username === 'jake');
}
```

In this example `fetchUser` hits an API that returns a JSON object that we
expect to match UserData. If the object matches correctly, then we can use it
safely in our system using the power of the typescript type-system. If there's
a mispelling, missing required key, or type-mismatch we'll throw a runtime error
indicating that the JSON returned does not match what we were expecting.

## Disclaimer

This does not work for classes, functions, or pretty much anything else that's
not supported by JSON-schema. The type sent to validateFunction must be a
concrete type. This will NOT work if given a generic argument. ALSO, this has
only been tested in a node environment. This may require some additional work to
get it working in the browser, but it should be pretty close already if not.

## Known Issues

These are some known issues. There may be more unknown...

-   This also does not support primitive types unless they are aliased.
-   Importing as a named import is the only way to currently interact with
    `ts-audit`.
-   Watch mode does not appear to work correctly on the consuming project when
    altering code using the `ts-audit` library.

## Other Similar Projects

-   [typescript-is](https://github.com/woutervh-/typescript-is) - This project
    currently only supports inline validations which means it replaces your
    validation calls with conditionals checking in-line with your code. This
    _MAY_ lead to more performant checking. I want to do some performance
    analysis/code gen analysis against this project at some point.

## Directory Structure

Overview of the project via directory structure. May help you understand how
the code works.

-   `/src` - Source for the transformer
    -   `/src/astGenerators` - Functions that generate the AST to be output in the runtime.
    -   `/src/utils` - Various utilities for making code more DRY and readable. This needs some love.
    -   `/src/transforms` - The code that transforms that validation calls inline to use the runtime.
    -   `/src/buildRuntimeValidator.ts` - Given the schema definitions, this is responsible
        for actually building the generated javascript file used.
    -   `/src/config.ts` - Global configuration values that should eventually be made user-config.
    -   `/src/errors.ts` - Util for building up user-friendly error list for compile-time issues
        from `ts-audit` that typescript doesn't report.
    -   `/src/main.ts` - Entry point for typescript compiler to invoke the transformer
    -   `/src/schemaDB.ts` - Class that contains all definitions of types being runtime-checked.
        Ultimately dumps the schema definition list to the runtime.
    -   `/src/validationVisitor.ts` - The code which visits all the nodes
        attemping to find `ts-audit` functions/imports and transforming them correctly.
-   `/tests` - Tests testing the transformer and schema validation
    -   `/tests/valid` - Tests that build and run to completio (including testing bad schemas)
    -   `/tests/invalid` - A series of files that should fail at build time.

## Running Tests

We have to set up tests slightly differently due to the unique nature of how the
type declaration file does not match up with the generated javascript. There
may be a way to fix this, but it's not a high priority ATM.

From the root directory:

    npm link
    cd tests
    npm install
    npm link ts-audit

## TODO

-   [ ] Move TODOs to github issues instead.
-   [x] Add `matchesInterface` function which returns `true`/`false` instead of
        throwing assertions
-   [ ] Minify schema output
-   [ ] Performance test against typescript-is
-   [ ] Allow namespace imports at least.
-   [x] Make readme better
-   [x] Add tests
-   [x] Add CI pipeline so we don't screw up the project
-   [ ] Support watch mode - I think the issue is we cache the types after the
        first pass and the second pass doesn't invalidate the cache so changes to
        types aren't propogated correctly.
-   [x] Find better names for functions
-   [ ] Support primitives
-   [ ] Support root-level unions/intersections (will be solved similarly to primitives)
-   [ ] Use custom error so that consumer can catch interface validations
-   [ ] Allow option to disable additional properties being added to an object
        (possibly with a decorator)
-   [ ] Add realistic, useful example instead of the pseudo-test-like examples
        we had before.
-   [ ] Refactor like crazy
-   [ ] Build a tool like `Quote` in rust so that it's easier to build up the
        AST without building the AST.
-   [ ] Replace all asserts with emitErrorFromNode for better user-error
        reporting
-   [ ] Add optional hooks into assertion function so that custom error
        reporting can be done; this would be used to partially accomodate the fact that the
        validate function can't be wrapped in a generic function.
-   [x] Add tests for improper usage of API.
-   [ ] Test in browser
-   [ ] Move config.ts to using user passed options instead.
-   [ ] Use `dtslint` in tests
