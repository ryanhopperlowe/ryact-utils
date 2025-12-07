import { useSyncExternalStore } from 'react';
import { STORE } from './decorators';
import { ExternalStore } from './external-store';
import { useShallow } from './shallow';

const defaultSelector = <S>(state: S) => state;

export function useStore<S>(store: ExternalStore<S>): S;
export function useStore<S, U>(store: ExternalStore<S>, selector: (state: S) => U): U;
export function useStore<S, U>(
	store: ExternalStore<S>,
	selector: (state: S) => U = defaultSelector as any,
) {
	return useSyncExternalStore(
		store.subscribe,
		() => selector(store.snapshot()),
		() => selector(store.snapshot()),
	);
}

export function useShallowStore<S>(store: ExternalStore<S>): S;
export function useShallowStore<S, U>(store: ExternalStore<S>, selector: (state: S) => U): U;
export function useShallowStore<S, U>(
	store: ExternalStore<S>,
	selector: (state: S) => U = defaultSelector as any,
) {
	return useStore(store, useShallow(selector));
}

export function useSync<T>(store: T): T;
export function useSync<T, U>(store: T, selector: (state: T) => U): U;
export function useSync<T extends object>(store: T, selector?: (state: T) => any) {
	if (STORE in store) {
		const hiddenStore = store[STORE] as ExternalStore<any>;
		return useShallowStore(hiddenStore, selector as any);
	}

	throw new Error('Provided store could not be resolved');
}
