import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

// React ships an alias-free `act` only in its development build; the production
// build leaves `React.act` undefined, which makes @testing-library/react throw
// "React.act is not a function". Some shells export NODE_ENV=production globally,
// which would make Vite resolve React's production build during the test run.
// Force a non-production value for the test process so a bare `npx vitest run`
// behaves correctly regardless of the ambient environment. An explicit
// `development` value is preserved.
if (process.env.NODE_ENV === 'production' || !process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

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
