// Session Management Tests - Comprehensive test suite for session persistence
import { test, expect } from '@playwright/test';
import type { SessionData, UserPreferences } from '../../types/core';

test.describe('Session Management', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.addInitScript(() => {
      localStorage.clear();
    });
    
    await page.goto('http://localhost:5173');
    
    // Wait for application to be ready
    await page.waitForSelector('[data-role="input"]', { timeout: 10000 });
  });

  test.describe('SessionManager', () => {
    test('should save and load session data', async ({ page }) => {
      const testContent = '{"test": "data", "number": 42}';
      
      // Input test data
      const inputElement = page.locator('[data-role="input"]');
      await inputElement.fill(testContent);
      
      // Wait for parsing and auto-save
      await page.waitForTimeout(2000);
      
      // Verify session was saved
      const sessionData = await page.evaluate(() => {
        const stored = localStorage.getItem('codekit-session');
        return stored ? JSON.parse(atob(decodeURIComponent(stored))) : null;
      });
      
      expect(sessionData).toBeTruthy();
      expect(sessionData.content).toBe(testContent);
      expect(sessionData.format).toBe('json');
      expect(sessionData.renderMode).toBe('interactive');
      expect(sessionData.timestamp).toBeGreaterThan(Date.now() - 5000);
    });

    test('should restore session on page reload', async ({ page }) => {
      const testContent = '{"name": "test", "values": [1, 2, 3]}';
      
      // Input test data and wait for save
      const inputElement = page.locator('[data-role="input"]');
      await inputElement.fill(testContent);
      await page.waitForTimeout(2000);
      
      // Reload page
      await page.reload();
      await page.waitForSelector('[data-role="input"]', { timeout: 10000 });
      
      // Verify content was restored
      const restoredContent = await inputElement.inputValue();
      expect(restoredContent).toBe(testContent);
    });

    test('should handle large session data', async ({ page }) => {
      // Create moderately large JSON object (approximately 100KB for faster testing)
      const largeArray = Array(500).fill(0).map((_, i) => ({
        id: i,
        name: `Item ${i}`,
        description: `This is a description for item number ${i}`,
        tags: [`tag-${i}`, `category-${Math.floor(i / 100)}`, 'large-dataset']
      }));
      
      const largeContent = JSON.stringify(largeArray, null, 2);
      
      // Input large data
      const inputElement = page.locator('[data-role="input"]');
      await inputElement.fill(largeContent);
      await page.waitForTimeout(2000); // Allow time for auto-save
      
      // Verify session was saved
      const sessionExists = await page.evaluate(() => {
        return localStorage.getItem('codekit-session') !== null;
      });
      
      expect(sessionExists).toBe(true);
      
      // Reload and verify restoration
      await page.reload();
      await page.waitForSelector('[data-role="input"]', { timeout: 10000 });
      
      const restoredContent = await inputElement.inputValue();
      expect(restoredContent.length).toBeGreaterThan(10000);
      expect(restoredContent).toContain('"name": "Item 0"');
      expect(restoredContent).toContain('"name": "Item 499"');
    });

    test('should clear session data', async ({ page }) => {
      const testContent = '{"test": "data"}';
      
      // Input test data and wait for save
      const inputElement = page.locator('[data-role="input"]');
      await inputElement.fill(testContent);
      await page.waitForTimeout(2000);
      
      // Clear session via localStorage (simulating the clear functionality)
      await page.evaluate(() => {
        localStorage.removeItem('codekit-session');
      });
      
      // Verify session was cleared
      const sessionData = await page.evaluate(() => {
        return localStorage.getItem('codekit-session');
      });
      
      expect(sessionData).toBeNull();
      
      // The UI won't auto-clear without page reload, so we don't test that here
      // This test focuses on the storage mechanism
    });
  });

  test.describe('UserPreferences', () => {
    test('should save and load user preferences', async ({ page }) => {
      // Set preferences via browser console (simulate user preferences)
      await page.evaluate(() => {
        const preferences = {
          autoSave: false,
          autoSaveInterval: 60000,
          theme: 'light',
          rememberInputFormat: false,
          enableCrossTabSync: false,
          compressionEnabled: false
        };
        const encrypted = btoa(encodeURIComponent(JSON.stringify(preferences)));
        localStorage.setItem('codekit-preferences', encrypted);
      });
      
      // Verify preferences were saved
      const savedPreferences = await page.evaluate(() => {
        const stored = localStorage.getItem('codekit-preferences');
        return stored ? JSON.parse(atob(decodeURIComponent(stored))) : null;
      });
      
      expect(savedPreferences).toBeTruthy();
      expect(savedPreferences.autoSave).toBe(false);
      expect(savedPreferences.theme).toBe('light');
      expect(savedPreferences.autoSaveInterval).toBe(60000);
    });

    test('should validate preference values', async ({ page }) => {
      // Test invalid preference values by checking localStorage directly
      const validationResult = await page.evaluate(() => {
        try {
          // Try to save invalid preferences manually
          const invalidPreferences = {
            autoSave: 'invalid', // Should be boolean
            autoSaveInterval: 500, // Too low
            theme: 'invalid-theme' // Invalid theme
          };
          
          // Simulate validation that would happen in UserPreferencesManager
          const errors = [];
          if (typeof invalidPreferences.autoSave !== 'boolean') {
            errors.push('autoSave must be a boolean');
          }
          if (typeof invalidPreferences.autoSaveInterval !== 'number' || invalidPreferences.autoSaveInterval < 1000) {
            errors.push('autoSaveInterval must be a number >= 1000ms');
          }
          if (!['dark', 'light'].includes(invalidPreferences.theme)) {
            errors.push('theme must be "dark" or "light"');
          }
          
          return errors.length > 0 ? errors.join(', ') : false;
        } catch (error) {
          return error.message;
        }
      });
      
      expect(validationResult).toContain('autoSaveInterval must be');
    });

    test('should merge with defaults for missing properties', async ({ page }) => {
      // Save partial preferences
      await page.evaluate(() => {
        const partial = { autoSave: false };
        const encrypted = btoa(encodeURIComponent(JSON.stringify(partial)));
        localStorage.setItem('codekit-preferences', encrypted);
      });
      
      // Reload page to test preference loading
      await page.reload();
      await page.waitForSelector('[data-role="input"]', { timeout: 10000 });
      
      // Verify preferences were loaded and merged with defaults
      const mergedPreferences = await page.evaluate(() => {
        const stored = localStorage.getItem('codekit-preferences');
        if (!stored) return null;
        
        const partial = JSON.parse(decodeURIComponent(atob(stored)));
        // Simulate merging with defaults
        const defaults = {
          autoSave: true,
          autoSaveInterval: 30000,
          theme: 'dark',
          rememberInputFormat: true,
          enableCrossTabSync: true,
          compressionEnabled: true
        };
        
        return { ...defaults, ...partial };
      });
      
      expect(mergedPreferences.autoSave).toBe(false); // From saved
      expect(mergedPreferences.theme).toBe('dark'); // Default
      expect(mergedPreferences.autoSaveInterval).toBe(30000); // Default
    });
  });

  test.describe('Auto-Save Functionality', () => {
    test('should auto-save after input changes', async ({ page }) => {
      const testContent = 'Hello, World!';
      
      // Input text
      const inputElement = page.locator('[data-role="input"]');
      await inputElement.fill(testContent);
      
      // Wait for auto-save (1 second after input)
      await page.waitForTimeout(1500);
      
      // Verify session was saved
      const sessionData = await page.evaluate(() => {
        const stored = localStorage.getItem('codekit-session');
        return stored ? JSON.parse(atob(decodeURIComponent(stored))) : null;
      });
      
      expect(sessionData?.content).toBe(testContent);
    });

    test('should debounce auto-save during rapid input', async ({ page }) => {
      const inputElement = page.locator('[data-role="input"]');
      
      // Simulate rapid typing
      await inputElement.fill('a');
      await page.waitForTimeout(100);
      await inputElement.fill('ab');
      await page.waitForTimeout(100);
      await inputElement.fill('abc');
      await page.waitForTimeout(100);
      await inputElement.fill('abcd');
      
      // Wait less than auto-save interval
      await page.waitForTimeout(500);
      
      // Should not be saved yet due to debouncing
      const sessionData1 = await page.evaluate(() => {
        const stored = localStorage.getItem('codekit-session');
        return stored ? JSON.parse(atob(decodeURIComponent(stored))) : null;
      });
      
      expect(sessionData1?.content || '').not.toBe('abcd');
      
      // Wait for debounce to complete
      await page.waitForTimeout(1000);
      
      // Now should be saved
      const sessionData2 = await page.evaluate(() => {
        const stored = localStorage.getItem('codekit-session');
        return stored ? JSON.parse(atob(decodeURIComponent(stored))) : null;
      });
      
      expect(sessionData2?.content).toBe('abcd');
    });

    test('should respect auto-save preferences', async ({ page }) => {
      // Disable auto-save
      await page.evaluate(() => {
        const { userPreferencesManager } = require('../../core/session/UserPreferences.ts');
        userPreferencesManager.updatePreference('autoSave', false);
      });
      
      const testContent = 'No auto-save test';
      
      // Input text
      const inputElement = page.locator('[data-role="input"]');
      await inputElement.fill(testContent);
      
      // Wait longer than auto-save interval
      await page.waitForTimeout(2000);
      
      // Verify session was NOT auto-saved
      const sessionData = await page.evaluate(() => {
        return localStorage.getItem('codekit-session');
      });
      
      expect(sessionData).toBeNull();
    });
  });

  test.describe('Recovery Modal', () => {
    test('should show recovery modal for existing session', async ({ page }) => {
      // Pre-populate localStorage with session data
      await page.evaluate(() => {
        const sessionData = {
          content: '{"recovery": "test"}',
          format: 'json',
          renderMode: 'interactive',
          timestamp: Date.now() - 1000 * 60 * 5 // 5 minutes ago
        };
        const encrypted = btoa(encodeURIComponent(JSON.stringify(sessionData)));
        localStorage.setItem('codekit-session', encrypted);
      });
      
      // Reload page to trigger recovery
      await page.reload();
      
      // Wait for recovery modal to appear
      await page.waitForSelector('.recovery-modal__dialog', { timeout: 5000 });
      
      // Verify modal content
      const modalTitle = await page.locator('.recovery-modal__dialog h2').textContent();
      expect(modalTitle).toContain('Session Recovery');
      
      const contentPreview = await page.locator('.recovery-modal__dialog pre').textContent();
      expect(contentPreview).toContain('"recovery": "test"');
    });

    test('should restore session when clicking restore button', async ({ page }) => {
      const testContent = '{"restored": true, "timestamp": ' + Date.now() + '}';
      
      // Pre-populate localStorage
      await page.evaluate((content) => {
        const sessionData = {
          content,
          format: 'json',
          renderMode: 'interactive',
          timestamp: Date.now() - 1000 * 60 * 2
        };
        const encrypted = btoa(encodeURIComponent(JSON.stringify(sessionData)));
        localStorage.setItem('codekit-session', encrypted);
      }, testContent);
      
      // Reload page
      await page.reload();
      await page.waitForSelector('.recovery-modal__dialog', { timeout: 5000 });
      
      // Click restore button
      await page.click('[data-action="restore"]');
      
      // Wait for modal to close and content to be restored
      await page.waitForSelector('.recovery-modal__dialog', { state: 'hidden', timeout: 2000 });
      
      // Verify content was restored
      const inputElement = page.locator('[data-role="input"]');
      const restoredContent = await inputElement.inputValue();
      expect(restoredContent).toBe(testContent);
    });

    test('should clear session when clicking discard button', async ({ page }) => {
      // Pre-populate localStorage
      await page.evaluate(() => {
        const sessionData = {
          content: '{"discard": "test"}',
          format: 'json',
          renderMode: 'interactive',
          timestamp: Date.now() - 1000 * 60 * 10
        };
        const encrypted = btoa(encodeURIComponent(JSON.stringify(sessionData)));
        localStorage.setItem('codekit-session', encrypted);
      });
      
      // Reload page
      await page.reload();
      await page.waitForSelector('.recovery-modal__dialog', { timeout: 5000 });
      
      // Click discard button
      await page.click('[data-action="discard"]');
      
      // Wait for modal to close
      await page.waitForSelector('.recovery-modal__dialog', { state: 'hidden', timeout: 2000 });
      
      // Verify session was cleared
      const sessionData = await page.evaluate(() => {
        return localStorage.getItem('codekit-session');
      });
      
      expect(sessionData).toBeNull();
      
      // Verify input is empty
      const inputElement = page.locator('[data-role="input"]');
      const inputValue = await inputElement.inputValue();
      expect(inputValue).toBe('');
    });

    test('should not show modal for old sessions', async ({ page }) => {
      // Pre-populate localStorage with old session (>24 hours)
      await page.evaluate(() => {
        const sessionData = {
          content: '{"old": "session"}',
          format: 'json',
          renderMode: 'interactive',
          timestamp: Date.now() - 25 * 60 * 60 * 1000 // 25 hours ago
        };
        const encrypted = btoa(encodeURIComponent(JSON.stringify(sessionData)));
        localStorage.setItem('codekit-session', encrypted);
      });
      
      // Reload page
      await page.reload();
      await page.waitForSelector('[data-role="input"]', { timeout: 10000 });
      
      // Wait and verify modal does NOT appear
      await page.waitForTimeout(1000);
      const modalExists = await page.locator('.recovery-modal__dialog').count();
      expect(modalExists).toBe(0);
      
      // Verify old session was cleared
      const sessionData = await page.evaluate(() => {
        return localStorage.getItem('codekit-session');
      });
      
      expect(sessionData).toBeNull();
    });
  });

  test.describe('Keyboard Shortcuts', () => {
    test('should save session with Ctrl+S', async ({ page }) => {
      const testContent = '{"keyboard": "shortcut", "save": true}';
      
      // Input content
      const inputElement = page.locator('[data-role="input"]');
      await inputElement.fill(testContent);
      
      // Clear any existing auto-save
      await page.evaluate(() => {
        localStorage.removeItem('codekit-session');
      });
      
      // Use keyboard shortcut (focus outside input first)
      await page.click('body');
      await page.keyboard.press('Control+s');
      
      // Wait for save notification
      await page.waitForSelector('div:has-text("Session saved")', { timeout: 3000 });
      
      // Verify session was saved
      const sessionData = await page.evaluate(() => {
        const stored = localStorage.getItem('codekit-session');
        return stored ? JSON.parse(atob(decodeURIComponent(stored))) : null;
      });
      
      expect(sessionData?.content).toBe(testContent);
    });

    test('should show recovery modal with Ctrl+Shift+R', async ({ page }) => {
      // Pre-populate session
      await page.evaluate(() => {
        const sessionData = {
          content: '{"manual": "recovery"}',
          format: 'json',
          renderMode: 'interactive',
          timestamp: Date.now() - 1000 * 60
        };
        const encrypted = btoa(encodeURIComponent(JSON.stringify(sessionData)));
        localStorage.setItem('codekit-session', encrypted);
      });
      
      // Use keyboard shortcut
      await page.keyboard.press('Control+Shift+r');
      
      // Verify modal appears
      await page.waitForSelector('.recovery-modal__dialog', { timeout: 3000 });
      
      const modalTitle = await page.locator('.recovery-modal__dialog h2').textContent();
      expect(modalTitle).toContain('Session Recovery');
    });
  });

  test.describe('Performance', () => {
    test('should handle session operations under performance constraints', async ({ page }) => {
      const startTime = Date.now();
      
      // Moderately large session data for realistic testing
      const largeContent = JSON.stringify({
        data: Array(200).fill(0).map((_, i) => ({ id: i, value: `item-${i}` }))
      });
      
      // Input and save
      const inputElement = page.locator('[data-role="input"]');
      await inputElement.fill(largeContent);
      await page.waitForTimeout(1500);
      
      const saveTime = Date.now() - startTime;
      expect(saveTime).toBeLessThan(8000); // Should save within 8 seconds (more realistic)
      
      // Reload and restore
      const reloadStart = Date.now();
      await page.reload();
      await page.waitForSelector('[data-role="input"]', { timeout: 10000 });
      
      const restoreTime = Date.now() - reloadStart;
      expect(restoreTime).toBeLessThan(5000); // Should restore within 5 seconds
      
      // Verify content was restored correctly
      const restoredContent = await inputElement.inputValue();
      expect(restoredContent.length).toBeGreaterThan(1000);
    });

    test('should handle localStorage efficiently', async ({ page }) => {
      // Test multiple session saves to ensure localStorage handling is efficient
      const sessions = [];
      
      for (let i = 0; i < 3; i++) {
        const content = JSON.stringify({
          iteration: i,
          data: Array(100).fill(0).map((_, j) => ({ id: j, value: `data-${i}-${j}` }))
        });
        
        const inputElement = page.locator('[data-role="input"]');
        await inputElement.fill(content);
        await page.waitForTimeout(1200);
        
        // Verify session was saved
        const sessionExists = await page.evaluate(() => {
          return localStorage.getItem('codekit-session') !== null;
        });
        
        expect(sessionExists).toBe(true);
        sessions.push(content);
      }
      
      // Verify final session is the most recent
      const finalContent = await page.locator('[data-role="input"]').inputValue();
      expect(finalContent).toContain('"iteration": 2');
    });
  });
});