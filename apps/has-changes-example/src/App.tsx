import { memo } from 'react';
import { useSync } from '@ryact-utils/pane/react';
import { MyStore } from './store';
import './App.css';

const globalStore = new MyStore();

export default function App() {
	const store = useSync(globalStore);

	return (
		<div>
			<input onChange={(e) => store.setSelf({ name: e.target.value })} value={store.name} />
			<input
				pattern="[0-9]*"
				onChange={(e) => store.setSelf({ age: +e.target.value })}
				value={store.age.toString()}
			/>

			<button onClick={() => store.setSelf({ name: 'Mia', age: 35 })}>Reset</button>

			<Name />
			<Age />
		</div>
	);
}

const Name = memo(() => {
	const name = useSync(globalStore, (store) => store.name);
	const setSelf = useSync(globalStore, (store) => store.setSelf);

	return (
		<div>
			<h3>Name Component</h3>
			<h2>Hello, My name is {name}</h2>
			<input onChange={(e) => setSelf({ name: e.target.value })} value={name} />
		</div>
	);
});

const Age = memo(() => {
	const store = useSync(globalStore, ({ age, setSelf }) => ({ age, setSelf }));

	return (
		<div>
			<h2>Age Component</h2>
			<h4>I am {store.age} years old</h4>
			<input onChange={(e) => store.setSelf({ age: +e.target.value })} value={store.age} />
		</div>
	);
});
