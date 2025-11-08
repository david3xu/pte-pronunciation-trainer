/**
 * Authentication Service
 *
 * Type-safe authentication operations for PTE Pronunciation Trainer
 * Handles sign up, sign in, password reset, and session management
 */

import { supabase } from './supabaseClient';
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
export class AuthService {
  /**
   * Sign up a new user
   */
  async signUp({ email, password, fullName }: SignUpCredentials): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || null,
          },
        },
      });

      if (error) {
        return {
          success: false,
          error,
          message: error.message,
        };
      }

      // Create profile entry
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: data.user.id,
            email: data.user.email!,
            full_name: fullName || null,
          }]);

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }
      }

      return {
        success: true,
        user: data.user ?? undefined,
        session: data.session ?? undefined,
        message: 'Account created successfully! Please check your email to confirm.',
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        message: 'An unexpected error occurred during sign up.',
      };
    }
  }

  /**
   * Sign in an existing user
   */
  async signIn({ email, password }: SignInCredentials): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return {
          success: false,
          error,
          message: error.message,
        };
      }

      return {
        success: true,
        user: data.user,
        session: data.session,
        message: 'Signed in successfully!',
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        message: 'An unexpected error occurred during sign in.',
      };
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<AuthResult> {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return {
          success: false,
          error,
          message: error.message,
        };
      }

      return {
        success: true,
        message: 'Signed out successfully!',
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        message: 'An unexpected error occurred during sign out.',
      };
    }
  }

  /**
   * Send password reset email
   */
  async resetPassword(email: string): Promise<AuthResult> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        return {
          success: false,
          error,
          message: error.message,
        };
      }

      return {
        success: true,
        message: 'Password reset email sent! Please check your inbox.',
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        message: 'An unexpected error occurred while sending reset email.',
      };
    }
  }

  /**
   * Update user password (when logged in)
   */
  async updatePassword(newPassword: string): Promise<AuthResult> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return {
          success: false,
          error,
          message: error.message,
        };
      }

      return {
        success: true,
        message: 'Password updated successfully!',
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        message: 'An unexpected error occurred while updating password.',
      };
    }
  }

  /**
   * Get current session
   */
  async getSession(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession();
    return data.session;
  }

  /**
   * Get current user
   */
  async getUser(): Promise<User | null> {
    const { data } = await supabase.auth.getUser();
    return data.user;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession();
    return !!session;
  }

  /**
   * Listen to authentication state changes
   */
  onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null);
    });
  }
}

// Export singleton instance
export const authService = new AuthService();

// Default export
export default authService;

/**
 * Global type declarations
 */
declare global {
  interface Window {
    authService: AuthService;
  }
}

// Expose as global reference
if (typeof window !== 'undefined') {
  (window as any).authService = authService;
}
