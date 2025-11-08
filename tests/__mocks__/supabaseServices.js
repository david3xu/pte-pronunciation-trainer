/**
 * Supabase Services Mocks
 *
 * Mock implementations for testing
 */

export const authService = {
  signUp: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(() => Promise.resolve({ success: true })),
  resetPassword: jest.fn(),
  updatePassword: jest.fn(),
  getSession: jest.fn(() => Promise.resolve(null)),
  getUser: jest.fn(() => Promise.resolve(null)),
  isAuthenticated: jest.fn(() => Promise.resolve(false)),
  onAuthStateChange: jest.fn(),
};

export const syncService = {
  initialize: jest.fn(() => Promise.resolve()),
  isAvailable: jest.fn(() => false),
  syncProgress: jest.fn(),
  loadProgress: jest.fn(),
  syncSetting: jest.fn(),
  loadSettings: jest.fn(),
  saveStudySession: jest.fn(),
  getUserStats: jest.fn(),
  updateProfileStats: jest.fn(),
};

export const autoSyncManager = {
  start: jest.fn(),
  stop: jest.fn(),
  syncNow: jest.fn(),
};
