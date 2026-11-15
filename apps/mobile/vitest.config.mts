import { defineConfig } from 'vitest/config';

// Unit tests for plain TypeScript modules (no React Native runtime).
export default defineConfig({
  test: { include: ['test/**/*.test.ts'] },
});
