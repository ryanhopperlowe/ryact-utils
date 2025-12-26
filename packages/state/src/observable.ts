import { cleanup } from '@testing-library/react';
const proxyCache = new WeakMap<object, any>();

type Listener = () => void;

const proxyListeners = new WeakMap<object, Set<Listener>>();
const cleanupListeners = new WeakMap<object, () => void>();

function makeProxy<T extends object>(target: T) {
	if (proxyCache.has(target)) {
		return proxyCache.get(target) as T;
	}

	const listeners = new Set<Listener>();

	const handleNotify = () => {
		listeners.forEach((listener) => listener());
	};

	const proxy = new Proxy(target, {
		set: (t, p, v, r) => {
			debugger;
			const existing = Reflect.get(t, p, r);

			let newVal = v;

			if (typeof v === 'object' && v !== null) {
				newVal = makeProxy(v);

				const propListeners = proxyListeners.get(newVal);
				if (propListeners) {
					propListeners.add(handleNotify);
				}
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
			const result = Reflect.deleteProperty(t, p);

			if (result && existing !== undefined) {
				handleNotify();
			}

			return result;
		},
	});

	proxyCache.set(target, proxy);
	proxyListeners.set(proxy, listeners);

	for (const [key, value] of Object.entries(target)) {
		proxy[key as keyof T] = value;
	}

	return proxy;
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

console.log(observable);

subscribeProxy(observable, () => {
	console.log('Observable changed:', getProxySnapshot(observable));
});

console.log(getProxySnapshot(observable));
observable.setName('Bob');
observable.setAge(31);
