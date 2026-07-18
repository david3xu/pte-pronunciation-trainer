import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx,js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'dist/',
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@ts': path.resolve(__dirname, './src/ts'),
      '@js': path.resolve(__dirname, './src/js'),
      '@css': path.resolve(__dirname, './src/css'),
      '@stores': path.resolve(__dirname, './src/ts/stores'),
      '@types': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/ts/utils'),
      '@data': path.resolve(__dirname, './src/ts/data'),
      '@audio': path.resolve(__dirname, './src/ts/audio'),
      '@ui': path.resolve(__dirname, './src/ts/ui'),
      '@supabase-client': path.resolve(__dirname, './src/ts/supabase'),
      '@analytics': path.resolve(__dirname, './src/ts/analytics'),
    },
  },
});
