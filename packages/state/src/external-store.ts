export const ACTION_DEPTH = Symbol('action_running');
export const OBSERVERS = Symbol('observers');

export abstract class ExternalStore<State> {
	private readonly listeners: Set<() => void> = new Set();

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

	public readonly notify = () => {
		this.listeners.forEach((notify) => notify());
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
