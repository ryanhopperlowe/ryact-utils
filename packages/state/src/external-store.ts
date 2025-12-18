import { nanoid } from 'nanoid';

export const ACTION_DEPTH = Symbol('action_running');
export const OBSERVERS = Symbol('observers');

export abstract class ExternalStore<State> {
	protected readonly listeners: Set<() => void> = new Set();

	public abstract readonly snapshot: () => State;

	public readonly subscribe = (listener: () => void) => {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	};

	public notify = () => {
		this.listeners.forEach((notify) => notify());
		console.log('rerender!!');
	};
}

export class SnapshotStore<State> extends ExternalStore<State> {
	private readonly getSnapshot: () => State;

	constructor(getSnapshot: () => State) {
		super();
		this.getSnapshot = getSnapshot;
	}

	public readonly snapshot = () => {
		const snapshot = this.getSnapshot();
		return snapshot;
	};
}

type ObservableRecord<T extends object> = { [Key in keyof T]: Observable<T[Key]> };

export class ObservableObject<T extends object = any> implements Observable<T> {
	private observables: ObservableRecord<any>;
	private state: T;

	private cleanupFns = new Set<() => void>();

	private getObservers = new Set<() => void>();
	private setObservers = new Set<() => void>();

	private actionDepth = 0;
	get isRunningAction() {
		return this.actionDepth > 0;
	}

	constructor(init: ObservableRecord<T>) {
		// init state property
		this.observables = {} as ObservableRecord<T>;
		this.state = {} as T;
		for (const [key, val] of Object.entries(init)) {
			this.initProperty(key, val as Observable);
		}

		const allObservables: Observable[] = Object.values(this.observables);
		const computables = allObservables.filter((o) => o instanceof ComputedValue);

		// subscribe computables
		for (const computable of computables) {
			allObservables
				.filter((o) => o != computable) // don't watch self
				.map((o) => computable.watchObservable(o))
				.forEach((unsub) => this.cleanupFns.add(unsub));
		}

		computables.forEach((c) => c.init());

		const values = allObservables.filter((o) => o instanceof ObservableRef);
		values
			.map((o) =>
				o.observeSet(() => {
					if (!this.isRunningAction) {
						this.setObservers.forEach((notify) => notify());
					}
				}),
			)
			.forEach((unsub) => this.cleanupFns.add(unsub));

		allObservables
			.map((o) => o.observeGet(() => this.getObservers.forEach((notify) => notify())))
			.forEach((unsub) => this.cleanupFns.add(unsub));
	}

	readonly get = () => this.state;

	readonly observeGet = (notify: () => void) => {
		this.getObservers.add(notify);

		return () => void this.getObservers.delete(notify);
	};

	readonly observeSet = (notify: () => void) => {
		this.setObservers.add(notify);
		return () => void this.setObservers.delete(notify);
	};

	private readonly initProperty = (key: string | number, observable: Observable) => {
		this.observables[key] = observable;

		const descriptor: PropertyDescriptor = {
			get: () => observable.get(),
		};

		if (observable instanceof ObservableRef) {
			descriptor.set = (val) => observable.set(val);
		}

		Object.defineProperty(this.state, key, descriptor);
	};

	public readonly action = <T>(fn: () => T) => {
		this.actionDepth += 1;
		const response = fn();
		this.actionDepth -= 1;

		if (!this.isRunningAction) {
			this.setObservers.forEach((notify) => notify());
		}

		return response;
	};

	public readonly actionDef = <Args extends unknown[], T>(fn: (...args: Args) => T) => {
		return (...args: Args) => this.action(() => fn(...args));
	};
}

interface Observable<T = any> {
	get: () => T;
	observeGet: (notify: () => void) => () => void;
	observeSet: (notify: () => void) => () => void;
}

export class ComputedValue<T = unknown> implements Observable<T> {
	readonly id: Id = nanoid();

	private readonly computeFn: () => T;
	private cachedValue!: T;
	private invalid!: boolean;

	private watching = new Set<Observable>();
	private deps = new Map<Observable, () => void>();

	private getObservers = new Set<() => void>();
	private setObservers = new Set<() => void>();

	constructor(compute: () => T) {
		this.computeFn = compute;
		// this.recompute();
	}

	public readonly init = () => this.recompute();

	public readonly watchObservable = (observable: Observable) => {
		this.watching.add(observable);
		return () => this.watching.delete(observable);
	};

	public readonly unwatchObservable = (observable: ObservableRef) => {
		this.watching.delete(observable);
		this.deps.delete(observable);
	};

	public readonly observeGet = (notify: () => void) => {
		this.getObservers.add(notify);
		return () => this.getObservers.delete(notify);
	};

	public readonly observeSet = (notify: () => void) => {
		this.setObservers.add(notify);
		return () => this.setObservers.delete(notify);
	};

	public readonly invalidate = () => void (this.invalid = true);

	public readonly recompute = () => {
		// subscribe to all observable getters
		const getterSubs = Array.from(this.watching).map((o) => {
			if (this.deps.has(o)) return;

			return o.observeGet(() => {
				// when an observer is read during computation, store it as a dependency
				const unsub = o.observeSet(() => this.invalidate());
				this.deps.set(o, unsub);
			});
		});

		// compute value and cache for later
		console.log('recomputing');

		this.cachedValue = this.computeFn();
		this.setObservers.forEach((notify) => notify());

		// unsubscribe from observable getters
		getterSubs.forEach((unsub) => unsub?.());

		this.invalid = false;
		return this.cachedValue;
	};

	public readonly get = () => {
		this.getObservers.forEach((notify) => notify());

		return this.invalid ? this.recompute() : this.cachedValue;
	};
}

type Comparator<T> = (before: T, after: T) => boolean;

export class ObservableRef<T = any> implements Observable<T> {
	private comparator: Comparator<T>;

	private _value: T;
	private setObservers = new Set<() => void>();
	private getObservers = new Set<() => void>();

	constructor(initialValue: T, comparator: Comparator<T> = Object.is) {
		this._value = initialValue;
		this.comparator = comparator;
	}

	public set(newValue: T) {
		let isNotChanged = this.comparator(this._value, newValue);

		this._value = newValue;

		if (isNotChanged) return;

		console.log('notify set ' + newValue);

		this.setObservers.forEach((notify) => notify());
	}

	public get() {
		this.getObservers.forEach((notify) => notify());
		return this._value;
	}

	public peek() {
		return this._value;
	}

	public readonly observeGet = (notify: () => void) => {
		this.getObservers.add(notify);
		return () => void this.getObservers.delete(notify);
	};

	public readonly observeSet = (notify: () => void) => {
		this.setObservers.add(notify);
		return () => void this.setObservers.delete(notify);
	};
}

class Person {
	// @observable
	name = new ObservableRef('Ryan');
	// @observable
	age = new ObservableRef(28);

	// @computed get
	greeting = new ComputedValue(() => `Hello, I'm ${this.name.get()} nice to meet you!`);

	// will be hidden behind the @store decorator
	manager = new ObservableObject({ name: this.name, age: this.age, greeting: this.greeting });
	store = new SnapshotStore(() => this.manager.get());

	constructor() {
		this.manager.observeSet(() => this.store.notify());
	}

	setName(name: string) {
		this.name.set(name);
	}

	setAge(age: number) {
		this.age.set(age);
	}
}

const person = new Person();
person.setAge(10);
console.log(person.store.snapshot().greeting);
person.setName('hi');
console.log(person.store.snapshot().greeting);
