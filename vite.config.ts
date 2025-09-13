// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
// })

// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
	const isDev = mode === 'development';
	console.log(mode, isDev);
	return {
		base: '/y-Doc/',
		plugins: [react()],
		build: {
			outDir: 'dist',
			assetsDir: 'assets',
		},
		server: {
			proxy: {
				'/ws': {
					target: 'ws://localhost:3000', // 代理到 Yjs WebSocket 服务
					ws: true,
					changeOrigin: true,
				},
			},
			open: true,
		},
		define: {
			__DEV__: isDev,
			__PROD__: !isDev,
		},
	};
});
