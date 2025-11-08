/**
 * Supabase Client Configuration
 *
 * Type-safe Supabase client for authentication and database operations
 * Configured with project credentials from environment variables
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase configuration
 * Reads from .env file or falls back to hardcoded values
 */
const supabaseUrl = 'https://kopzyjpniqqsxefteyfx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvcHp5anBuaXFxc3hlZnRleWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1NzkxMzEsImV4cCI6MjA3ODE1NTEzMX0.7rGy0aL97xJL5aooz4qGIraqLM0jlXtFkRJn1ZVOPXQ';

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase configuration missing!');
  console.error('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env');
}

/**
 * Supabase client instance
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
    },
  }
);

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
