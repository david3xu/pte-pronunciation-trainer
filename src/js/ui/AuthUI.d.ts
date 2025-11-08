/**
 * Authentication UI Controller
 *
 * Manages login/signup modal, authentication state, and user profile display
 * Integrates with Supabase authService and syncService
 */
import type { User } from '@supabase/supabase-js';
/**
 * Authentication UI Controller
 */
export declare class AuthUI {
    private currentUser;
    private authModal;
    private isInitialized;
    constructor();
    /**
     * Initialize authentication UI
     */
    initialize(): Promise<void>;
    /**
     * Check current authentication status
     */
    private checkAuthStatus;
    /**
     * Update UI based on authentication state
     */
    private updateAuthUI;
    /**
     * Bind event listeners to auth UI elements
     */
    private bindEventListeners;
    /**
     * Show authentication modal
     */
    private showAuthModal;
    /**
     * Hide authentication modal
     */
    private hideAuthModal;
    /**
     * Switch between login and signup tabs
     */
    private switchTab;
    /**
     * Handle login form submission
     */
    private handleLogin;
    /**
     * Handle signup form submission
     */
    private handleSignup;
    /**
     * Handle logout
     */
    private handleLogout;
    /**
     * Handle forgot password
     */
    private handleForgotPassword;
    /**
     * Load user settings from cloud
     */
    private loadCloudSettings;
    /**
     * Show loading state
     */
    private showLoading;
    /**
     * Show message to user
     */
    private showMessage;
    /**
     * Clear all forms
     */
    private clearForms;
    /**
     * Get current user
     */
    getCurrentUser(): User | null;
    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean;
}
export declare const authUI: AuthUI;
export default authUI;
/**
 * Global type declarations
 */
declare global {
    interface Window {
        authUI: AuthUI;
    }
}
//# sourceMappingURL=AuthUI.d.ts.map