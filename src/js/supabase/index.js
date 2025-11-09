/**
 * Supabase Module Exports
 *
 * Central export hub for all Supabase-related functionality
 */
// Client
export { supabase, isAuthenticated, getCurrentUser, signOut } from './supabaseClient.js';
// Authentication
export { authService, AuthService } from './authService.js';
// Cloud Sync
export { syncService, SyncService } from './syncService.js';
// Auto Sync Manager
export { autoSyncManager, AutoSyncManager } from './autoSyncManager.js';
//# sourceMappingURL=index.js.map