// eslint-disable-next-line
type _RUNTIME_CHECK_ANY = any;

export function assertIsType<T = _RUNTIME_CHECK_ANY>(
    data: unknown,
): _RUNTIME_CHECK_ANY;

export function isType<T = _RUNTIME_CHECK_ANY>(data: unknown): data is T;

// export class _RUNTIME_CHECK_VALIDATION_ERROR {}

// export class ValidationError extends _RUNTIME_CHECK_VALIDATION_ERROR {}
