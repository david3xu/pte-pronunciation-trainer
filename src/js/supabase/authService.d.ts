/**
 * Authentication Service
 *
 * Type-safe authentication operations for PTE Pronunciation Trainer
 * Handles sign up, sign in, password reset, and session management
 */
import type { User, Session, AuthError } from '@supabase/supabase-js';
/**
 * Authentication result type
 */
export interface AuthResult {
    success: boolean;
    user?: User;
    session?: Session;
    error?: AuthError | Error;
    message?: string;
}
/**
 * Sign up credentials
 */
export interface SignUpCredentials {
    email: string;
    password: string;
    fullName?: string;
}
/**
 * Sign in credentials
 */
export interface SignInCredentials {
    email: string;
    password: string;
}
/**
 * AuthService - Handles all authentication operations
 */
export declare class AuthService {
    /**
     * Sign up a new user
     */
    signUp({ email, password, fullName }: SignUpCredentials): Promise<AuthResult>;
    /**
     * Sign in an existing user
     */
    signIn({ email, password }: SignInCredentials): Promise<AuthResult>;
    /**
     * Sign out the current user
     */
    signOut(): Promise<AuthResult>;
    /**
     * Send password reset email
     */
    resetPassword(email: string): Promise<AuthResult>;
    /**
     * Update user password (when logged in)
     */
    updatePassword(newPassword: string): Promise<AuthResult>;
    /**
     * Get current session
     */
    getSession(): Promise<Session | null>;
    /**
     * Get current user
     */
    getUser(): Promise<User | null>;
    /**
     * Check if user is authenticated
     */
    isAuthenticated(): Promise<boolean>;
    /**
     * Listen to authentication state changes
     */
    onAuthStateChange(callback: (user: User | null) => void): {
        data: {
            subscription: import("@supabase/auth-js").Subscription;
        };
    };
}
export declare const authService: AuthService;
export default authService;
/**
 * Global type declarations
 */
declare global {
    interface Window {
        authService: AuthService;
    }
}
//# sourceMappingURL=authService.d.ts.map