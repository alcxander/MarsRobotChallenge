// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    includeSource: ['scripts/**/*.{js,mjs,ts}'],
  },
  esbuild: {
  include: [/scripts\/.*\.(js|mjs)$/],
  loader: 'js',
  }
});
