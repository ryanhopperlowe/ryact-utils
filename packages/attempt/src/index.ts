const DEFAULT_COERCE_ERROR = (x: unknown, message = 'Unknown error caught with "attempt"') => {
	if (x instanceof Error) return x;
	if (typeof x === 'string') return new Error(x);
	return new Error(message, { cause: x });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

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

export const createResult = <TReturn, TError>(
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

type AttemptFnReturn<TReturn, TError> =
	TReturn extends Promise<infer TAwaited>
		? Promise<AttemptResult<TAwaited, TError>>
		: AttemptResult<TReturn, TError>;

interface AttemptFn<TError> {
	<TReturn, TArgs extends unknown[]>(
		fn: (...args: TArgs) => TReturn,
		...args: TArgs
	): AttemptFnReturn<TReturn, TError>;
}

type AttemptAnyArgs<TParam> = TParam extends (...args: infer TArgs) => Any ? TArgs : [];
type AttemptAnyReturn<TParam> = TParam extends (...args: Any[]) => infer TReturn ? TReturn : TParam;

type AttemptAnyResult<TReturn, TError> =
	TReturn extends Promise<infer TAwaited>
		? Promise<AttemptResult<TAwaited, TError>>
		: AttemptResult<TReturn, TError>;

interface AttemptAny<TError> {
	<TParam, TArgs extends AttemptAnyArgs<TParam>, TReturn extends AttemptAnyReturn<TParam>>(
		param: TParam,
		...args: TArgs
	): AttemptAnyResult<TReturn, TError>;
}

export interface Attempt<TError> extends AttemptAny<TError> {
	promise: AttemptPromise<TError>;
	async: AttemptAsync<TError>;
	sync: AttemptSync<TError>;
	fn: AttemptFn<TError>;
	any: AttemptAny<TError>;
}

export const createAttempt = <TError = unknown>(
	coerceError: ConvertError<TError>,
): Attempt<TError> => {
	const attemptFn = <TReturn, TArgs extends unknown[]>(
		fn: (...args: TArgs) => TReturn,
		...args: TArgs
	): AttemptFnReturn<TReturn, TError> => {
		type Result = AttemptFnReturn<TReturn, TError>;

		const result = attemptSync(fn, ...args);

		if (result.success && result.data instanceof Promise)
			return attemptPromise(result.data) as Result;

		return result as Result;
	};

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

	const attemptAny = <
		TParam,
		TArgs extends AttemptAnyArgs<TParam>,
		TReturn extends AttemptAnyReturn<TParam>,
	>(
		param: TParam,
		...args: TArgs
	) => {
		type Result = AttemptAnyResult<TReturn, TError>;
		if (param instanceof Promise) return attemptPromise(param) as Result;

		if (typeof param === 'function')
			return attemptFn(param as (...args: TArgs) => TReturn, ...args);

		return createResult(undefined, param, true) as Result;
	};

	const attempt = attemptAny as Attempt<TError>;
	attempt.promise = attemptPromise;
	attempt.async = attemptAsync;
	attempt.sync = attemptSync;
	attempt.fn = attemptFn;
	attempt.any = attemptAny as AttemptAny<TError>;

	return attempt;
};

export const attempt = createAttempt(DEFAULT_COERCE_ERROR);
