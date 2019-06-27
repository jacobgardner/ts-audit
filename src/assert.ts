export function assertEqual<T>(expected: T, actual: T, message?: string) {
    if (expected != actual) {
        throw new Error(message ? message : `Expected ${actual} to equal ${expected}`);
    }
}

export function assert<T>(expression: T, message: string) {
    if (!Boolean(expression)) {
        throw new Error(message);
    }
}
