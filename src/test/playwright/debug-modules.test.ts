import { test, expect } from '@playwright/test';

/**
 * Debug test to identify what's wrong with module imports
 */
test.describe('Debug Module Loading', () => {
  test('should show module import errors', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const debugResult = await page.evaluate(async () => {
      const results = [];
      
      // Test each module individually
      const modules = [
        '/src/core/formatters/index.ts',
        '/src/core/formatters/FormatRegistry.ts',
        '/src/core/formatters/FormatDetector.ts',
        '/src/core/formatters/JsonParser.ts',
        '/src/core/formatters/CsvParser.ts',
        '/src/core/formatters/XmlParser.ts'
      ];

      for (const modulePath of modules) {
        try {
          const module = await import(modulePath);
          results.push({ module: modulePath, success: true, exports: Object.keys(module) });
        } catch (error) {
          results.push({ module: modulePath, success: false, error: error.message, stack: error.stack });
        }
      }

      return results;
    });

    // Print results to console for debugging
    console.log('Module import results:');
    debugResult.forEach(result => {
      if (result.success) {
        console.log(`✓ ${result.module}: ${result.exports.join(', ')}`);
      } else {
        console.log(`✗ ${result.module}: ${result.error}`);
        if (result.stack) {
          console.log(`  Stack: ${result.stack.split('\n')[0]}`);
        }
      }
    });

    // Find the first failing module
    const firstFailure = debugResult.find(r => !r.success);
    if (firstFailure) {
      console.log(`First failure: ${firstFailure.module} - ${firstFailure.error}`);
    }

    // At least show us what happened
    expect(debugResult.length).toBeGreaterThan(0);
  });
});