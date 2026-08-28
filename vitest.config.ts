import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80,
      },
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.module.ts',
        '**/*.types.ts',
        '**/*.port.ts',
        'src/main.ts',
        'src/notion/**',
        'test/**',
        'eslint.config.mjs',
        'vitest.config.ts',
        'vitest.config.e2e.ts',
      ],
    },
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
});
