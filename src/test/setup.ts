import { beforeEach, vi } from 'vitest';

// Global test setup - similar to @BeforeEach in JUnit
beforeEach(() => {
  // Clear DOM before each test
  document.body.innerHTML = '';
  
  // Mock localStorage for session management tests
  Object.defineProperty(window, 'localStorage', {
    value: {
      store: {} as Record<string, string>,
      getItem(key: string): string | null {
        return this.store[key] || null;
      },
      setItem(key: string, value: string): void {
        this.store[key] = value;
      },
      removeItem(key: string): void {
        delete this.store[key];
      },
      clear(): void {
        this.store = {};
      }
    },
    writable: true
  });
  
  // Mock clipboard API
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: vi.fn(() => Promise.resolve())
    },
    writable: true
  });
});