import { action, observable, store } from '@ryact-utils/pane';

@store
export class MyStore {
	@observable
	name = 'Ryan';

	@observable
	age = 28;

	@action
	setSelf(self: { name?: string; age?: number }) {
		this.name = self.name ?? this.name;
		this.age = self.age ?? this.age;
	}
}
