import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Include .tsx and .ts files
      include: '**/*.{jsx,tsx,ts}',
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'PTE Pronunciation Trainer',
        short_name: 'PTE Trainer',
        description: 'A web-based pronunciation training application for PTE vocabulary',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\/data\/processed\/.*\.json$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'data-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // <== 30 days
              }
            }
          }
        ]
      }
    }),
    {
      name: 'ai-chat-middleware',
      configureServer(server) {
        server.middlewares.use(aiChatMiddleware);
      }
    }
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
    // CSS code splitting for better caching
    cssCodeSplit: true,
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
          if (!assetInfo.name) {
            return 'assets/[name]-[hash][extname]';
          }
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
    // Proxy API requests to avoid CORS and 404s
    proxy: {
      // If we had a separate backend, we'd proxy here.
      // Instead, we're handling /api/ai/chat directly in configureServer below.
    }
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

// Helper to handle AI Chat requests in Vite Dev Server
function aiChatMiddleware(req, res, next) {
  if (req.url !== '/api/ai/chat' || req.method !== 'POST') {
    return next();
  }

  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', async () => {
    try {
      const { message, context, conversationHistory } = JSON.parse(body);

      // Dynamic import to avoid build issues if package is missing
      const { GoogleGenAI } = await import('@google/genai');

      // Get API key from process.env (Vite loads .env files)
      const apiKey = process.env.GEMINI_API || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

      if (!apiKey) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: 'AI Tutor is not configured. Missing API Key.' }));
        return;
      }

      const ai = new GoogleGenAI({ apiKey });

      // System prompt (simplified from dev-proxy.js)
      const SYSTEM_PROMPT = `You are an expert PTE pronunciation tutor.
Your role is to help students with pronunciation, IPA, and vocabulary.
Be encouraging, clear, and concise. Use bold for key terms.`;

      let fullPrompt = SYSTEM_PROMPT;

      if (context) {
        fullPrompt += `\n\nContext: Word "${context.word}"`;
        if (context.difficulty) fullPrompt += `, Difficulty: ${context.difficulty}`;
      }

      if (conversationHistory?.length) {
        fullPrompt += '\n\nHistory:\n' + conversationHistory.slice(-5).map(m =>
          `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`
        ).join('\n');
      }

      fullPrompt += `\n\nStudent: ${message}\n\nTutor:`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
      });

      const answer = response.text || "I couldn't generate a response.";

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, data: { answer } }));

    } catch (error: any) {
      console.error('AI Middleware Error:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  });
}
