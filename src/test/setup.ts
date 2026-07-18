import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import '@testing-library/jest-dom';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

const storage = new Map<string, string>();
const localStorageMock: Storage = {
  get length() {
    return storage.size;
  },
  clear: vi.fn(() => storage.clear()),
  getItem: vi.fn((key: string) => storage.get(key) ?? null),
  key: vi.fn((index: number) => Array.from(storage.keys())[index] ?? null),
  removeItem: vi.fn((key: string) => {
    storage.delete(key);
  }),
  setItem: vi.fn((key: string, value: string) => {
    storage.set(key, value);
  }),
};

Object.defineProperty(window, 'localStorage', {
  configurable: true,
  writable: true,
  value: localStorageMock,
});

Object.defineProperty(global, 'localStorage', {
  configurable: true,
  writable: true,
  value: localStorageMock,
});

const speechSynthesisMock = {
  speaking: false,
  pending: false,
  paused: false,
  getVoices: vi.fn(() => []),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  cancel: vi.fn(),
  resume: vi.fn(),
  speak: vi.fn(),
};

Object.defineProperty(window, 'speechSynthesis', {
  configurable: true,
  writable: true,
  value: speechSynthesisMock,
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated
    removeListener: () => {}, // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;
