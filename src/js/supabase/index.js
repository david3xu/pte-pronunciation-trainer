/**
 * Supabase Module Exports
 *
 * Central export hub for all Supabase-related functionality
 */
// Client
export { supabase, isAuthenticated, getCurrentUser, signOut } from './supabaseClient';
// Authentication
export { authService, AuthService } from './authService';
// Cloud Sync
export { syncService, SyncService } from './syncService';
// Auto Sync Manager
export { autoSyncManager, AutoSyncManager } from './autoSyncManager';
//# sourceMappingURL=index.js.map