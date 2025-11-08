/**
 * Supabase Client Configuration
 *
 * Type-safe Supabase client for authentication and database operations
 * Configured with project credentials from environment variables
 */
import { createClient } from '@supabase/supabase-js';
/**
 * Supabase configuration
 * Reads from environment variables (Vercel/Vite)
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
    const errorMsg = `
❌ Supabase configuration missing!

Please set these environment variables:
- VITE_SUPABASE_URL: Your Supabase project URL
- VITE_SUPABASE_ANON_KEY: Your Supabase anonymous key

For Vercel:
1. Go to Project Settings → Environment Variables
2. Add both variables
3. Redeploy your project

For local development:
1. Create .env file in project root
2. Add: VITE_SUPABASE_URL=your-url
3. Add: VITE_SUPABASE_ANON_KEY=your-key
4. Restart dev server
  `.trim();
    console.error(errorMsg);
    throw new Error('Missing Supabase configuration');
}
/**
 * Supabase client instance
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
    },
});
/**
 * Export singleton instance
 */
export default supabase;
/**
 * Helper function to check if user is authenticated
 */
export async function isAuthenticated() {
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
// Expose as global reference for browser compatibility
if (typeof window !== 'undefined') {
    window.supabase = supabase;
}
//# sourceMappingURL=supabaseClient.js.map