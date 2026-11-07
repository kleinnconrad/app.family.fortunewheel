import { defineConfig } from 'vitest/config';

export default defineConfig({
  // A relative base keeps asset URLs working on the GitHub Pages project URL
  // (https://<user>.github.io/<repo>/) as well as on any other static host.
  base: './',
  build: {
    target: 'es2022',
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
