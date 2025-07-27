// Debug Session Management - Simple test to identify issues
import { test, expect } from '@playwright/test';

test.describe('Session Debug', () => {
  test('debug session management initialization', async ({ page }) => {
    // Listen to console logs to see what's happening
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      consoleLogs.push(`${msg.type()}: ${msg.text()}`);
    });

    // Listen to page errors
    const pageErrors: string[] = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });

    await page.goto('http://localhost:5174');
    
    // Wait for application to be ready
    await page.waitForSelector('[data-role="input"]', { timeout: 10000 });
    
    // Check if the main application is loaded
    const appExists = await page.evaluate(() => {
      return !!document.querySelector('[data-role="input"]');
    });
    expect(appExists).toBe(true);
    
    // Check if session management modules are available
    const sessionModulesStatus = await page.evaluate(() => {
      const status = {
        parseManager: typeof (window as any).parseManager !== 'undefined',
        sessionManager: typeof (window as any).sessionManager !== 'undefined',
        codeKitApp: typeof (window as any).codeKitApp !== 'undefined'
      };
      return status;
    });
    
    console.log('Session modules status:', sessionModulesStatus);
    console.log('Console logs:', consoleLogs);
    console.log('Page errors:', pageErrors);
    
    // Try to input some data and see what happens
    const inputElement = page.locator('[data-role="input"]');
    await inputElement.fill('{"debug": "test"}');
    
    // Wait and check immediate localStorage state
    await page.waitForTimeout(100);
    const immediateStorage = await page.evaluate(() => {
      return {
        sessionExists: localStorage.getItem('codekit-session') !== null,
        preferencesExists: localStorage.getItem('codekit-preferences') !== null,
        allKeys: Object.keys(localStorage)
      };
    });
    
    console.log('Immediate storage state:', immediateStorage);
    
    // Wait longer for auto-save
    await page.waitForTimeout(3000);
    
    const delayedStorage = await page.evaluate(() => {
      return {
        sessionExists: localStorage.getItem('codekit-session') !== null,
        sessionData: localStorage.getItem('codekit-session'),
        preferencesExists: localStorage.getItem('codekit-preferences') !== null,
        allKeys: Object.keys(localStorage)
      };
    });
    
    console.log('Delayed storage state:', delayedStorage);
    console.log('Final console logs:', consoleLogs);
    console.log('Final page errors:', pageErrors);
    
    // The test passes regardless - this is just for debugging
    expect(true).toBe(true);
  });
});