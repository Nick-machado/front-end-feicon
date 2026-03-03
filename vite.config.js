import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/api': {
                target: 'https://api-feicon.onrender.com',
                changeOrigin: true,
                rewrite: function (path) { return path.replace(/^\/api/, ''); },
                secure: false,
            },
        },
    },
});
