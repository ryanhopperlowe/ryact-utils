const proxyCache = new WeakMap<object, any>();
const proxySet = new WeakSet<object>();

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
	const propComputeFns = new Map<PropertyKey, Map<Function, () => void>>();
	const propComputeCleanupFns = new Map<PropertyKey, Set<() => void>>();

	const proxy = new Proxy(target, {
		get: (t, p, r) => {
			if (isComputing()) {
				cleanupComputed(p);

				computeStack.forEach((fn) => {
					subComputed(fn, p);
				});
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

export function batch<T>(fn: () => T) {
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

const computeStack: Function[] = [];
const isComputing = () => computeStack.length > 0;
const computedCache = new WeakMap<Function, ComputedState>();

type ComputedFn<T = any> = {
	(): T;
	bindProxy: (proxy: object) => ComputedFn<T>;
};

export function computed<T>(fn: () => T): ComputedFn<T> {
	let boundFn = fn;

	const res = () => {
		const info = computedCache.get(boundFn) ?? ({ isValid: false } as ComputedState);

		if (info.isValid) {
			console.log('cache hit');

			return info.cachedValue as T;
		}

		try {
			console.log('cache miss: start computing');

			computeStack.push(boundFn);

			computedCache.set(boundFn, info);

			const value = boundFn();
			info.isValid = true;
			info.cachedValue = value;

			return value;
		} finally {
			computeStack.pop();
		}
	};

	res.bindProxy = (proxy: any) => {
		boundFn = fn.bind(proxy);
		return res;
	};

	return res;
}

function invalidateComputed(fn: Function) {
	console.log('invalidate computed');

	const info = computedCache.get(fn);
	if (info) {
		info.isValid = false;
	}
}

export function subscribeProxy<T extends object>(proxy: T, listener: Listener) {
	const listeners = proxyListeners.get(proxy);

	if (listeners) {
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	}

	throw new Error('Cannot subscribe to non-proxy object');
}

export function getProxySnapshot<T extends object>(proxy: T) {
	const snapshot = new Proxy(proxy, {
		get(t, p, r) {
			const value = Reflect.get(t, p, r);
			if (typeof value === 'object' && value !== null) {
				return getProxySnapshot(value);
			}

			if (typeof value === 'function') {
				return value.bind(proxy);
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

		const proxy = makeProxy(this);

		this.versionGreeting.bindProxy(proxy);
		this.greeting.bindProxy(proxy);
		this.greetings.bindProxy(proxy);

		return proxy;
	}

	setName(name: string) {
		this.info.name = name;
	}

	setAge(age: number) {
		this.info.age = age;
	}

	incVersion() {
		this.version += 1;
	}

	greeting = computed(function (this: Person) {
		return `Hello, I'm ${this.info.name} and I'm ${this.info.age} years old.`;
	});

	versionGreeting = computed(function (this: Person) {
		return `Version ${this.version}`;
	});

	greetings = computed(function (this: Person) {
		return [this.versionGreeting(), this.greeting()].join(' - ');
	});
}

type Prettify<T extends object> = {
	[K in keyof T]: T[K];
} & {};

export function makeStore<T extends object, C extends Record<Exclude<string, keyof T>, () => any>>(
	init: T,
	extension?: C,
): Prettify<T & C> {
	if (init === null || typeof init !== 'object') {
		throw new Error('init must be a non-null object');
	}

	const proxy = makeProxy(init);
	if (!extension) {
		return proxy as T & C;
	}

	for (const [key, value] of Object.entries(extension) as [keyof C, () => any][]) {
		(proxy as any)[key] = computed(value.bind(proxy));
	}

	return proxy as T & C;
}

const ryan = new Person();

let snap = getProxySnapshot(ryan);
console.log(snap.greetings());
console.log(snap.greetings());
snap.incVersion();
snap = getProxySnapshot(ryan);
console.log(snap.greetings());

// const people = makeStore(
// 	{ version: 1, info: { name: 'Alice', age: 30 } },
// 	{
// 		getGreeting: () => `Hello, I'm ${people.info.name} and I'm ${people.info.age} years old.`,
// 		getVersion: () => `Version ${people.version}`,
// 		getVersionGreeting: () => [people.getVersion(), people.getGreeting()].join(' - '),
// 	},
// );

// console.log(people.getVersionGreeting());
// console.log(people.getVersionGreeting());
// console.log(people.getVersion());
// console.log(people.getGreeting());

// people.version = 2;
// console.log(people.getVersionGreeting());
// console.log(people.getVersion());
// console.log(people.getGreeting());
