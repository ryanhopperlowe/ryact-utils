# @ryact-utils/pane

## Purpose

`@ryact-utils/pane` is a small state layer that lets you model feature-level data as classes and wire them directly to React with `useSyncExternalStore`. The decorators (`@store`, `@observable`, `@action`) add just enough structure: observable properties automatically notify React, actions batch mutations, and the hidden `ExternalStore` snapshot keeps the runtime concurrent-mode safe with no proxies or global registries.

## Quickstart

1. **Install the package**

   ```bash
   pnpm add @ryact-utils/pane
   # or npm install / yarn add
   ```

2. **Create a store class**

   ```ts
   import { store, observable, action } from '@ryact-utils/pane';

   @store
   export class CounterStore {
   	@observable count = 0;

   	get double() {
   		return this.count * 2;
   	}

   	@action
   	increment() {
   		this.count += 1;
   	}
   }

   export const counterStore = new CounterStore();
   ```

3. **Use it in React**

   ```tsx
   import { useSync } from '@ryact-utils/pane/react';

   export function Counter() {
   	const state = useSync(counterStore);
   	return (
   		<button onClick={state.increment}>
   			Clicked {state.count} times (double: {state.double})
   		</button>
   	);
   }
   ```

`useSync` subscribes to the hidden store, delivers the latest snapshot to the component, and re-renders whenever an observable field changes or an action completes.

## API

### `@store`

Class decorator that injects a `SnapshotStore` and wraps the instance in a proxy. Property assignments run `observeChange`, and any method decorated with `@action` is registered automatically. Use it on every class you want React to observe.

### `@observable` _(aka the "observer" in user questions)_

Property decorator that marks fields as observable. When the proxy sees these keys change it notifies the store. Works on primitives, objects, arrays—the change is detected by assignment.

### `@action`

Method decorator that wraps the original function in `ExternalStore.action`. The action increments an internal depth counter, executes your logic, then calls `notify()` once after the action finishes. This batches updates and ensures React sees consistent snapshots.

### `useSync`

```ts
function useSync<T, U = T>(store: T, selector?: (state: T) => U): U;
```

Accepts an instance decorated with `@store`. Internally it pulls out the hidden `ExternalStore` via a symbol and subscribes with `useSyncExternalStore`. You can pass an optional selector; results are memoized with `useShallow` so shallowly-equal objects keep referential identity.

### `SnapshotStore`

```ts
new SnapshotStore<State>(getSnapshot: () => State)
```

Concrete implementation of `ExternalStore` that simply calls `getSnapshot` whenever React needs the latest state. Useful when you do not want to use decorators but still want a safe subscription primitive.

### `ExternalStore`

Abstract base class used by the decorators. Key members:

- `snapshot(): State` – return the state that selectors consume.
- `subscribe(listener)` – add/remove listeners.
- `action(fn)` – run mutating logic and notify subscribers after the callback.
- `addObserver(key)` / `observeChange(key)` – track observable keys and emit change notifications outside actions.

Extend this when building bespoke stores or when integrating with non-class data sources.

### `useStore`

```ts
function useStore<S, U = S>(store: ExternalStore<S>, selector?: (state: S) => U): U;
```

Low-level React hook that works with any `ExternalStore`. Ideal when you manage the `ExternalStore` yourself (e.g., via `SnapshotStore`).

### `useShallowStore`

Same signature as `useStore`, but wraps the selector with `useShallow` to avoid re-renders when the selected object/array has the same shallow shape.

```tsx
const stats = useShallowStore(todoStore, (state) => ({
	active: state.todos.filter((todo) => !todo.done).length,
	completed: state.todos.filter((todo) => todo.done).length,
}));
```

## Common pitfalls

- **Forgetting `@store`** – Without the class decorator, the instance never gains a hidden store, so `useSync` throws "Provided store could not be resolved".
- **Mutating outside `@action`** – Direct assignments still notify, but you lose batching. Wrap multi-step mutations in `@action` to emit one change.
- **Expecting deep comparisons** – `useSync` and `useShallowStore` memoize via shallow comparison. If you create new nested objects each render, they will trigger re-renders—stabilize derived data when necessary.
- **Using fields without `@observable`** – Derived getters/methods can read any property, but React only re-renders when observable keys change or when you call `notify()` manually.
- **Accessing the store before instantiation** – Decorators run when the class is defined, but the proxying happens in the constructor. Always instantiate (`new MyStore()`) before passing stores to hooks.

Armed with these patterns, you can create lightweight, testable stores that plug directly into React with zero extra boilerplate.
