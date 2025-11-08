/**
 * Authentication UI Controller
 *
 * Manages login/signup modal, authentication state, and user profile display
 * Integrates with Supabase authService and syncService
 */
import { authService } from '../supabase/authService.js';
import { syncService } from '../supabase/syncService.js';
/**
 * Authentication UI Controller
 */
export class AuthUI {
    currentUser = null;
    authModal = null;
    isInitialized = false;
    constructor() {
        console.log('[AuthUI] Initializing authentication UI');
    }
    /**
     * Initialize authentication UI
     */
    async initialize() {
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
    async checkAuthStatus() {
        const user = await authService.getUser();
        this.currentUser = user;
        this.updateAuthUI(user);
        if (user) {
            console.log('[AuthUI] User is authenticated:', user.email);
            // Initialize sync service for authenticated user
            await syncService.initialize();
        }
        else {
            console.log('[AuthUI] No user authenticated');
        }
    }
    /**
     * Update UI based on authentication state
     */
    updateAuthUI(user) {
        const loginBtn = document.getElementById('loginBtn');
        const userProfile = document.getElementById('userProfile');
        const userEmail = document.getElementById('userEmail');
        if (user) {
            // User is logged in
            if (loginBtn)
                loginBtn.style.display = 'none';
            if (userProfile)
                userProfile.style.display = 'flex';
            if (userEmail)
                userEmail.textContent = user.email || 'User';
        }
        else {
            // User is logged out
            if (loginBtn)
                loginBtn.style.display = 'inline-block';
            if (userProfile)
                userProfile.style.display = 'none';
        }
    }
    /**
     * Bind event listeners to auth UI elements
     */
    bindEventListeners() {
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
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
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
    showAuthModal(mode = 'login') {
        if (!this.authModal)
            return;
        this.switchTab(mode);
        this.authModal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
    /**
     * Hide authentication modal
     */
    hideAuthModal() {
        if (!this.authModal)
            return;
        this.authModal.style.display = 'none';
        document.body.style.overflow = ''; // Restore scrolling
        this.clearForms();
    }
    /**
     * Switch between login and signup tabs
     */
    switchTab(tab) {
        const loginTab = document.getElementById('loginTab');
        const signupTab = document.getElementById('signupTab');
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        if (tab === 'login') {
            loginTab?.classList.add('active');
            signupTab?.classList.remove('active');
            if (loginForm)
                loginForm.style.display = 'block';
            if (signupForm)
                signupForm.style.display = 'none';
        }
        else {
            signupTab?.classList.add('active');
            loginTab?.classList.remove('active');
            if (signupForm)
                signupForm.style.display = 'block';
            if (loginForm)
                loginForm.style.display = 'none';
        }
    }
    /**
     * Handle login form submission
     */
    async handleLogin(e) {
        e.preventDefault();
        const form = e.target;
        const email = form.querySelector('#loginEmail')?.value;
        const password = form.querySelector('#loginPassword')?.value;
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
        }
        else {
            this.showMessage(result.message || 'Login failed', 'error');
        }
    }
    /**
     * Handle signup form submission
     */
    async handleSignup(e) {
        e.preventDefault();
        const form = e.target;
        const email = form.querySelector('#signupEmail')?.value;
        const password = form.querySelector('#signupPassword')?.value;
        const confirmPassword = form.querySelector('#signupConfirmPassword')?.value;
        const fullName = form.querySelector('#signupFullName')?.value;
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
        }
        else {
            this.showMessage(result.message || 'Signup failed', 'error');
        }
    }
    /**
     * Handle logout
     */
    async handleLogout() {
        const confirmed = confirm('Are you sure you want to log out?');
        if (!confirmed)
            return;
        const result = await authService.signOut();
        if (result.success) {
            this.showMessage('Logged out successfully', 'success');
            this.currentUser = null;
            this.updateAuthUI(null);
        }
        else {
            this.showMessage(result.message || 'Logout failed', 'error');
        }
    }
    /**
     * Handle forgot password
     */
    async handleForgotPassword() {
        const email = prompt('Enter your email address:');
        if (!email)
            return;
        this.showLoading(true);
        const result = await authService.resetPassword(email);
        this.showLoading(false);
        if (result.success) {
            this.showMessage(result.message || 'Password reset email sent!', 'success');
        }
        else {
            this.showMessage(result.message || 'Failed to send reset email', 'error');
        }
    }
    /**
     * Load user settings from cloud
     */
    async loadCloudSettings() {
        if (!syncService.isAvailable())
            return;
        console.log('[AuthUI] Loading cloud settings...');
        const settings = await syncService.loadSettings();
        if (settings && Object.keys(settings).length > 0) {
            console.log('[AuthUI] ✅ Loaded', Object.keys(settings).length, 'settings from cloud');
            // Apply cloud settings to local storage
            const settingsModule = window.settingsModule;
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
    showLoading(isLoading) {
        const loadingOverlay = document.getElementById('authLoadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = isLoading ? 'flex' : 'none';
        }
        // Disable form buttons
        const buttons = this.authModal?.querySelectorAll('button[type="submit"]');
        buttons?.forEach((btn) => {
            btn.disabled = isLoading;
        });
    }
    /**
     * Show message to user
     */
    showMessage(message, type) {
        const messageElement = document.getElementById('authMessage');
        if (!messageElement)
            return;
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
    clearForms() {
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        const messageElement = document.getElementById('authMessage');
        if (loginForm)
            loginForm.reset();
        if (signupForm)
            signupForm.reset();
        if (messageElement)
            messageElement.style.display = 'none';
    }
    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }
    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!this.currentUser;
    }
}
// Export singleton instance
export const authUI = new AuthUI();
// Default export
export default authUI;
// Expose as global reference
if (typeof window !== 'undefined') {
    window.authUI = authUI;
}
//# sourceMappingURL=AuthUI.js.map