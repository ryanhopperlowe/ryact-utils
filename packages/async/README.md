# @ryact-utils/async

A lightweight library for handling client side asynchronous logic in your React Application

## Exports:

### `useAsync`: a hook that abstracts loading and error states for an asynchronous function.

```ts
// Return Signature
{
	data: TData | null;
	loading: boolean;
	error: unknown;
	execute: (...params: TParams) => void
	executeAsync: (...params: TParams) => Promise<AsyncResult<TData>>
}
```

### `tryAsync`: a util that wraps a promise and returns data/error states without the need of a try/catch clause

Returns `[TData, null] | [null, Error]`
