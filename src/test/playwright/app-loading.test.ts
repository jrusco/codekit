import { test, expect } from '@playwright/test';

/**
 * Basic app loading tests to verify the application starts correctly
 */
test.describe('App Loading Tests', () => {
  test('should load the main page without errors', async ({ page }) => {
    // Capture console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture page errors
    const pageErrors: Error[] = [];
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Navigate to the app
    await page.goto('/');

    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');

    // Check that we didn't get any critical errors
    expect(pageErrors.length).toBe(0);
    
    // Check that the page title is set
    const title = await page.title();
    expect(title).toBeTruthy();

    // Check that some basic DOM elements exist
    const body = await page.locator('body');
    expect(await body.isVisible()).toBe(true);

    // Log any console errors for debugging
    if (consoleErrors.length > 0) {
      console.log('Console errors found:', consoleErrors);
    }
  });

  test('should have basic UI structure', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for basic app structure
    const html = await page.content();
    expect(html).toContain('<html');
    expect(html).toContain('<body');
    expect(html).toContain('<head');
  });

  test('should be able to import main modules', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Try to import main modules to check if they load
    const moduleTest = await page.evaluate(async () => {
      try {
        const mainModule = await import('/src/main.ts');
        return { success: true, hasMain: !!mainModule };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    expect(moduleTest.success).toBe(true);
  });
});