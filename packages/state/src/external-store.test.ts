import { describe, expect, test, vitest } from 'vitest';
import { ExternalStore, SnapshotStore } from './external-store';

describe(ExternalStore, () => {
	test('Subscribe + Notify', () => {
		const store: ExternalStore<string> = new SnapshotStore(() => 'data');

		// Subscribe first listener
		const listener1 = vitest.fn();
		const unsub1 = store.subscribe(listener1);

		store.notify();
		expect(listener1).toBeCalledTimes(1);

		vitest.clearAllMocks();

		// Subscribe second listener
		const listener2 = vitest.fn();
		store.subscribe(listener2);

		store.notify();
		expect(listener1).toBeCalledTimes(1);
		expect(listener2).toBeCalledTimes(1);

		vitest.clearAllMocks();

		// Notify does not affect unsubscribed listeners
		unsub1();
		store.notify();
		expect(listener1).not.toBeCalled();
		expect(listener2).toBeCalledTimes(1);
	});

	test('snapshot', () => {
		const store: ExternalStore<string> = new SnapshotStore(() => 'data');
		expect(store.snapshot()).toBe('data');
	});

	test('observers', () => {
		const store: ExternalStore<string> = new SnapshotStore(() => 'data');

		const mockName = 'observer-name';

		// @ts-ignore
		const notifySpy = vitest.spyOn(store, 'notify');

		store.observeChange(mockName);
		expect(notifySpy).not.toBeCalled();
		notifySpy.mockClear();

		store.addObserver(mockName);

		store.observeChange(mockName);
		expect(notifySpy).toBeCalledTimes(1);
	});

	test('actions', () => {
		const store: ExternalStore<string> = new SnapshotStore(() => 'data');
		const fn = vitest.fn();
		const actionSpy = vitest.spyOn(store, 'action');
		const notifySpy = vitest.spyOn(store, 'notify');

		// internal actions
		store.action(() => {
			fn();
		});

		expect(fn).toBeCalledTimes(1);
		expect(actionSpy).toBeCalledTimes(1);
		expect(notifySpy).toBeCalledTimes(1);

		vitest.clearAllMocks();

		// nested actions
		expect(store.isRunningAction).toBe(false);
		store.action(() => {
			expect(store.isRunningAction).toBe(true);
			store.action(() => {
				fn();
			});
		});
		expect(store.isRunningAction).toBe(false);

		expect(fn).toBeCalledTimes(1);
		expect(actionSpy).toBeCalledTimes(2);
		expect(notifySpy).toBeCalledTimes(1);
	});
});
