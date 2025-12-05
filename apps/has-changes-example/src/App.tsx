import './App.css';

import { useShallowStore } from '@ryact-utils/pane/react';
import { MyStore } from './store';

// function App() {
// 	const [count, setCount] = useState(0);

// 	const [eventsFired, setEventsFired] = useState(0);

// 	const [hasChanged, prev] = useHasChanged({ count });
// 	if (hasChanged) {
// 		setEventsFired((prev) => prev + 1);
// 		console.log('previous: ' + prev);

// 		if (count > 5) {
// 			console.log('Count is greater than 5');
// 		}
// 	}

// 	return (
// 		<>
// 			<h2>Events fired: {eventsFired}</h2>

// 			<div className="card">
// 				<button onClick={() => setCount((count) => count + 1)}>count is {count}</button>
// 			</div>
// 		</>
// 	);
// }

// export default App;

const globalStore = new MyStore();

export default function App() {
	const store = useShallowStore(globalStore.store);

	return (
		<div>
			<input onChange={(e) => store.setName(e.target.value)} />
			<input pattern="[0-9]*" onChange={(e) => store.setAge(+e.target.value)} />

			<h2>Hello, My name is {store.name}</h2>
			<h4>I am {store.age} years old</h4>
		</div>
	);
}
