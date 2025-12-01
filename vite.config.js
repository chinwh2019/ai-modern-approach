import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    base: '/ai-modern-approach/', // Base path for GitHub Pages
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                search: resolve(__dirname, 'search.html'),
                mdp: resolve(__dirname, 'mdp.html'),
                rl: resolve(__dirname, 'rl.html'),
                snake: resolve(__dirname, 'snake.html'),
                supervised: resolve(__dirname, 'supervised.html'),
            },
        },
    },
});
