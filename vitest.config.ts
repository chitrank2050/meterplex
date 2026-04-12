import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.module.ts',
        'src/main.ts',
        '**/*.interface.ts',
        '**/*.dto.ts',
        '**/*.entity.ts',
      ],
    },
    alias: {
      '@common': './src/common',
      '@config': './src/config',
      '@modules': './src/modules',
      '@prisma': './src/prisma',
      '@generated': './generated',
    },
  },
  plugins: [
    // This is required to build the test files with SWC (supporting NestJS decorators)
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
});
