const DEFAULT_COERCE_ERROR = (x: unknown, message = 'Something went wrong') => {
	if (x instanceof Error) return x;
	if (typeof x === 'string') return new Error(x);
	return new Error(message, { cause: x });
};

type AttemptResultTuple<TReturn, TError> = [null, TReturn] | [TError, null];

export type AttemptSuccess<TReturn> = [null, TReturn] & { data: TReturn; error: null };
export type AttemptFailure<TError> = [TError, null] & { data: null; error: TError };
export type AttemptResult<TReturn, TError> = AttemptSuccess<TReturn> | AttemptFailure<TError>;

const createResult = <TReturn, TError>(...[error, data]: AttemptResultTuple<TReturn, TError>) => {
	const res = [data, error] as AttemptResult<TReturn, TError>;
	res.data = data;
	res.error = error;

	return res;
};

export interface ConvertError<T = unknown> {
	(x: unknown): T;
}

export interface AttemptSync<TError> {
	<TArgs extends unknown[], TReturn>(
		fn: (...args: TArgs) => TReturn,
		...args: TArgs
	): AttemptResult<TReturn, TError>;
}

export interface AttemptPromise<TError> {
	<TReturn>(promise: Promise<TReturn>): Promise<AttemptResult<TReturn, TError>>;
}

export interface AttemptAsync<TError> {
	<TArgs extends unknown[], TReturn>(
		fn: (...args: TArgs) => Promise<TReturn>,
		...args: TArgs
	): Promise<AttemptResult<TReturn, TError>>;
}

export interface Attempt<TError> extends AttemptSync<TError> {
	promise: AttemptPromise<TError>;
	async: AttemptAsync<TError>;
}

const createAttempt = <TError = unknown>(coerceError: ConvertError<TError>): Attempt<TError> => {
	const attemptSync = <TArgs extends unknown[], TReturn>(
		fn: (...args: TArgs) => TReturn,
		...args: TArgs
	): AttemptResult<TReturn, TError> => {
		try {
			return createResult<TReturn, TError>(null, fn(...args));
		} catch (e) {
			return createResult<TReturn, TError>(coerceError(e), null);
		}
	};

	const attempt = attemptSync as Attempt<TError>;

	attempt.promise = async <TReturn>(
		promise: Promise<TReturn>,
	): Promise<AttemptResult<TReturn, TError>> => {
		try {
			return createResult<TReturn, TError>(null, await promise);
		} catch (e) {
			return createResult<TReturn, TError>(coerceError(e), null);
		}
	};

	attempt.async = <TArgs extends unknown[], TReturn>(
		fn: (...args: TArgs) => Promise<TReturn>,
		...args: TArgs
	) => attempt.promise(fn(...args));

	return attempt;
};

const attempt = createAttempt(DEFAULT_COERCE_ERROR);

export { attempt as default, attempt, createAttempt };
