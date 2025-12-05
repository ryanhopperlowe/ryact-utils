import { resolve, dirname } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [react(), dts()],
	build: {
		lib: {
			entry: {
				index: resolve(__dirname, './src/index.ts'),
				react: resolve(__dirname, './src/react.ts'),
			},
			formats: ['es'],
		},
		rollupOptions: {
			external: ['react', 'react-dom', 'react/jsx-runtime'],
			output: {
				globals: {
					react: 'React',
					'react-dom': 'ReactDOM',
					'react/jsx-runtime': 'jsxRuntime',
				},
			},
		},
	},
	resolve: {
		alias: { '@': resolve('src/') },
	},
});
