import { describe, expect, test, vitest } from 'vitest';
import { attempt, createResult } from '.';

describe(attempt, () => {
	describe(createResult, () => {
		test('should return success result as an object and a tuple', () => {
			const result = createResult(undefined, 5, true);

			expect(result).toEqual(expect.arrayContaining([undefined, 5, true]));
			expect(result).toEqual(expect.objectContaining({ data: 5, error: undefined, success: true }));
		});

		test('should return failure result as an object and a tuple', () => {
			const result = createResult(new Error('test'), undefined, false);

			expect(result).toEqual(expect.arrayContaining([new Error('test'), undefined, false]));
			expect(result).toEqual(
				expect.objectContaining({ data: undefined, error: new Error('test'), success: false }),
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
});
