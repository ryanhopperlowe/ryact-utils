const proxyCache = new WeakMap<object, any>();

type Listener = () => void;

const proxyListeners = new WeakMap<object, Set<Listener>>();
const cleanupListeners = new WeakMap<object, () => void>();

let batchDepth = 0;
let isBatching = false;
const pendingUpdates = new Set<object>();
const batchNotified = new Set<object>();

function makeProxy<T extends object>(target: T) {
	if (proxySet.has(target)) {
		return target;
	}

	if (proxyCache.has(target)) {
		return proxyCache.get(target) as T;
	}

	const listeners = new Set<Listener>();
	const cleanupFns = new Set<() => void>();
	const propCleanupFns = new WeakMap<object, Listener>();

	const proxy = new Proxy(target, {
		get: (t, p, r) => {
			if (currentCompute) {
				cleanupComputed(p);
				subComputed(currentCompute, p);
			}

			return Reflect.get(t, p, r);
		},
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
				notifyComputedDepChanged(p);
				handleNotify();
			}

			return result;
		},
		deleteProperty: (t, p) => {
			const existing = Reflect.get(t, p);

			notifyComputedDepChanged(p);
			cleanupComputed(p);

			cleanupProp(existing);

			const result = Reflect.deleteProperty(t, p);

			if (result && existing !== undefined) {
				handleNotify();
			}

			return result;
		},
	});

	proxySet.add(proxy);
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

	function notifyComputedDepChanged(prop: PropertyKey) {
		const computeFns = propComputeFns.get(prop);
		if (computeFns) {
			computeFns.forEach((notify) => notify());
		}
	}

	function subComputed(computedFn: Function, prop: PropertyKey) {
		if (!computedFn) return;

		if (computedCache.has(computedFn)) {
			console.log('compute dep added: ', prop);

			const invalidateFn = () => invalidateComputed(computedFn);
			const propComputeMap = propComputeFns.get(prop) || new Map<Function, () => void>();
			propComputeMap.set(computedFn, invalidateFn);
			propComputeFns.set(prop, propComputeMap);
		}
	}

	function cleanupComputed(prop: PropertyKey) {
		const cleanupFns = propComputeCleanupFns.get(prop);
		if (cleanupFns) {
			cleanupFns.forEach((cleanup) => cleanup());
			propComputeCleanupFns.delete(prop);
		}
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

type ComputedState = {
	cachedValue: any;
	isValid: boolean;
};

let currentCompute: Function | null = null;
const computedCache = new WeakMap<Function, ComputedState>();

function computed<T>(fn: () => T) {
	return () => {
		const info = computedCache.get(fn) ?? ({ isValid: false } as ComputedState);

		if (info.isValid) {
			return info.cachedValue as T;
		}

		try {
			currentCompute = fn;

			computedCache.set(fn, info);

			const value = fn();

			info.isValid = true;
			info.cachedValue = value;

			return value;
		} finally {
			currentCompute = null;
		}
	};
}

function invalidateComputed(fn: Function) {
	const info = computedCache.get(fn);
	if (info) {
		info.isValid = false;
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
