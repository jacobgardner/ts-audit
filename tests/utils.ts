export function expectValidationError(callback: () => void) {
    try {
        callback();
    } catch (err) {
        // TODO: We'll want to change this so we can do `instanceof`
        if (err.validationError) {
            return;
        }

        throw new Error('ValidationError was expected');
    }

    throw new Error('Expected validation error to have occured');
}
