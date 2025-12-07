import { useSync } from '@ryact-utils/pane';
import { MyStore } from './store';
import './App.css';

const globalStore = new MyStore();

setTimeout(() => {
	globalStore.age += 1;
}, 5000);

export default function App() {
	const store = useSync(globalStore);

	return (
		<div>
			<input onChange={(e) => store.setSelf({ name: e.target.value })} />
			<input pattern="[0-9]*" onChange={(e) => store.setSelf({ age: +e.target.value })} />

			<button onClick={() => store.setSelf({ name: 'Mia', age: 35 })}>Reset</button>

			<h2>Hello, My name is {store.name}</h2>
			<h4>I am {store.age} years old</h4>
		</div>
	);
}
