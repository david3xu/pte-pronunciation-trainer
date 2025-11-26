/**
 * Supabase Client Configuration
 *
 * Type-safe Supabase client for authentication and database operations
 * Configured with project credentials from environment variables
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase configuration
 * Reads from environment variables (Vercel runtime)
 * Falls back to empty strings if not configured (app will work without auth)
 */
const getEnvVar = (key: string): string => {
  // Try Vite-style env vars (if using Vite)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return (import.meta.env as any)[key] || '';
  }
  // Try process.env (if in Node.js context)
  if (typeof process !== 'undefined' && process.env) {
    return (process.env as any)[key] || '';
  }
  // Fallback to empty string
  return '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

// Create a dummy client if configuration is missing
let supabaseInstance: SupabaseClient | null = null;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(`
⚠️ Supabase configuration missing - running in guest mode

Authentication features will be disabled.
To enable auth, set these environment variables in Vercel:
- VITE_SUPABASE_URL: Your Supabase project URL
- VITE_SUPABASE_ANON_KEY: Your Supabase anonymous key
  `.trim());

  // Create a placeholder object that won't crash the app
  supabaseInstance = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    // Mock database operations for guest mode
    from: (_table: string) => ({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: null, error: null }),
      update: () => ({ data: null, error: null }),
      delete: () => ({ data: null, error: null }),
      upsert: () => ({ data: null, error: null }),
    }),
  } as any;
} else {
  // Real Supabase client with valid configuration
  supabaseInstance = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    }
  );
}

/**
 * Supabase client instance
 */
export const supabase: SupabaseClient = supabaseInstance as SupabaseClient;

/**
 * Export singleton instance
 */
export default supabase;

/**
 * Helper function to check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}

/**
 * Helper function to get current user
 */
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Helper function to sign out
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Sign out error:', error);
    throw error;
  }
}

/**
 * Global type declarations
 */
declare global {
  interface Window {
    supabase: SupabaseClient;
  }
}

// Expose as global reference for browser compatibility
if (typeof window !== 'undefined') {
  (window as any).supabase = supabase;
}

/**
 * Database type exports for reference
 * These can be generated using: npx supabase gen types typescript --local
 */
export type Database = any; // Simplified for now - can be generated later
