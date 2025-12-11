import { SnapshotStore } from './external-store';

type Constructor = new (...args: any[]) => {};
type ObserveCallback = (fieldName: PropertyKey, oldValue: any, newValue: any) => void;

const OBSERVABLES = Symbol('observables');
const STORE = Symbol('store');

type HiddenStore = {
	[OBSERVABLES]: Set<Function>;
	[STORE]: SnapshotStore<any>;
};

const store = () => {
	return <T extends Constructor>(target: T, _context: ClassDecoratorContext) => {
		return class extends target implements HiddenStore {
			[OBSERVABLES] = new Set<ObserveCallback>();

			[STORE] = new SnapshotStore(() => ({ ...this }));

			constructor(...args: any[]) {
				super(...args);

				return new Proxy(this, {
					get(t, p, r) {
						return Reflect.get(t, p, r);
					},
					set(t, p, value, r) {
						return Reflect.set(t, p, value, r);
					},
				});
			}
		};
	};
};

const observable = () => {
	return (_target: undefined, context: ClassFieldDecoratorContext) => {
		const fieldName = String(context.name);

		// Use a private symbol to store the actual backing data securely
		const privateStoreKey = Symbol(fieldName);

		context.addInitializer(function (this: any) {
			const initialValue = this[fieldName];

			// We assume the makeObservable decorator has been applied and 'notify' exists
			const observableInstance = this as HiddenStore;

			// Redefine the property on the instance using Object.defineProperty
			Object.defineProperty(this, fieldName, {
				get() {
					return this[privateStoreKey];
				},
				set(newValue: any) {
					const oldValue = this[privateStoreKey];
					this[privateStoreKey] = newValue;
					// Call the notification function provided by the class decorator
					if (!Object.is(oldValue, newValue)) {
						observableInstance[STORE].notify();
					}
				},
			});

			this[privateStoreKey] = initialValue;
		});
	};
};

@store()
class MyClass {
	@observable() count = 0;

	increment() {
		this.count += 1;
	}
}

const instance = new MyClass();
console.log(instance.count);

instance.increment();

const { count } = instance;
console.log(count);
