/**
 * Supabase Client Configuration
 *
 * Type-safe Supabase client for authentication and database operations
 * Configured with project credentials from environment variables
 */
import { SupabaseClient } from '@supabase/supabase-js';
/**
 * Supabase client instance
 */
export declare const supabase: SupabaseClient;
/**
 * Export singleton instance
 */
export default supabase;
/**
 * Helper function to check if user is authenticated
 */
export declare function isAuthenticated(): Promise<boolean>;
/**
 * Helper function to get current user
 */
export declare function getCurrentUser(): Promise<import("@supabase/auth-js").User | null>;
/**
 * Helper function to sign out
 */
export declare function signOut(): Promise<void>;
/**
 * Global type declarations
 */
declare global {
    interface Window {
        supabase: SupabaseClient;
    }
}
/**
 * Database type exports for reference
 * These can be generated using: npx supabase gen types typescript --local
 */
export type Database = any;
//# sourceMappingURL=supabaseClient.d.ts.map