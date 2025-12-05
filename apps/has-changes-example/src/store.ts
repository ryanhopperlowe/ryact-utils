import { SnapshotStore } from '@ryact-utils/pane';

export class MyStore {
	readonly store = new SnapshotStore(() => ({
		name: this.name,
		age: this.age,
		setName: this.setName,
		setAge: this.setAge,
	}));

	name = 'Ryan';
	age = 28;

	readonly setName = (name: string) => {
		this.name = name;
		this.store.notify();
	};

	readonly setAge = (age: number) => {
		this.age = age;
		this.store.notify();
	};
}
