// vitest.setup.ts
// This file runs before each test. Good place to set up RTL and polyfills.

import '@testing-library/dom'; // extends expect with DOM matchers
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Ensure a clean DOM between tests
afterEach(() => {
	cleanup();
});

// Example: stub out window.matchMedia if your components use it
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: vi.fn((query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: vi.fn(), // deprecated
			removeListener: vi.fn(), // deprecated
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		})),
	});
}
