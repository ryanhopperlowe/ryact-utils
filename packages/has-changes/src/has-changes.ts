import { useState } from 'react';

export type Comparison<T> = 'shallowish' | 'shallow' | ((a: T, b: T) => boolean);

export type HasChangeConfig<T, TRunOnMount extends boolean = false> = {
	comparison?: Comparison<T>;
	runOnMount?: TRunOnMount;
};

export type PrevState<T, TRunOnMount extends boolean> = TRunOnMount extends true ? [T] | null : [T];
export type HasChangeResult<T, TRunOnMount extends boolean> = [boolean, PrevState<T, TRunOnMount>];

export function useHasChanged<T, TRunOnMount extends boolean = false>(
	current: T,
	config: HasChangeConfig<T, TRunOnMount> = {},
): HasChangeResult<T, TRunOnMount> {
	const { comparison = 'shallowish', runOnMount = false } = config;
	const compare = getCompareFn(comparison);

	const [previous, setPrevious] = useState(
		(runOnMount ? null : [current]) as PrevState<T, typeof runOnMount>,
	);

	const hasChanged = !previous || !compare(current, previous[0]);
	if (hasChanged) setPrevious([current]);

	return [hasChanged, previous?.[0]] as HasChangeResult<T, TRunOnMount>;
}

function getCompareFn<T>(comparison: Comparison<T>): (a: T, b: T) => boolean {
	if (typeof comparison === 'function') return comparison;

	if (comparison === 'shallowish') return shallowishCompare;

	if (comparison === 'shallow') return Object.is;

	return Object.is;
}

function shallowishCompare<T>(a: T, b: T) {
	if (a === b) return true;

	if (Array.isArray(a) && Array.isArray(b)) {
		return a.every((value, index) => value === b[index]);
	}

	if (typeof a === 'object' && typeof b === 'object') {
		if (a === null || b === null) return false;

		return Object.keys(a).every((key) => a[key as keyof T] === b[key as keyof T]);
	}

	return false;
}
