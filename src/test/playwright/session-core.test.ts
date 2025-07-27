// Core Session Management Tests - Focused tests for session persistence
import { test, expect } from '@playwright/test';

test.describe('Session Management Core', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.addInitScript(() => {
      localStorage.clear();
    });
    
    await page.goto('http://localhost:5174');
    
    // Wait for application to be ready
    await page.waitForSelector('[data-role="input"]', { timeout: 10000 });
  });

  test('should save session data to localStorage', async ({ page }) => {
    const testContent = '{"test": "data", "number": 42}';
    
    // Input test data
    const inputElement = page.locator('[data-role="input"]');
    await inputElement.fill(testContent);
    
    // Wait for auto-save (1 second debounce + processing time)
    await page.waitForTimeout(3000);
    
    // Check if session data exists in localStorage
    const sessionExists = await page.evaluate(() => {
      return localStorage.getItem('codekit-session') !== null;
    });
    
    expect(sessionExists).toBe(true);
    
    // Check if the session contains our content
    const sessionContent = await page.evaluate(() => {
      const stored = localStorage.getItem('codekit-session');
      if (!stored) return null;
      try {
        const decoded = decodeURIComponent(atob(stored));
        const sessionData = JSON.parse(decoded);
        return sessionData.content;
      } catch (error) {
        return null;
      }
    });
    
    expect(sessionContent).toBe(testContent);
  });

  test('should restore session after page reload', async ({ page }) => {
    const testContent = '{"name": "test", "values": [1, 2, 3]}';
    
    // Input test data and wait for save
    const inputElement = page.locator('[data-role="input"]');
    await inputElement.fill(testContent);
    await page.waitForTimeout(3000);
    
    // Verify session was saved
    const sessionExists = await page.evaluate(() => {
      return localStorage.getItem('codekit-session') !== null;
    });
    expect(sessionExists).toBe(true);
    
    // Reload page
    await page.reload();
    await page.waitForSelector('[data-role="input"]', { timeout: 10000 });
    
    // Verify content was restored
    const restoredContent = await inputElement.inputValue();
    expect(restoredContent).toBe(testContent);
  });

  test('should handle moderate sized data', async ({ page }) => {
    // Create moderate JSON object (approximately 50KB)
    const moderateArray = Array(250).fill(0).map((_, i) => ({
      id: i,
      name: `Item ${i}`,
      description: `This is a description for item number ${i}`,
      tags: [`tag-${i}`, `category-${Math.floor(i / 50)}`, 'test-dataset']
    }));
    
    const moderateContent = JSON.stringify(moderateArray, null, 2);
    
    // Input data
    const inputElement = page.locator('[data-role="input"]');
    await inputElement.fill(moderateContent);
    await page.waitForTimeout(3000);
    
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
    expect(restoredContent).toContain('"name": "Item 249"');
  });

  test('should clear session data', async ({ page }) => {
    const testContent = '{"test": "data"}';
    
    // Input test data and wait for save
    const inputElement = page.locator('[data-role="input"]');
    await inputElement.fill(testContent);
    await page.waitForTimeout(3000);
    
    // Verify session exists
    const sessionExists = await page.evaluate(() => {
      return localStorage.getItem('codekit-session') !== null;
    });
    expect(sessionExists).toBe(true);
    
    // Clear session manually
    await page.evaluate(() => {
      localStorage.removeItem('codekit-session');
    });
    
    // Verify session was cleared
    const sessionData = await page.evaluate(() => {
      return localStorage.getItem('codekit-session');
    });
    
    expect(sessionData).toBeNull();
  });

  test('should auto-save on input changes', async ({ page }) => {
    const testContent = 'Hello, World! This is a test.';
    
    // Input text
    const inputElement = page.locator('[data-role="input"]');
    await inputElement.fill(testContent);
    
    // Wait for auto-save (should happen within 3 seconds)
    await page.waitForTimeout(3500);
    
    // Verify session was saved
    const sessionContent = await page.evaluate(() => {
      const stored = localStorage.getItem('codekit-session');
      if (!stored) return null;
      try {
        const decoded = decodeURIComponent(atob(stored));
        const sessionData = JSON.parse(decoded);
        return sessionData.content;
      } catch (error) {
        return null;
      }
    });
    
    expect(sessionContent).toBe(testContent);
  });

  test('should handle JSON format detection', async ({ page }) => {
    const jsonContent = '{"format": "json", "valid": true, "array": [1, 2, 3]}';
    
    // Input JSON
    const inputElement = page.locator('[data-role="input"]');
    await inputElement.fill(jsonContent);
    await page.waitForTimeout(3000);
    
    // Check if format was detected correctly in session
    const sessionFormat = await page.evaluate(() => {
      const stored = localStorage.getItem('codekit-session');
      if (!stored) return null;
      try {
        const decoded = decodeURIComponent(atob(stored));
        const sessionData = JSON.parse(decoded);
        return sessionData.format;
      } catch (error) {
        return null;
      }
    });
    
    expect(sessionFormat).toBe('json');
  });

  test('should handle CSV format detection', async ({ page }) => {
    const csvContent = `name,age,city
John,30,New York
Jane,25,Los Angeles
Bob,35,Chicago`;
    
    // Input CSV
    const inputElement = page.locator('[data-role="input"]');
    await inputElement.fill(csvContent);
    await page.waitForTimeout(3000);
    
    // Check if format was detected correctly in session
    const sessionFormat = await page.evaluate(() => {
      const stored = localStorage.getItem('codekit-session');
      if (!stored) return null;
      try {
        const decoded = decodeURIComponent(atob(stored));
        const sessionData = JSON.parse(decoded);
        return sessionData.format;
      } catch (error) {
        return null;
      }
    });
    
    expect(sessionFormat).toBe('csv');
  });

  test('should maintain session across browser tabs', async ({ page, context }) => {
    const testContent = '{"cross_tab": "test", "data": "shared"}';
    
    // Input data in first tab
    const inputElement = page.locator('[data-role="input"]');
    await inputElement.fill(testContent);
    await page.waitForTimeout(3000);
    
    // Open new tab
    const newPage = await context.newPage();
    await newPage.goto('http://localhost:5174');
    await newPage.waitForSelector('[data-role="input"]', { timeout: 10000 });
    
    // Check if session data exists in new tab
    const sessionInNewTab = await newPage.evaluate(() => {
      const stored = localStorage.getItem('codekit-session');
      if (!stored) return null;
      try {
        const decoded = decodeURIComponent(atob(stored));
        const sessionData = JSON.parse(decoded);
        return sessionData.content;
      } catch (error) {
        return null;
      }
    });
    
    expect(sessionInNewTab).toBe(testContent);
    
    await newPage.close();
  });

  test('should handle performance under normal load', async ({ page }) => {
    const startTime = Date.now();
    
    // Create normal-sized content
    const normalContent = JSON.stringify({
      data: Array(100).fill(0).map((_, i) => ({ id: i, value: `item-${i}` }))
    });
    
    // Input and save
    const inputElement = page.locator('[data-role="input"]');
    await inputElement.fill(normalContent);
    await page.waitForTimeout(1500);
    
    const saveTime = Date.now() - startTime;
    expect(saveTime).toBeLessThan(5000); // Should complete within 5 seconds
    
    // Reload and restore
    const reloadStart = Date.now();
    await page.reload();
    await page.waitForSelector('[data-role="input"]', { timeout: 10000 });
    
    const restoreTime = Date.now() - reloadStart;
    expect(restoreTime).toBeLessThan(3000); // Should restore within 3 seconds
    
    // Verify content was restored correctly
    const restoredContent = await inputElement.inputValue();
    expect(restoredContent.length).toBeGreaterThan(1000);
    expect(restoredContent).toContain('"id": 0');
    expect(restoredContent).toContain('"id": 99');
  });
});