# @ryact-utils/has-changes

A lightweight React hook utility that helps eliminate unnecessary `useEffect` usage by providing a simple way to detect value changes. Instead of setting up effects to track value changes, this hook gives you direct access to change detection and previous values.

After reading [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect), I realized that I was using `useEffect` to detect changes in values. This is unnecessary and can be replaced with a simpler hook.

```tsx
const [value, setValue] = useState(0);

// 😫 Common but unnecessary useEffect pattern
useEffect(() => {
	console.log(value); // side effect
}, [value]);
```

## The Problem

One of the suggested solutions is to add another `useState` to track the previous value. This got tedious and I wanted to find a better solution.

```tsx
// have to manage 2 state variables
const [value, setValue] = useState<T>({ ... });
const [prevValue, setPrevValue] = useState<T>({ ... });

const getHasChanged = (a: T, b: T) => {
  // implement comparison logic
	// (easy for primitives, but harder for objects and arrays)
}

if (getHasChanged(value, prevValue)) {
	console.log(value); // side effect
}
```

## The Solution?

This custom hook is a more direct and cleaner approach to change detection, reducing the need for effect-based solutions.

```tsx
const [value, setValue] = useState(0);

// 🎉 Clean and direct with useHasChanged
const [hasChanged, prevValue] = useHasChanged(value);
if (hasChanged) {
	console.log(value); // side effect
}
```

This hook also provides a better DX for handleing side effects, since there is no need to manage a dependency array.

It is also ideal for preventing unnecessary re-renders, since side effects are triggered during the render phase and updates are batched together with the initial change.

## Installation

```bash
npm install @ryact-utils/has-changes
# or
yarn add @ryact-utils/has-changes
# or
pnpm add @ryact-utils/has-changes
```

## Usage

When passing a primitive value or a function, the hook will use `Object.is` to compare the values.

```tsx
import { useHasChanged } from '@ryact-utils/has-changes';

function MyComponent() {
	const [count, setCount] = useState(0);

	const [hasChanged, previousCount] = useHasChanged(count);

	// No useEffect needed! Just react to changes directly
	if (hasChanged) {
		console.log(count); // side effect
	}
	...
}
```

When passing an array, the hook will shallowly compare it's elements.

```tsx
const [value1, setValue1] = useState(0);
const [value2, setValue2] = useState('Hello');

// hasChange will be false unless value1 or value2 changes
// [prevValue1, prevValue2]: [number, string]
const [hasChanged, [prevValue1, prevValue2]] = useHasChanged([value1, value2] as const);
if (hasChanged) {
	console.log('Values changed');
}
```

This works too for objects

```tsx
const [value1, setValue1] = useState(0);
const [value2, setValue2] = useState('Hello');

// hasChange will be false unless value1 or value2 changes
// prevValue: { x: number, y: string }
const [hasChanged, prevValue] = useHasChanged({ x: value1, y: value2 });
if (hasChanged) {
	console.log('Values changed', prevValue.x, prevValue.y);
}
```

## API

### `useHasChanged<T, TRunOnMount extends boolean = false>`

A hook that tracks changes in a value and provides both the change status and the previous value.

#### Parameters

- `current: T` - The current value to track
- `config?: HasChangeConfig<T, TRunOnMount>` - Optional configuration object

#### Config Options

```typescript
type HasChangeConfig<T, TRunOnMount extends boolean = false> = {
	comparison?: 'shallowish' | 'shallow' | ((a: T, b: T) => boolean);
	runOnMount?: TRunOnMount;
};
```

- `comparison` (optional):

  - `'shallowish'` (default) - Performs a 1 level deep comparison of arrays and objects, and uses `Object.is` for primitives
  - `'shallow'` - Uses `Object.is` for strict equality comparison
  - `Function` - Custom comparison function that takes two arguments and returns a boolean

- `runOnMount` (optional):
  - `false` (default) - Previous value will be initialized with current value
  - `true` - Previous value will be `null` and will immediately indicate that the value has changed on mount

#### Return Value

Returns a tuple `[boolean, T | null]`:

1. `boolean` - Whether the value has changed
2. `T | null` - The previous value (null if `runOnMount` is true and it's the first render)

## Examples

### Custom Comparison

```tsx
const [value, setValue] = useState({ count: 0 });
const [hasChanged, prevValue] = useHasChanged(value, {
	comparison: (a, b) => a.count === b.count,
});
```

### Run on Mount

```tsx
const [value, setValue] = useState({ count: 0 });
const [hasChanged, prevValue] = useHasChanged(value, {
	runOnMount: true,
});
// prevValue will be null on first render and hasChanged will be true
```

## Notes

- This hook is not a replacement for `useEffect`. It is a replacement for the need to use `useEffect` to trigger side effects as a result of a value changing.
- Because side effects are triggered during the render phase, it is important to ensure that you are following the rules of hooks.

```tsx
const [value, setValue] = useState(0);

const ref = useRef('hi');

const [hasChanged] = useHasChanged(value);
if (hasChanged) {
	ref.current = 'Some other value'; // This will cause a warning
}
```

## License

MIT
