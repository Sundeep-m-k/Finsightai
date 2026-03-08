import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
var __dirname = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            shared: path.resolve(__dirname, '../shared'),
        },
    },
    server: {
        port: 5173,
        proxy: {
            '/api/ai': {
                target: 'http://localhost:8001',
                changeOrigin: true,
                rewrite: function (p) { return p.replace(/^\/api\/ai/, ''); },
            },
        },
    },
});
