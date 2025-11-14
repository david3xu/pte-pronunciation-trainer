/**
 * Authentication UI Controller
 *
 * Manages login/signup modal, authentication state, and user profile display
 * Integrates with Supabase authService and syncService
 */

import { authService } from '../supabase/authService';
import { syncService } from '../supabase/syncService';
import type { User } from '@supabase/supabase-js';

/**
 * Authentication UI Controller
 */
export class AuthUI {
  private currentUser: User | null = null;
  private authModal: HTMLElement | null = null;
  private isInitialized: boolean = false;

  constructor() {
    console.log('[AuthUI] Initializing authentication UI');
  }

  /**
   * Initialize authentication UI
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('[AuthUI] Already initialized');
      return;
    }

    // Get modal element
    this.authModal = document.getElementById('authModal');
    if (!this.authModal) {
      console.error('[AuthUI] Auth modal not found in DOM');
      return;
    }

    // Bind event listeners
    this.bindEventListeners();

    // Check current authentication status
    await this.checkAuthStatus();

    // Listen to auth state changes
    authService.onAuthStateChange((user) => {
      this.currentUser = user;
      this.updateAuthUI(user);
    });

    this.isInitialized = true;
    console.log('[AuthUI] ✅ Initialized successfully');
  }

  /**
   * Check current authentication status
   */
  private async checkAuthStatus(): Promise<void> {
    const user = await authService.getUser();
    this.currentUser = user;
    this.updateAuthUI(user);

    if (user) {
      console.log('[AuthUI] User is authenticated:', user.email);
      // Initialize sync service for authenticated user
      await syncService.initialize();
    } else {
      console.log('[AuthUI] No user authenticated');
    }
  }

  /**
   * Update UI based on authentication state
   */
  private updateAuthUI(user: User | null): void {
    const loginBtn = document.getElementById('loginBtn');
    const userProfile = document.getElementById('userProfile');
    const userEmail = document.getElementById('userEmail');

    if (user) {
      // User is logged in
      if (loginBtn) loginBtn.style.display = 'none';
      if (userProfile) userProfile.style.display = 'flex';
      if (userEmail) userEmail.textContent = user.email || 'User';
    } else {
      // User is logged out
      if (loginBtn) loginBtn.style.display = 'inline-block';
      if (userProfile) userProfile.style.display = 'none';
    }
  }

