import { nanoid } from 'nanoid';

export const ACTION_DEPTH = Symbol('action_running');
export const OBSERVERS = Symbol('observers');

export abstract class ExternalStore<State> {
	protected readonly listeners: Set<() => void> = new Set();

	public abstract readonly snapshot: () => State;

	private [ACTION_DEPTH] = 0;
	private readonly [OBSERVERS] = new Set<PropertyKey>();

	public get isRunningAction() {
		return this[ACTION_DEPTH] > 0;
	}

	public readonly addObserver = (key: PropertyKey) => {
		this[OBSERVERS].add(key);
	};

	public readonly removeObserver = (id: PropertyKey) => this[OBSERVERS].delete(id);

	public readonly action = <T>(action: () => T) => {
		this[ACTION_DEPTH] += 1;
		const result = action();
		this[ACTION_DEPTH] -= 1;

		if (this[ACTION_DEPTH] === 0) {
			// only notify when the outermost synchronous action completes
			this.notify();
		}

		return result;
	};

	public readonly observeChange = (id: PropertyKey) => {
		if (this[OBSERVERS].has(id) && !this.isRunningAction) {
			this.notify();
		}
	};

	public readonly subscribe = (listener: () => void) => {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	};

	public notify = () => {
		this.listeners.forEach((notify) => notify());
		console.log('notify!!');
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

class ObservableManager {
	observables = new Set<Observable<any>>();
	computables = new Set<Computable<any>>();
	computeSubs = new Set<() => void>();

	computedDeps: Map<Computable, Set<Observable>> = new Map();

	computing = new Set<Id>();

	private readonly watchComputedObservable = (computed: Computable, observable: Observable) => {
		if (!this.computedDeps.has(computed)) {
			this.computedDeps.set(computed, new Set());
		}

		const deps = this.computedDeps.get(computed)!;

		if (deps.has(observable)) return;

		let unsubSet: () => void;

		const unsubGet = observable.observeGet(() => {
			deps.add(observable);
			unsubSet = observable.observeSet(() => computed.invalidate());
		});

		return () => {
			unsubGet();
			unsubSet();
		};
	};

	readonly addComputed = <T>(computed: Computable<T>) => {
		this.computables.add(computed);
		const observerUnsubs = new Set<() => void>();

		const unsubFromCompute = this.subscribeComputed(computed);

		return () => {
			unsubFromCompute();
			observerUnsubs.forEach((unsub) => unsub());
			this.computables.delete(computed);
		};
	};

	private readonly subscribeComputed = <T>(computed: Computable<T>) => {
		return computed.subscribeCompute(() => {
			const unsubs = Array.from(this.observables).map((o) => {
				return this.watchComputedObservable(computed, o);
			});

			return () => unsubs.forEach((unsub) => unsub?.());
		});
	};

	private readonly cleanupComputedSubscriptions = () => {
		this.computeSubs.forEach((unsub) => unsub());
	};

	readonly subscribeChanges = (notify: () => void) => {
		const unsubs = Array.from(this.observables).map((o) => o.observeSet(() => notify()));
		return () => unsubs.forEach((unsub) => unsub());
	};

	readonly addObserver = <T>(observable: Observable<T>) => {
		this.observables.add(observable);

		this.cleanupComputedSubscriptions();

		const unsubs = Array.from(this.computables).map((c) => this.subscribeComputed(c));
		unsubs.forEach((unsub) => this.computeSubs.add(unsub));

		return () => void this.observables.delete(observable);
	};
}

type Listener = (id: Id) => void;
type Subscriber = (id: Id) => void | ((id: Id) => void);

export class Computable<T = unknown> {
	readonly id: Id = nanoid();

	private readonly compute: () => T;
	private cachedValue!: T;
	private invalid!: boolean;
	private subscribers = new Set<Subscriber>();

	constructor(compute: () => T) {
		this.compute = compute;
		this.recompute();
	}

	public readonly subscribeCompute = (subscriber: Subscriber) => {
		this.subscribers.add(subscriber);
		return () => void this.subscribers.delete(subscriber);
	};

	public readonly invalidate = () => void (this.invalid = true);

	public readonly recompute = () => {
		const endSubscribers = Array.from(this.subscribers).map((notifyStart) => notifyStart(this.id));

		this.cachedValue = this.compute();

		endSubscribers.forEach((notifyEnd) => notifyEnd?.(this.id));

		this.invalid = false;
		return this.cachedValue;
	};

	public readonly get = () => {
		return this.invalid ? this.recompute() : this.cachedValue;
	};
}

type Comparator<T> = (before: T, after: T) => boolean;

export class Observable<T = unknown> {
	readonly id: Id = nanoid();

	private comparator: Comparator<T>;

	private _value: T;
	private setObservers = new Set<(id: Id) => void>();
	private getObservers = new Set<(id: Id) => void>();

	constructor(initialValue: T, comparator: Comparator<T> = Object.is) {
		this._value = initialValue;
		this.comparator = comparator;
	}

	public get val() {
		return this.getValue();
	}

	public set val(newValue: T) {
		this.setValue(newValue);
	}

	public setValue(newValue: T) {
		if (this.comparator(this._value, newValue)) return;

		this._value = newValue;
		this.setObservers.forEach((notify) => notify(this.id));
	}

	public getValue() {
		this.getObservers.forEach((notify) => notify(this.id));
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

type Compute<T, U = unknown> = (state: T) => U;

type ObservableState<T extends object> = {
	[Key in keyof T]: Observable<T[Key]>;
};

type ComputeMethods<State extends object, ComputedState extends object> = {
	[Key in keyof ComputedState]: (state: ObservableState<State>) => ComputedState[Key];
};

type ComputableState<T extends Object> = {
	[Key in keyof T]: Computable<T[Key]>;
};

export class ObservableStore<
	State extends object,
	ComputedState extends object = { [key: string]: never },
> {
	private observableMap: ObservableState<State>;
	private computableMap: ComputableState<ComputedState>;

	private observableState = new ObservableManager();

	private cleanupFns = new Set<() => void>();

	private state: State;
	private computed: ComputedState;

	constructor(initialState: State, computeds: ComputeMethods<State, ComputedState> = {} as any) {
		this.observableMap = {} as any;
		this.state = {} as any;
		for (const [key, init] of Object.entries(initialState)) {
			this.initProperty(key as keyof State, init);
		}

		this.computableMap = {} as any;
		this.computed = {} as any;
		for (const [key, compute] of Object.entries(computeds)) {
			this.initComputable(key as keyof ComputedState, compute as any);
		}
	}

	private readonly initProperty = <TProp extends keyof State>(prop: TProp, init: State[TProp]) => {
		const observable = new Observable(init);
		this.observableMap[prop] = observable;
		Object.defineProperty(this.state, prop, {
			get: () => observable.getValue(),
			set: (val) => observable.setValue(val),
		});
		const unsub = this.observableState.addObserver(observable);
		this.cleanupFns.add(unsub);
	};

	private readonly initComputable = <TProp extends keyof ComputedState>(
		prop: TProp,
		compute: (state: ObservableState<State>) => ComputedState[TProp],
	) => {
		const computed = new Computable(() => compute(this.observableMap));
		this.computableMap[prop] = computed;
		Object.defineProperty(this.computed, prop, {
			get: () => computed.get(),
			writable: false,
		});
		const unsub = this.observableState.addComputed(computed);
		this.cleanupFns.add(unsub);
	};
}

console.log(x);
