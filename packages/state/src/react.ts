import { useSyncExternalStore } from 'react';
import { useShallow } from 'zustand/shallow';
import { ExternalStore } from './external-store';

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

useStore.shallow = useShallowStore;
