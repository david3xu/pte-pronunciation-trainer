/// <reference types="vite/client" />

/**
 * Environment Variable Type Definitions
 *
 * Defines type-safe environment variables for the application.
 * These variables can be accessed via import.meta.env in TypeScript files.
 */

interface ImportMetaEnv {
  /**
   * Supabase Project URL
   * @example "https://your-project.supabase.co"
   */
  readonly VITE_SUPABASE_URL: string;

  /**
   * Supabase Anonymous Key (Public Key)
   * Safe to expose in client-side code
   */
  readonly VITE_SUPABASE_ANON_KEY: string;

  /**
   * Application Environment
   * @default "development"
   */
  readonly MODE: string;

  /**
   * Development mode flag
   */
  readonly DEV: boolean;

  /**
   * Production mode flag
   */
  readonly PROD: boolean;

  /**
   * Server-side rendering flag
   */
  readonly SSR: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
