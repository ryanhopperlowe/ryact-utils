const proxyCache = new WeakMap<object, any>();

type Listener = () => void;

const proxyListeners = new WeakMap<object, Set<Listener>>();
const cleanupListeners = new WeakMap<object, () => void>();

function makeProxy<T extends object>(target: T) {
	if (proxyCache.has(target)) {
		return proxyCache.get(target) as T;
	}

	const listeners = new Set<Listener>();
	const cleanupFns = new Set<() => void>();
	const propCleanupFns = new WeakMap<object, Listener>();

	const handleNotify = () => {
		listeners.forEach((listener) => listener());
	};

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

			if (typeof existing === 'object' && existing !== null && propCleanupFns.has(existing)) {
				propCleanupFns.get(existing)!();
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

const observable = makeProxy(new Person());

subscribeProxy(observable, () => {
	console.log('Observable changed:', getProxySnapshot(observable));
});

console.log(observable);

const ogInfo = observable.info;
subscribeProxy(ogInfo, () => {
	console.log('OG Info changed:', getProxySnapshot(ogInfo));
});

ogInfo.age = 10;

observable.info = { name: 'Bob', age: 25 };
observable.info.name = 'Dave';

ogInfo.name = 'Charlie';
