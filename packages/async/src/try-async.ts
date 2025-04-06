function coerceError(e: unknown, fallback = 'Something went wrong') {
	if (e instanceof Error) return e;
	if (typeof e === 'string') return new Error(e);
	return new Error(fallback);
}

export type TryAsyncResult<TData> = [TData, null] | [null, Error];

export async function tryAsync<TData>(promise: Promise<TData>): Promise<TryAsyncResult<TData>> {
	try {
		return [await promise, null] as const;
	} catch (e) {
		return [null, coerceError(e)] as const;
	}
}
