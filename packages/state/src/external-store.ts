export abstract class ExternalStore<State> {
	private readonly listeners: Set<() => void> = new Set();

	public abstract readonly snapshot: () => State;

	public readonly action = <U extends void | Promise<void>>(
		action: () => U,
	): U extends Promise<void> ? Promise<void> : void => {
		const result = action();

		if (result instanceof Promise) return result.then(() => this.notify()) as any;

		return this.notify() as any;
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

	public readonly snapshot = () => this.getSnapshot();
}
