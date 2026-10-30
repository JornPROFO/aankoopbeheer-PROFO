import { defineConfig } from 'vite';

export default defineConfig({
  build: { rollupOptions: { input: { main: 'index.html', ontvangst: 'ontvangst.html' } } },
  base: process.env.GITHUB_PAGES === 'true' ? '/aankoopbeheer-PROFO/' : '/',
});
