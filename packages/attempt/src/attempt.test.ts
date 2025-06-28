import { describe, expect, test, vitest } from 'vitest';
import { attempt, createResult } from '.';

describe(attempt, () => {
	describe(createResult, () => {
		test('should return success result as an object and a tuple', () => {
			const result = createResult(undefined, 5, true);

			expect(result).toEqual(expect.arrayContaining([undefined, 5, true]));
			expect(result).toEqual(expect.objectContaining({ data: 5, error: undefined, ok: true }));
		});

		test('should return failure result as an object and a tuple', () => {
			const result = createResult(new Error('test'), undefined, false);

			expect(result).toEqual(expect.arrayContaining([new Error('test'), undefined, false]));
			expect(result).toEqual(
				expect.objectContaining({ data: undefined, error: new Error('test'), ok: false }),
			);
		});
	});

	describe(attempt.sync, () => {
		test('should forward parameters', () => {
			const fn = vitest.fn();
			attempt.sync(fn, 1, 2, 3);

			expect(fn).toHaveBeenCalledWith(1, 2, 3);
		});

		test('should return success result if function does not throw', () => {
			const result = attempt.sync(() => 5);
			expect(result).toEqual(createResult(undefined, 5, true));
		});

		test('should return failure result if function throws', () => {
			const result = attempt.sync(() => {
				throw new Error('test');
			});

			expect(result).toEqual(createResult(new Error('test'), undefined, false));
		});
	});

	describe(attempt.promise, () => {
		test('should return a promise', () => {
			const result = attempt.promise(Promise.resolve(5));
			expect(result).toBeInstanceOf(Promise);
		});

		test('should return success result if promise resolves', async () => {
			const result = attempt.promise(Promise.resolve(5));
			expect(await result).toEqual(createResult(undefined, 5, true));
		});

		test('should return failure result if promise rejects', async () => {
			const result = attempt.promise(Promise.reject(new Error('test')));
			expect(await result).toEqual(createResult(new Error('test'), undefined, false));
		});
	});

	describe(attempt.async, () => {
		test('should return a promise', () => {
			const result = attempt.async(() => Promise.resolve(5));
			expect(result).toBeInstanceOf(Promise);
		});

		test('should forward parameters', () => {
			const fn = vitest.fn();
			attempt.async(fn, 1, 2, 3);

			expect(fn).toHaveBeenCalledWith(1, 2, 3);
		});

		test('should return success result if promise resolves', async () => {
			const result = attempt.async(() => Promise.resolve(5));
			expect(await result).toEqual(createResult(undefined, 5, true));
		});

		test('should return failure result if promise rejects', async () => {
			const result = attempt.async(() => Promise.reject(new Error('test')));
			expect(await result).toEqual(createResult(new Error('test'), undefined, false));
		});
	});

	describe(attempt.fn, () => {
		test('should return a promise if fn is async', () => {
			const result = attempt.fn(async () => 5);
			expect(result).toBeInstanceOf(Promise);
		});

		test('should forward parameters', () => {
			const fn = vitest.fn();
			attempt.fn(fn, 1, 2, 3);
		});

		test('should return success result if fn returns a promise that resolves', async () => {
			const result = attempt.fn(async () => 5);
			expect(await result).toEqual(createResult(undefined, 5, true));
		});

		test('should return failure result if fn returns a promise that rejects', async () => {
			const result = attempt.fn(async () => Promise.reject(new Error('test')));
			expect(await result).toEqual(createResult(new Error('test'), undefined, false));
		});

		test('should succeed synchronously if fn is sync', () => {
			const result = attempt.fn(() => 5);
			expect(result).toEqual(createResult(undefined, 5, true));
		});

		test('should return failure result if fn is sync and throws', () => {
			const result = attempt.fn(() => {
				throw new Error('test');
			});

			expect(result).toEqual(createResult(new Error('test'), undefined, false));
		});
	});

	describe(attempt.any, () => {
		describe('when param is a function', () => {
			test('should return a promise if fn is async', () => {
				const result = attempt.fn(async () => 5);
				expect(result).toBeInstanceOf(Promise);
			});

			test('should forward parameters', () => {
				const fn = vitest.fn();
				attempt.fn(fn, 1, 2, 3);
			});

			test('should return success result if fn returns a promise that resolves', async () => {
				const result = attempt.fn(async () => 5);
				expect(await result).toEqual(createResult(undefined, 5, true));
			});

			test('should return failure result if fn returns a promise that rejects', async () => {
				const result = attempt.fn(async () => Promise.reject(new Error('test')));
				expect(await result).toEqual(createResult(new Error('test'), undefined, false));
			});

			test('should succeed synchronously if fn is sync', () => {
				const result = attempt.fn(() => 5);
				expect(result).toEqual(createResult(undefined, 5, true));
			});

			test('should return failure result if fn is sync and throws', () => {
				const result = attempt.fn(() => {
					throw new Error('test');
				});

				expect(result).toEqual(createResult(new Error('test'), undefined, false));
			});
		});

		describe('when param is a promise', () => {
			test('should return a promise', () => {
				const result = attempt.promise(Promise.resolve(5));
				expect(result).toBeInstanceOf(Promise);
			});

			test('should return success result if promise resolves', async () => {
				const result = attempt.promise(Promise.resolve(5));
				expect(await result).toEqual(createResult(undefined, 5, true));
			});

			test('should return failure result if promise rejects', async () => {
				const result = attempt.promise(Promise.reject(new Error('test')));
				expect(await result).toEqual(createResult(new Error('test'), undefined, false));
			});
		});

		describe('when param is a primitive value', () => {
			test.each([{ obj: true }, true, false, 5, 0, 'hi there', '', {}, null])(
				'should return success for primitive value: %s',
				(val) => {
					const result = attempt.any(val);
					expect(result).toEqual(createResult(undefined, val, true));
				},
			);
		});
	});

	describe(attempt.createSync, () => {
		test('returns an attempt callback fn', () => {
			const fn = attempt.createSync(() => 5);
			expect(fn).toEqual(expect.any(Function));
		});

		describe('attempt.createSync -> fn', () => {
			test('should forward parameters', () => {
				const fn = vitest.fn();
				attempt.createSync(fn)(1, 2, 3);

				expect(fn).toHaveBeenCalledWith(1, 2, 3);
			});

			test('should return success result if function does not throw', () => {
				const fn = attempt.createSync(() => 5);

				expect(fn()).toEqual(createResult(undefined, 5, true));
			});

			test('should return failure result if function throws', () => {
				const fn = attempt.createSync(() => {
					throw new Error('test');
				});

				expect(fn()).toEqual(createResult(new Error('test'), undefined, false));
			});
		});
	});

	describe(attempt.createAsync, () => {
		test('should return a callback fn', () => {
			const fn = attempt.createAsync(async () => 5);
			expect(fn).toEqual(expect.any(Function));
		});

		describe('attempt.createAsync -> fn', () => {
			test('should return a promise', () => {
				const fn = attempt.createAsync(async () => 5);
				expect(fn()).toBeInstanceOf(Promise);
			});

			test('should forward parameters', () => {
				const mockfn = vitest.fn();
				attempt.createAsync(mockfn)(1, 2, 3);

				expect(mockfn).toHaveBeenCalledWith(1, 2, 3);
			});

			test('should return success result if promise resolves', async () => {
				const fn = attempt.createAsync(async () => 5);
				expect(await fn()).toEqual(createResult(undefined, 5, true));
			});

			test('should return failure result if promise rejects', async () => {
				const fn = attempt.createAsync(() => Promise.reject(new Error('test')));
				expect(await fn()).toEqual(createResult(new Error('test'), undefined, false));
			});
		});
	});

	describe(attempt.create, () => {
		describe('when parem function is synchronous', () => {
			test('returns an attempt callback fn', () => {
				const fn = attempt.create(() => 5);
				expect(fn).toEqual(expect.any(Function));
			});

			describe('attempt.create -> fn', () => {
				test('should forward parameters', () => {
					const fn = vitest.fn();
					attempt.create(fn)(1, 2, 3);

					expect(fn).toHaveBeenCalledWith(1, 2, 3);
				});

				test('should return success result if function does not throw', () => {
					const fn = attempt.create(() => 5);

					expect(fn()).toEqual(createResult(undefined, 5, true));
				});

				test('should return failure result if function throws', () => {
					const fn = attempt.create(() => {
						throw new Error('test');
					});

					expect(fn()).toEqual(createResult(new Error('test'), undefined, false));
				});
			});
		});

		describe('when parameter function is async', () => {
			test('should return a callback fn', () => {
				const fn = attempt.create(async () => 5);
				expect(fn).toEqual(expect.any(Function));
			});

			describe('expect.create -> fn', () => {
				test('should return a promise', () => {
					const fn = attempt.create(async () => 5);
					expect(fn()).toBeInstanceOf(Promise);
				});

				test('should forward parameters', () => {
					const mockfn = vitest.fn();
					attempt.create(mockfn)(1, 2, 3);

					expect(mockfn).toHaveBeenCalledWith(1, 2, 3);
				});

				test('should return success result if promise resolves', async () => {
					const fn = attempt.create(async () => 5);
					expect(await fn()).toEqual(createResult(undefined, 5, true));
				});

				test('should return failure result if promise rejects', async () => {
					const fn = attempt.create(() => Promise.reject(new Error('test')));
					expect(await fn()).toEqual(createResult(new Error('test'), undefined, false));
				});
			});
		});
	});

	describe(attempt.builder, () => {
		test('should apply custom error coersion', async () => {
			const coerceError = vitest.fn(() => 'coerced-error');
			const newAttempt = attempt.builder(coerceError);
			const result = await newAttempt(() => {
				return Promise.reject('some error');
			});

			expect(result.error).toEqual('coerced-error');
		});
	});
});
