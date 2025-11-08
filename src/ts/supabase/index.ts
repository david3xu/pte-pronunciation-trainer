/**
 * Supabase Module Exports
 *
 * Central export hub for all Supabase-related functionality
 */

// Client
export { supabase, isAuthenticated, getCurrentUser, signOut } from './supabaseClient';
export type { Database } from './supabaseClient';

// Authentication
export { authService, AuthService } from './authService';
export type {
  AuthResult,
  SignUpCredentials,
  SignInCredentials,
} from './authService';

// Cloud Sync
export { syncService, SyncService } from './syncService';
export type { SyncResult } from './syncService';

// Auto Sync Manager
export { autoSyncManager, AutoSyncManager } from './autoSyncManager';
