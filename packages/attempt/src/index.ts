const DEFAULT_COERCE_ERROR = (x: unknown, message = 'Unknown error caught with "attempt"') => {
	if (x instanceof Error) return x;
	if (typeof x === 'string') return new Error(x);
	return new Error(message, { cause: x });
};

type AttemptResultTuple<TReturn, TError> = [undefined, TReturn, true] | [TError, undefined, false];

export type AttemptSuccess<TReturn> = [undefined, TReturn, true] & {
	data: TReturn;
	error: undefined;
	success: true;
};
export type AttemptFailure<TError> = [TError, undefined, false] & {
	data: undefined;
	error: TError;
	success: false;
};
export type AttemptResult<TReturn, TError> = AttemptSuccess<TReturn> | AttemptFailure<TError>;

const createResult = <TReturn, TError>(
	...[error, data, success]: AttemptResultTuple<TReturn, TError>
) => {
	const res = [error, data, success] as AttemptResult<TReturn, TError>;
	res.data = data;
	res.error = error;
	res.success = success;

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

export const createAttempt = <TError = unknown>(
	coerceError: ConvertError<TError>,
): Attempt<TError> => {
	const attemptSync = <TArgs extends unknown[], TReturn>(
		fn: (...args: TArgs) => TReturn,
		...args: TArgs
	): AttemptResult<TReturn, TError> => {
		try {
			return createResult<TReturn, TError>(undefined, fn(...args), true);
		} catch (e) {
			return createResult<TReturn, TError>(coerceError(e), undefined, false);
		}
	};

	const attemptPromise = async <TReturn>(
		promise: Promise<TReturn>,
	): Promise<AttemptResult<TReturn, TError>> => {
		try {
			return createResult<TReturn, TError>(undefined, await promise, true);
		} catch (e) {
			return createResult<TReturn, TError>(coerceError(e), undefined, false);
		}
	};

	const attemptAsync = <TArgs extends unknown[], TReturn>(
		fn: (...args: TArgs) => Promise<TReturn>,
		...args: TArgs
	) => attemptPromise(fn(...args));

	const attempt = attemptSync as Attempt<TError>;
	attempt.promise = attemptPromise;
	attempt.async = attemptAsync;

	return attempt;
};

export const attempt = createAttempt(DEFAULT_COERCE_ERROR);
