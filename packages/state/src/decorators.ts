import { ExternalStore, SnapshotStore } from './external-store';

export const STORE = Symbol('store');
export const EXTERNAL_OBSERVERS = Symbol('observers');
export const EXTERNAL_ACTIONS = Symbol('actions');

type StoreInstance = {
	[STORE]: ExternalStore<any>;
	[EXTERNAL_OBSERVERS]: Set<PropertyKey>;
	[EXTERNAL_ACTIONS]: Set<PropertyKey>;
};

export const store = ((target: new (...args: any[]) => any) => {
	return class extends target implements StoreInstance {
		[STORE]: SnapshotStore<any> = new SnapshotStore(() => {
			const { [STORE]: _, ...store } = this;

			return {
				...store,
				...this[STORE].getActions(),
			};
		});

		[EXTERNAL_OBSERVERS] = (target.prototype[EXTERNAL_OBSERVERS] as Set<PropertyKey>) || new Set();

		[EXTERNAL_ACTIONS] = (target.prototype[EXTERNAL_ACTIONS] as Set<PropertyKey>) || new Set();

		constructor(...args: any[]) {
			super(...args);

			this[EXTERNAL_OBSERVERS].forEach((key) => {
				this[STORE].addObserver(key);
			});

			this[EXTERNAL_ACTIONS].forEach((key) => {
				this[STORE].addAction(key, (this as any)[key].bind(this));
			});

			return new Proxy(this, {
				set: (obj, prop, newval) => {
					const result = Reflect.set(obj, prop, newval);

					obj[STORE].observeChange(prop);

					return result;
				},
			});
		}
	};
}) as ClassDecorator;

export const action: MethodDecorator = (target, propertyKey, descriptor) => {
	const storeInstance = target as StoreInstance;

	const original = descriptor.value as Function;

	if (!storeInstance[EXTERNAL_ACTIONS]) {
		storeInstance[EXTERNAL_ACTIONS] = new Set<PropertyKey>();
	}
	storeInstance[EXTERNAL_ACTIONS].add(propertyKey);

	descriptor.value = function (this: StoreInstance, ...args: any[]) {
		this[STORE].action(() => original.apply(this, args));
	} as any;
};

export const observable: PropertyDecorator = (target, propertyKey) => {
	const storeInstance = target as StoreInstance;
	if (!storeInstance[EXTERNAL_OBSERVERS]) {
		storeInstance[EXTERNAL_OBSERVERS] = new Set<PropertyKey>();
	}
	storeInstance[EXTERNAL_OBSERVERS].add(propertyKey);
};
