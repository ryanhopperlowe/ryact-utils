import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

// https://vite.dev/config/
export default defineConfig({
	plugins: [dts({ insertTypesEntry: true, tsconfigPath: './tsconfig.app.json' })],
	build: {
		lib: {
			entry: resolve(__dirname, 'src/index.ts'),
			name: 'HasChanges',
			fileName: 'has-changes',
			formats: ['es', 'cjs', 'umd', 'iife'],
		},
		rollupOptions: {
			external: ['react', 'react-dom'],
		},
	},
});
