# `@ryact-utils/attempt`

A feather‑weight, type‑safe wrapper that turns _anything_—functions, promises, or raw values—into a predictable **result tuple** \`[error, data, ok]\`.

It ships with:

- A **pre‑configured helper** `attempt`
- A factory `createAttempt` for custom error coercion
- Low‑level utilities `createResult` and `DEFAULT_COERCE_ERROR`

---

## Installation

```bash
npm i @ryact-utils/attempt
# or
yarn add @ryact-utils/attempt
```

---

## Glossary

| Term              | Meaning                                                                                                                                        |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **AttemptResult** | The tuple \`[error, data, ok]\` returned by any wrapper. It also carries twin properties:<br>\`result.error\`, \`result.data\`, \`result.ok\`. |
| **Success**       | \`ok === true\`, \`error === undefined\`, and \`data\` holds the value.                                                                        |
| **Failure**       | \`ok === false\`, \`error\` holds the coerced error, and \`data === undefined\`.                                                               |

---

## Quick Example: From nested `try / catch` hell to clean `attempt` flow

### The old way (try/catch hell)

```ts
async function loadDashboard(userId: string) {
	try {
		const user = await fetchUserById(userId);
		try {
			const posts = await fetchPostsForUser(user.id);
			try {
				const comments = await fetchCommentsForPost(posts[0].id);
				console.log({ user, posts, comments });
			} catch (e) {
				console.error('Comments step failed:', e);
			}
		} catch (e) {
			console.error('Posts step failed:', e);
		}
	} catch (e) {
		console.error('User step failed:', e);
	}
}
```

### The `attempt` way (flat & readable)

```ts
// flat-flow.ts
async function loadDashboard(userId: string) {
	const [uErr, user] = await attempt(fetchUser(userId));
	if (uErr) return console.error(uErr);

	const [pErr, posts] = await attempt(fetchPosts(user.id));
	if (pErr) return console.error(pErr);

	const [cErr, comments] = await attempt(fetchComments(posts[0].id));
	if (cErr) return console.error(cErr);

	console.log({ user, posts, comments });
}
```

With `attempt`, every operation is wrapped in a single line, making the happy path obvious and the error handling explicit—without ever nesting `try / catch` blocks.

#### Improvements:

- ✅ One level of indentation throughout
- ✅ Linear sequence—handle each error in place, then move on
- ✅ Success path reads top-to-bottom like a recipe

---

## API Reference

### 1. `attempt(thing, ...args)`

**Universal dispatcher.**

| Argument  | Accepts                                                                      | Action taken                      |
| --------- | ---------------------------------------------------------------------------- | --------------------------------- |
| `thing`   | • A **function** (sync or async)<br>• A **Promise**<br>• Any other **value** | Runs / awaits / wraps accordingly |
| `...args` | Parameters forwarded when `thing` is a function                              | —                                 |

Returns either an `AttemptResult` or `Promise<AttemptResult>` depending on whether `thing` ends up async.

#### Usage

```ts
// Sync function
attempt(Math.sqrt, 9);
attempt(() => Math.sqrt(9));

// Function that returns a promise
await attempt(() => fetch('/api').then((r) => r.json()));
await attempt(someAsyncFn, param1, param2);

// Promise
await attempt(someAsyncFn(param1, param2));
await attempt(Promise.resolve('success'));

// Raw value
attempt(123);
```

---

### 2. `attempt.sync(fn, ...args)`

Executes a **synchronous** function in a `try / catch`.

```ts
const res = attempt.sync(parseInt, '42');

// or

const res = attempt.sync(() => parseInt('42'));
```

---

### 3. `attempt.async(fn, ...args)`

Runs an **async** function (one that _returns_ a promise) and awaits it.

```ts
const res = await attempt.async(readFile, 'config.json');

// or

const res = await attempt.async(() => readFile('config.json'));
```

---

### 4. `attempt.promise(promise)`

Wraps an _existing_ promise.

```ts
const res = await attempt.promise(fetch('/api'));
```

---

### 5. `attempt.fn(fn, ...args)`

Alias for the “smart” branch used internally by `attempt(...)`.  
Useful when you explicitly want “function mode”:

```ts
const res = attempt.fn(mightBeAsync, 1, 2, 3);

// or

const res = attempt.fn(() => mightBeAsync(1, 2, 3));
```

---

### 6. `attempt.any(valueOrFnOrPromise, ...args)`

Identical to the top‑level `attempt`. Provided for symmetry and readability when you’ve created a _custom_ attempt instance (see below).

---

### 7. `createAttempt(coerceError)`

Builds a **customised** attempt helper whose `.error` slot always conforms to _your_ shape.

| Param         | Purpose                                                                             |
| ------------- | ----------------------------------------------------------------------------------- |
| `coerceError` | `(x: unknown) → MyErrorType` — convert anything thrown into a domain‑specific error |

```ts
import { createAttempt } from '@ryact-utils/attempt';

const toAxiosError = (x: unknown) =>
	x && typeof x === 'object' && 'isAxiosError' in x ? x : { message: String(x) };

// reusable custom attempt
export const axiosAttempt = createAttempt(toAxiosError);

const res = await axiosAttempt(axios.get('/users'));
```

All methods (`sync`, `async`, `promise`, `fn`, `any`) are available on the returned instance.

---

### 9. `DEFAULT_COERCE_ERROR`

The built‑in coercion logic used by the default `attempt`.

1. **`Error`** instances pass through unchanged.
2. **Strings** become `Error(string)`.
3. Everything else becomes `Error("Unknown error caught with \"attempt\"", { cause })`.

You can re‑use it when composing your own coercer:

```ts
import { createAttempt, DEFAULT_COERCE_ERROR } from '@ryact-utils/attempt';

const attemptPlus = createAttempt((x) => ({
	original: DEFAULT_COERCE_ERROR(x), // keep stack trace
	timestamp: Date.now(),
}));
```

---

## Patterns & Recipes

See the “Code Examples” section earlier in this README for dozens of real‑world snippets—chained operations, Express routes, unit testing, and more.

The goal of `attempt` is to be as flexible as you want it to be. It may be best to establish common patterns within a codebase to prevent different patterns from being used within attempt.

---

## FAQ

**Does it replace exceptions?**  
No—you can still `throw` if you prefer. `attempt` simply gives you the option to treat errors as data when that feels cleaner.

**Tree‑shakeable?**  
Yes. ES modules, no external dependencies.

**Browser support?**  
Any runtime that supports ES2019. For older targets, polyfill or down‑compile.

**Size?**  
&lt; 0.5 kB gzipped.

---

## License

MIT
