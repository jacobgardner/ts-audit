# ts-runtime-interface 

**WARNING: This is still very much a work in progress...**

## Usage

See `example` for a quick example of usage. Overall what you need to do is:

 * Add a `prebuild` step that runs `ts-runtime-interface -p tsconfig.json ./augmented-definitions.d.ts ./schema.json` 

    This will use your `tsconfig.json` file to find relevant typescript files and scans for any interfaces leading with the `// @runtime`.

    These interfaces will be output in JSONSchema format and a type-definition augumentation file will be generated.

    Make sure both of these outputs are in places that 

    * TypeScript can find them 
    * You can consume them

 * In your code, set up the validator with:

    ```typescript
    const validate = validator('./path/to/schema.json');
    ```

    The resulting function returned will use the schema file to validate any objects passed into it at runtime.  If a validation fails, it will throw an exception.  If it passes, the returned value should be associated with the `interface` you annotated with `// @runtime`.

 * Use the validator:

    ```typescript
    const safeAPIResult = validate('InterfaceYouAnnotated', unsafeAPIbody);

    // safeAPIResult is guarenteed to have type soundness with your system
    //  given that everything was set up properly and there are no bugs
    //  (there are bugs)
    ```


## FAQ  

Ok now one's never actually asked me any of these but...

### Doesn't this already exist?

Probably

### Then why did you do it? 

Why does anyone do anything? 

### I already use swagger/openAPI/api-blueprint for validation

Good!

I'm not sure if this will be a good fit then. My first thought is that you could use something that generates a typescript interface from swagger (so sort of the reverse of what this is).  I don't know which is honestly better.  I made this originally for interactions with libraries/APIs which had no standard sort of validation in place. 

### Why didn't you use \<some typescript thing\> as the method of annotating an interface as needing runtime validation

I briefly considered having an empty interface that looked like: 

```typescript
interface Validate<AliasedName extends string = ''> {}
```

But there were a number of questions that lead to complexity (of usage not implementation) that I didn't have reasonable answers to that wouldn't confuse people:

 * Do all ancestors of Validate become candidates for runtime validation?
 * How do we deal with aliased interfaces

### This is slow

That's not a question, but yes, it does have to process your project with the typescript compiler before you actually compile. There should be a way to focus what files have external interfaces at some point, but it's not there yet. 
