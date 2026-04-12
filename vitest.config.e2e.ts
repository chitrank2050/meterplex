import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    environment: 'node',
    include: ['test/**/*.e2e-spec.ts'],
    alias: {
      '@common': './src/common',
      '@config': './src/config',
      '@modules': './src/modules',
      '@prisma': './src/prisma',
      '@generated': './generated',
    },
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
});
