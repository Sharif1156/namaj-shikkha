import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
    reporters: 'default',
    // The DOM smoke tests swap globals, so keep each file isolated.
    isolate: true,
  },
});
