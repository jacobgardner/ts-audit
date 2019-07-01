export function assertEqual<T>(expected: T, actual: T, message?: string) {
    if (expected != actual) {
        throw new Error(
            message ? message : `Expected ${actual} to equal ${expected}`,
        );
    }
}

export function assert<T>(expression: T, message: string) {
    if (!expression) {
        throw new Error(message);
    }
}

export function assertExists<T>(
    obj: T | void,
    reason: string,
): Exclude<T, void> {
    if (obj === undefined || obj === null) {
        throw new Error(`Expected object to exist: ${reason}`);
    }

    return obj as Exclude<T, void>;
}