  /**
   * Bind event listeners to auth UI elements
   */
  private bindEventListeners(): void {
    // Login button - show modal
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => this.showAuthModal('login'));
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
    }

    // Close modal button
    const closeModalBtn = document.getElementById('closeAuthModal');
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', () => this.hideAuthModal());
    }

    // Close modal on background click
    if (this.authModal) {
      this.authModal.addEventListener('click', (e) => {
        if (e.target === this.authModal) {
          this.hideAuthModal();
        }
      });
    }

    // Tab switching
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');
    if (loginTab) {
      loginTab.addEventListener('click', () => this.switchTab('login'));
    }
    if (signupTab) {
      signupTab.addEventListener('click', () => this.switchTab('signup'));
    }

    // Form submissions
    const loginForm = document.getElementById('loginForm') as HTMLFormElement;
    const signupForm = document.getElementById('signupForm') as HTMLFormElement;

    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    if (signupForm) {
      signupForm.addEventListener('submit', (e) => this.handleSignup(e));
    }

    // Forgot password link
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    if (forgotPasswordLink) {
      forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleForgotPassword();
      });
    }
  }

  /**
   * Show authentication modal
   */
  private showAuthModal(mode: 'login' | 'signup' = 'login'): void {
    if (!this.authModal) return;

    this.switchTab(mode);
    this.authModal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  }

  /**
   * Hide authentication modal
   */
  private hideAuthModal(): void {
    if (!this.authModal) return;

    this.authModal.style.display = 'none';
    document.body.style.overflow = ''; // Restore scrolling
    this.clearForms();
  }

  /**
   * Switch between login and signup tabs
   */
  private switchTab(tab: 'login' | 'signup'): void {
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    if (tab === 'login') {
      loginTab?.classList.add('active');
      signupTab?.classList.remove('active');
      if (loginForm) loginForm.style.display = 'block';
      if (signupForm) signupForm.style.display = 'none';
    } else {
      signupTab?.classList.add('active');
      loginTab?.classList.remove('active');
      if (signupForm) signupForm.style.display = 'block';
      if (loginForm) loginForm.style.display = 'none';
    }
  }

  /**
   * Handle login form submission
   */
  private async handleLogin(e: Event): Promise<void> {
    e.preventDefault();

    const form = e.target as HTMLFormElement;
    const email = (form.querySelector('#loginEmail') as HTMLInputElement)?.value;
    const password = (form.querySelector('#loginPassword') as HTMLInputElement)?.value;

    if (!email || !password) {
      this.showMessage('Please enter both email and password', 'error');
      return;
    }

    this.showLoading(true);

    const result = await authService.signIn({ email, password });

    this.showLoading(false);

    if (result.success) {
      this.showMessage(result.message || 'Logged in successfully!', 'success');
      setTimeout(() => this.hideAuthModal(), 1500);

      // Initialize sync service
      await syncService.initialize();

      // Load user settings from cloud
      this.loadCloudSettings();
    } else {
      this.showMessage(result.message || 'Login failed', 'error');
    }
  }

  /**
   * Handle signup form submission
   */
  private async handleSignup(e: Event): Promise<void> {
    e.preventDefault();

    const form = e.target as HTMLFormElement;
    const email = (form.querySelector('#signupEmail') as HTMLInputElement)?.value;
    const password = (form.querySelector('#signupPassword') as HTMLInputElement)?.value;
    const confirmPassword = (form.querySelector('#signupConfirmPassword') as HTMLInputElement)?.value;
    const fullName = (form.querySelector('#signupFullName') as HTMLInputElement)?.value;

    if (!email || !password) {
      this.showMessage('Please enter email and password', 'error');
      return;
    }

    if (password !== confirmPassword) {
      this.showMessage('Passwords do not match', 'error');
      return;
    }

    if (password.length < 8) {
      this.showMessage('Password must be at least 8 characters', 'error');
      return;
    }

    this.showLoading(true);

    const result = await authService.signUp({
      email,
      password,
      fullName: fullName || undefined,
    });

    this.showLoading(false);

    if (result.success) {
      this.showMessage(result.message || 'Account created! Please check your email.', 'success');
      setTimeout(() => {
        this.hideAuthModal();
        this.switchTab('login');
      }, 3000);
    } else {
      this.showMessage(result.message || 'Signup failed', 'error');
    }
  }

  /**
   * Handle logout
   */
  private async handleLogout(): Promise<void> {
    const confirmed = confirm('Are you sure you want to log out?');
    if (!confirmed) return;

    const result = await authService.signOut();

    if (result.success) {
      this.showMessage('Logged out successfully', 'success');
      this.currentUser = null;
      this.updateAuthUI(null);
    } else {
      this.showMessage(result.message || 'Logout failed', 'error');
    }
  }

  /**
   * Handle forgot password
   */
  private async handleForgotPassword(): Promise<void> {
    const email = prompt('Enter your email address:');
    if (!email) return;

    this.showLoading(true);

    const result = await authService.resetPassword(email);

    this.showLoading(false);

    if (result.success) {
      this.showMessage(result.message || 'Password reset email sent!', 'success');
    } else {
      this.showMessage(result.message || 'Failed to send reset email', 'error');
    }
  }

  /**
   * Load user settings from cloud
   */
  private async loadCloudSettings(): Promise<void> {
    if (!syncService.isAvailable()) return;

    console.log('[AuthUI] Loading cloud settings...');
    const settings = await syncService.loadSettings();

    if (settings && Object.keys(settings).length > 0) {
      console.log('[AuthUI] ✅ Loaded', Object.keys(settings).length, 'settings from cloud');

      // Apply cloud settings to local storage
      const settingsModule = (window as any).settingsModule;
      if (settingsModule) {
        Object.entries(settings).forEach(([key, value]) => {
          console.log(`[AuthUI] Applying cloud setting: ${key} =`, value);
          settingsModule.updateSetting(key, value);
        });
      }
    }
  }

  /**
   * Show loading state
   */
  private showLoading(isLoading: boolean): void {
    const loadingOverlay = document.getElementById('authLoadingOverlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = isLoading ? 'flex' : 'none';
    }

    // Disable form buttons
    const buttons = this.authModal?.querySelectorAll('button[type="submit"]');
    buttons?.forEach((btn) => {
      (btn as HTMLButtonElement).disabled = isLoading;
    });
  }

  /**
   * Show message to user
   */
  private showMessage(message: string, type: 'success' | 'error'): void {
    const messageElement = document.getElementById('authMessage');
    if (!messageElement) return;

    messageElement.textContent = message;
    messageElement.className = `auth-message ${type}`;
    messageElement.style.display = 'block';

    // Auto-hide after 5 seconds
    setTimeout(() => {
      messageElement.style.display = 'none';
    }, 5000);
  }

  /**
   * Clear all forms
   */
  private clearForms(): void {
    const loginForm = document.getElementById('loginForm') as HTMLFormElement;
    const signupForm = document.getElementById('signupForm') as HTMLFormElement;
    const messageElement = document.getElementById('authMessage');

    if (loginForm) loginForm.reset();
    if (signupForm) signupForm.reset();
    if (messageElement) messageElement.style.display = 'none';
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.currentUser;
  }
}

// Export singleton instance
export const authUI = new AuthUI();

// Default export
export default authUI;

/**
 * Global type declarations
 */
declare global {
  interface Window {
    authUI: AuthUI;
  }
}

// Expose as global reference
if (typeof window !== 'undefined') {
  (window as any).authUI = authUI;
}
