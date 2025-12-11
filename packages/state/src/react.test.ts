import { renderHook } from '@testing-library/react';
import { test as baseTest, describe } from 'vitest';
import { SnapshotStore } from './external-store';
import { useShallowStore, useStore, useSync } from './react';
import { store } from './legacy-decorators';

const test = baseTest.extend<{
	store: { store: SnapshotStore<{ count: number }>; increment: () => void };
}>({
	store: async ({}, use) => {
		let count = 0;

		const store = new SnapshotStore(() => ({ count }));

		const increment = () => {
			count += 1;
		};

		await use({ store, increment });

		//cleanup
		count = 0;
	},
});

describe(SnapshotStore, () => {
	test(useShallowStore, async ({ store: { store, increment }, expect }) => {
		const { result, rerender } = renderHook(() => useShallowStore(store));

		expect(result.current.count).toBe(0);

		increment();
		rerender();

		expect(result.current.count).toBe(1);
	});

	test(useStore, ({ expect, store: { store, increment } }) => {
		const { result, rerender } = renderHook(() => useStore(store, ({ count }) => count));

		expect(result.current).toBe(0);

		increment();
		rerender();

		expect(result.current).toBe(1);
	});

	baseTest(useSync, ({ expect }) => {
		@store
		class MyStore {
			count = 0;
			increment = () => (this.count += 1);
		}

		const mystore = new MyStore();

		const { result, rerender } = renderHook(() => useSync(mystore));

		expect(result.current.count).toBe(0);
		result.current.increment();
		rerender();
		expect(result.current.count).toBe(1);
	});

	baseTest('useSync error', ({ expect }) => {
		class NonStoreClass {
			count = 0;
			increment = () => (this.count += 1);
		}

		const mystore = new NonStoreClass();

		expect(() => useSync(mystore)).toThrowError();
	});
});
