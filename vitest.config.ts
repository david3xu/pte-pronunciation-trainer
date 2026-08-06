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

const aliases = {
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
};

// Two projects, because the client and the production server need genuinely
// different environments.
//
// Client suites need a DOM and the shared setup file, which installs browser only
// fakes such as localStorage. Server suites exercise a real node:http listener,
// where a DOM environment actively breaks them: the happy-dom fetch applies the
// same origin policy and blocks every request to the test listener, and the shared
// setup file throws because `window` does not exist.
//
// Separating them keeps the client setup untouched rather than weakening it with
// environment guards to accommodate server tests.
export default defineConfig({
  test: {
    projects: [
      {
        plugins: [react()],
        resolve: { alias: aliases },
        test: {
          name: 'client',
          globals: true,
          environment: 'happy-dom',
          setupFiles: ['./src/test/setup.ts'],
          include: ['src/**/*.{test,spec}.{ts,tsx,js,jsx}'],
        },
      },
      {
        test: {
          name: 'node',
          globals: true,
          environment: 'node',
          include: [
            'server/**/*.{test,spec}.ts',
            'scripts/azure/**/*.{test,spec}.js',
          ],
        },
      },
    ],
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
        'dist-server/',
      ],
    },
  },
  resolve: {
    alias: aliases,
  },
});
