import { ExternalStore, SnapshotStore } from './external-store';

export const STORE = Symbol('store');
export const SNAPSHOT = Symbol('snapshot');
export const EXTERNAL_OBSERVERS = Symbol('observers');
export const EXTERNAL_ACTIONS = Symbol('actions');
export const ACTIONS = Symbol('actions');

type StoreInstance = {
	[STORE]: ExternalStore<any>;
	[SNAPSHOT]: () => any;
	[EXTERNAL_OBSERVERS]: Set<PropertyKey>;
	[EXTERNAL_ACTIONS]: Set<PropertyKey>;
	[ACTIONS]: Record<PropertyKey, (...args: any[]) => any>;
};

export const store = ((target: new (...args: any[]) => any) => {
	return class extends target implements StoreInstance {
		[SNAPSHOT] = () => ({ ...this, ...this[ACTIONS] });

		[STORE]: SnapshotStore<any> = new SnapshotStore(() => this[SNAPSHOT]());

		[EXTERNAL_OBSERVERS] = (target.prototype[EXTERNAL_OBSERVERS] as Set<PropertyKey>) || new Set();

		[EXTERNAL_ACTIONS] = (target.prototype[EXTERNAL_ACTIONS] as Set<PropertyKey>) || new Set();

		[ACTIONS] = {};

		constructor(...args: any[]) {
			super(...args);

			this[ACTIONS] = Array.from(this[EXTERNAL_ACTIONS]).reduce(
				(acc, key) => {
					acc[key] = this[key as any].bind(this);
					return acc;
				},
				{} as Record<PropertyKey, (...args: any[]) => any>,
			);

			return new Proxy(this, {
				set: (obj, prop, newval) => {
					const result = Reflect.set(obj, prop, newval);

					if (this[EXTERNAL_OBSERVERS].has(prop) && !this[STORE].isRunningAction) {
						this[STORE].notify();
					}

					return result;
				},
			});
		}
	};
}) as ClassDecorator;

export const action: MethodDecorator = (target, propertyKey, descriptor) => {
	const storeInstance = target as StoreInstance;
	const original = descriptor.value as Function;

	descriptor.value = function (this: StoreInstance, ...args: any[]) {
		this[STORE].action(() => original.apply(this, args));
	} as any;

	if (!storeInstance[EXTERNAL_ACTIONS]) {
		storeInstance[EXTERNAL_ACTIONS] = new Set();
	}
	storeInstance[EXTERNAL_ACTIONS].add(propertyKey);
};

export const observable: PropertyDecorator = (target, propertyKey) => {
	const storeInstance = target as StoreInstance;
	if (!storeInstance[EXTERNAL_OBSERVERS]) {
		storeInstance[EXTERNAL_OBSERVERS] = new Set<PropertyKey>();
	}
	storeInstance[EXTERNAL_OBSERVERS].add(propertyKey);
};
