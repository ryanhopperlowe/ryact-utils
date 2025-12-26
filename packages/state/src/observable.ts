const proxyCache = new WeakMap<object, any>();

type Listener = () => void;

const proxyListeners = new WeakMap<object, Set<Listener>>();
const cleanupListeners = new WeakMap<object, () => void>();

let batchDepth = 0;
let isBatching = false;
const pendingUpdates = new Set<object>();
const batchNotified = new Set<object>();

function makeProxy<T extends object>(target: T) {
	if (proxyCache.has(target)) {
		return proxyCache.get(target) as T;
	}

	const listeners = new Set<Listener>();
	const cleanupFns = new Set<() => void>();
	const propCleanupFns = new WeakMap<object, Listener>();

	const proxy = new Proxy(target, {
		set: (t, p, v, r) => {
			let newVal = v;

			const existing = Reflect.get(t, p, r);

			cleanupProp(existing);

			if (typeof v === 'object' && v !== null) {
				newVal = makeProxy(v);
				subProp(newVal);
			}

			const hasChanged = !Object.is(existing, newVal);
			const result = Reflect.set(t, p, newVal, r);

			if (hasChanged && result) {
				handleNotify();
			}

			return result;
		},
		deleteProperty: (t, p) => {
			const existing = Reflect.get(t, p);

			cleanupProp(existing);

			const result = Reflect.deleteProperty(t, p);

			if (result && existing !== undefined) {
				handleNotify();
			}

			return result;
		},
	});

	proxyCache.set(target, proxy);
	proxyListeners.set(proxy, listeners);
	cleanupListeners.set(proxy, () => {
		cleanupFns.forEach((fn) => fn());
	});

	for (const [key, value] of Object.entries(target)) {
		proxy[key as keyof T] = value;
	}

	return proxy;

	function handleNotify() {
		notifyProxy(proxy);
	}

	function cleanupProp(obj: unknown) {
		if (typeof obj === 'object' && obj !== null && propCleanupFns.has(obj)) {
			propCleanupFns.get(obj)!();
		}
	}

	function subProp(obj: object) {
		const propListeners = proxyListeners.get(obj);
		if (propListeners) {
			propListeners.add(handleNotify);

			const cleanup = () => propListeners.delete(handleNotify);
			propCleanupFns.set(obj, cleanup);
			cleanupFns.add(cleanup);
		}
	}
}

function notifyProxy<T extends object>(proxy: T) {
	if (isBatching) {
		pendingUpdates.add(proxy);
		return;
	}

	if (batchNotified.has(proxy)) {
		return;
	}

	const listeners = proxyListeners.get(proxy);
	if (listeners) {
		listeners.forEach((listener) => listener());
	}

	if (pendingUpdates.size > 0) {
		batchNotified.add(proxy);
	}
}

function startBatch() {
	batchDepth += 1;
	isBatching = true;
}

function endBatch() {
	batchDepth -= 1;

	if (batchDepth <= 0) {
		isBatching = false;
		// Notify all pending updates
		pendingUpdates.forEach((proxy) => {
			notifyProxy(proxy);
		});

		pendingUpdates.clear();
		batchNotified.clear();
	}
}

function batch<T>(fn: () => T) {
	startBatch();
	try {
		return fn();
	} finally {
		endBatch();
	}
}

function subscribeProxy<T extends object>(proxy: T, listener: Listener) {
	const listeners = proxyListeners.get(proxy);

	if (listeners) {
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	}

	throw new Error('Cannot subscribe to non-proxy object');
}

function getProxySnapshot<T extends object>(proxy: T) {
	const snapshot = new Proxy(proxy, {
		get(t, p, r) {
			const value = Reflect.get(t, p, r);
			if (typeof value === 'object' && value !== null) {
				return getProxySnapshot(value);
			}
			return value;
		},
		set() {
			throw new Error('Cannot set value on snapshot');
		},
		deleteProperty() {
			throw new Error('Cannot delete property on snapshot');
		},
	});

	return snapshot;
}

class Person {
	info: { name: string; age: number };
	version: number;

	constructor() {
		this.info = { name: 'Alice', age: 30 };
		this.version = 1;
	}

	setName(name: string) {
		this.info.name = name;
	}

	setAge(age: number) {
		this.info.age = age;
	}
}
