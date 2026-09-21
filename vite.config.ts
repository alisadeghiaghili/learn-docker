import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages project site: https://alisadeghiaghili.github.io/learn-docker/
  base: process.env.GITHUB_PAGES === 'true' ? '/learn-docker/' : '/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
