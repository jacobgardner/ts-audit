export function assertError(callback: () => void) {
    let threwError = false;

    try {
        callback();
    } catch (err) {
        threwError = true;
    }

    if (!threwError) {
        throw new Error('Expected code to throw an error');
    }
}
