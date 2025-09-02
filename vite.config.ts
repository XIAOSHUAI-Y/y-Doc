// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
// })

// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
	base: 'y-Doc',
	plugins: [react()],
	server: {
		proxy: {
			'/ws': {
				target: 'ws://localhost:3001', // 代理到 Yjs WebSocket 服务
				ws: true,
				changeOrigin: true,
			},
		},
		open: true,
	},
});
