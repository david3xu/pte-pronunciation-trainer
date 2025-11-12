/**
 * Supabase Module Exports
 *
 * Central export hub for all Supabase-related functionality
 */
export { supabase, isAuthenticated, getCurrentUser, signOut } from './supabaseClient';
export type { Database } from './supabaseClient';
export { authService, AuthService } from './authService';
export type { AuthResult, SignUpCredentials, SignInCredentials, } from './authService';
export { syncService, SyncService } from './syncService';
export type { SyncResult } from './syncService';
export { autoSyncManager, AutoSyncManager } from './autoSyncManager';
//# sourceMappingURL=index.d.ts.map