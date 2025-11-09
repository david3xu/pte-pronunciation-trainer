import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Enable Fast Refresh for React
      fastRefresh: true,
      // Include .tsx and .ts files
      include: '**/*.{jsx,tsx,ts}',
    }),
  ],

  // Root directory (where index.html is)
  root: '.',

  // Public directory for static assets
  publicDir: 'public',

  // Build configuration
  build: {
    outDir: 'dist',
    // Generate source maps for production debugging
    sourcemap: true,
    // Minification
    minify: 'esbuild',
    // Target modern browsers (matching package.json browserslist)
    target: ['chrome90', 'firefox88', 'safari14', 'edge90'],
    // Rollup options for advanced bundling
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      output: {
        // Manual chunks for better code splitting
        manualChunks: {
          // Vendor chunk (React, React DOM, Zustand)
          vendor: ['react', 'react-dom', 'zustand'],
          // Radix UI components
          'radix-ui': ['@radix-ui/themes', '@radix-ui/react-icons'],
          // Supabase
          supabase: ['@supabase/supabase-js'],
          // Analytics
          analytics: ['posthog-js'],
        },
        // Asset file names
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          } else if (/css/i.test(ext)) {
            return `assets/css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        // Chunk file names
        chunkFileNames: 'assets/js/[name]-[hash].js',
        // Entry file names
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
    // Chunk size warnings
    chunkSizeWarningLimit: 1000, // 1MB
  },

  // Development server configuration
  server: {
    port: 3001,
    strictPort: false, // Find next available port if 3001 is taken
    host: true, // Listen on all addresses
    open: false, // Don't auto-open browser
    cors: true,
    // HMR (Hot Module Replacement)
    hmr: {
      overlay: true, // Show error overlay
    },
  },

  // Preview server (for production builds)
  preview: {
    port: 3002,
    strictPort: false,
    host: true,
    open: false,
  },

  // Resolve configuration
  resolve: {
    alias: {
      // Path aliases for cleaner imports
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
    // Extensions to resolve
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
  },

  // Optimizations
  optimizeDeps: {
    // Pre-bundle these dependencies
    include: [
      'react',
      'react-dom',
      'zustand',
      '@supabase/supabase-js',
      'posthog-js',
      '@radix-ui/themes',
      '@radix-ui/react-icons',
    ],
    // Exclude these from pre-bundling
    exclude: [],
  },

  // CSS configuration
  css: {
    // PostCSS config (for Tailwind)
    postcss: './postcss.config.js',
    // CSS modules
    modules: {
      localsConvention: 'camelCase',
    },
    // Preprocessor options
    preprocessorOptions: {
      // Add global CSS imports if needed
    },
  },

  // Environment variables
  envPrefix: 'VITE_', // Only expose env vars starting with VITE_

  // Define global constants
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
});
