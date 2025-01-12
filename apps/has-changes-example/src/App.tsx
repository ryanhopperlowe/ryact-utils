import { useState } from 'react';
import './App.css';

import { useHasChanged } from '@ryact-utils/has-changes';

function App() {
	const [count, setCount] = useState(0);

	const [eventsFired, setEventsFired] = useState(0);

	const [hasChanged, prev] = useHasChanged([]);
	if (hasChanged) {
		setEventsFired((prev) => prev + 1);
		console.log('previous: ' + prev);

		if (count > 5) {
			console.log('Count is greater than 5');
		}
	}

	return (
		<>
			<h2>Events fired: {eventsFired}</h2>
			<div className="card">
				<button onClick={() => setCount((count) => count + 1)}>count is {count}</button>
			</div>
		</>
	);
}

export default App;
