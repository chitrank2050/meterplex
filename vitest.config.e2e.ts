import { resolve } from 'path';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    environment: 'node',
    include: ['test/**/*.e2e-spec.ts'],
  },
  resolve: {
    alias: {
      '@common': resolve(__dirname, './src/common'),
      '@config': resolve(__dirname, './src/config'),
      '@modules': resolve(__dirname, './src/modules'),
      '@prisma': resolve(__dirname, './src/prisma'),
      '@generated': resolve(__dirname, './generated'),
    },
  },
  plugins: [
    // This is required to build the test files with SWC (supporting NestJS decorators)
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
});
