import { tryAsync, type TryAsyncResult } from './try-async';
import { useCallback, useState } from 'react';

export type AsyncConfig<TFallback> = {
	fallbackData?: TFallback;
};

export type TDataReturn<TData, TFallback extends TData | undefined> = TFallback extends undefined
	? TData | null
	: TData;

export type AsyncState<TData, TParams extends unknown[], TFallback extends TData | undefined> = {
	data: TDataReturn<TData, TFallback>;
	loading: boolean;
	error: unknown;
	execute: (...params: TParams) => void;
	executeAsync: (...params: TParams) => Promise<TryAsyncResult<TData>>;
};

export function useAsync<
	TData,
	TParams extends unknown[],
	TFallback extends TData | undefined = undefined,
>(
	cb: (...params: TParams) => Promise<TData>,
	config?: AsyncConfig<TFallback>,
): AsyncState<TData, TParams, TFallback> {
	const { fallbackData } = config ?? {};

	const [data, setData] = useState<TData | null>(fallbackData === undefined ? null : fallbackData);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<unknown>(null);

	const executeAsync = useCallback(
		async (...params: TParams) => {
			setLoading(true);

			const promise = cb(...params);

			promise
				.then(setData)
				.catch(setError)
				.finally(() => setLoading(false));

			return tryAsync(promise);
		},
		[cb],
	);

	const execute = useCallback(
		(...params: TParams) => {
			executeAsync(...params);
		},
		[executeAsync],
	);

	return {
		data: data as TDataReturn<TData, TFallback>,
		loading,
		error,
		execute,
		executeAsync,
	};
}
