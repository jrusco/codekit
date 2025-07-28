import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('WCAG 2.1 AA Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should not have any accessibility violations on main page', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should be accessible when loading JSON content', async ({ page }) => {
    // Load JSON content
    const jsonContent = '{"name": "John", "age": 30, "city": "New York"}';
    await page.locator('#input-textarea').fill(jsonContent);
    
    // Wait for processing
    await page.waitForTimeout(500);
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should be accessible when displaying validation errors', async ({ page }) => {
    // Load invalid JSON to trigger errors
    const invalidJson = '{"name": "John", "age": 30,}'; // trailing comma
    await page.locator('#input-textarea').fill(invalidJson);
    
    // Wait for validation
    await page.waitForTimeout(500);
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should be accessible when switching between formats', async ({ page }) => {
    // Test CSV content
    const csvContent = 'name,age,city\nJohn,30,NYC\nJane,25,LA';
    await page.locator('#input-textarea').fill(csvContent);
    await page.waitForTimeout(500);
    
    let accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);

    // Test XML content
    const xmlContent = '<?xml version="1.0"?><root><item>test</item></root>';
    await page.locator('#input-textarea').fill(xmlContent);
    await page.waitForTimeout(500);
    
    accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper focus management', async ({ page }) => {
    // Test tab navigation
    await page.keyboard.press('Tab');
    
    // Check that focus is visible and on a focusable element
    const focusedElement = await page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Continue tabbing through interactive elements
    await page.keyboard.press('Tab');
    const secondFocusedElement = await page.locator(':focus');
    await expect(secondFocusedElement).toBeVisible();
    
    // Run accessibility scan with focus elements
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .include('*:focus')
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper ARIA labels and roles', async ({ page }) => {
    // Check for essential ARIA attributes
    const inputArea = page.locator('#input-textarea');
    await expect(inputArea).toHaveAttribute('aria-label');
    
    // Scan specifically for ARIA compliance
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['aria-allowed-attr', 'aria-required-attr', 'aria-roles', 'aria-valid-attr'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have sufficient color contrast', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['heading-order', 'page-has-heading-one'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have alternative text for images', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['image-alt'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should be accessible via keyboard only', async ({ page }) => {
    // Test keyboard navigation through main interface
    await page.keyboard.press('Tab'); // Focus first element
    await page.keyboard.press('Enter'); // Activate if applicable
    
    // Test with text input
    await page.locator('#input-textarea').focus();
    await page.keyboard.type('{"test": true}');
    
    // Test keyboard shortcuts if any
    await page.keyboard.press('Control+a'); // Select all
    await page.keyboard.press('Delete'); // Clear
    
    // Verify no accessibility violations after keyboard interaction
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should work with screen reader simulation', async ({ page }) => {
    // Test that essential elements have proper semantic markup
    const main = page.locator('main');
    await expect(main).toBeVisible();
    
    // Check for landmarks
    const landmarks = await page.locator('[role="main"], [role="banner"], [role="contentinfo"], main, header, footer').count();
    expect(landmarks).toBeGreaterThan(0);
    
    // Run accessibility scan focused on screen reader compatibility
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['landmark-one-main', 'region', 'bypass'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should handle high contrast mode', async ({ page }) => {
    // Simulate high contrast by checking CSS custom properties
    await page.addStyleTag({
      content: `
        @media (prefers-contrast: high) {
          * {
            background: white !important;
            color: black !important;
          }
        }
      `
    });
    
    // Test content with high contrast simulation
    const jsonContent = '{"accessible": true}';
    await page.locator('#input-textarea').fill(jsonContent);
    await page.waitForTimeout(500);
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should be accessible on mobile viewports', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Test content input on mobile
    const csvContent = 'name,age\nJohn,30';
    await page.locator('#input-textarea').fill(csvContent);
    await page.waitForTimeout(500);
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should maintain accessibility during error states', async ({ page }) => {
    // Create an error state with malformed content
    const malformedContent = '{invalid json content}';
    await page.locator('#input-textarea').fill(malformedContent);
    await page.waitForTimeout(500);
    
    // Verify error messages are accessible
    const errorElements = page.locator('[role="alert"], .error, [aria-live]');
    const errorCount = await errorElements.count();
    
    if (errorCount > 0) {
      // Check that error messages have proper ARIA attributes
      const firstError = errorElements.first();
      const hasAriaLabel = await firstError.getAttribute('aria-label');
      const hasRole = await firstError.getAttribute('role');
      
      expect(hasAriaLabel || hasRole).toBeTruthy();
    }
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should support reduced motion preferences', async ({ page }) => {
    // Simulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    // Test with content that might trigger animations
    const largeJsonContent = JSON.stringify({
      data: Array(50).fill(0).map((_, i) => ({ id: i, value: `item${i}` }))
    });
    
    await page.locator('#input-textarea').fill(largeJsonContent);
    await page.waitForTimeout(1000);
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});