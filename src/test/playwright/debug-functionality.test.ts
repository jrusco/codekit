import { test, expect } from '@playwright/test';

/**
 * Debug test to identify what's wrong with functionality
 */
test.describe('Debug Functionality', () => {
  test('should show initialization errors', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const debugResult = await page.evaluate(async () => {
      try {
        // Import the core modules
        const indexModule = await import('/src/core/formatters/index.ts');
        
        console.log('Index module imported successfully');
        console.log('Available exports:', Object.keys(indexModule));
        
        // Try to initialize
        console.log('Attempting to initialize formatters...');
        indexModule.initializeFormatters();
        console.log('Initialization completed');
        
        // Try to get stats
        console.log('Getting formatter stats...');
        const stats = indexModule.getFormatterStats();
        console.log('Stats retrieved:', stats);
        
        return {
          success: true,
          stats,
          message: 'All operations completed successfully'
        };
      } catch (error) {
        console.error('Error occurred:', error.message);
        console.error('Stack:', error.stack);
        return { 
          success: false, 
          error: error.message, 
          stack: error.stack
        };
      }
    });

    // Print the result
    console.log('Debug result:', debugResult);

    // The test should tell us what went wrong
    if (!debugResult.success) {
      console.log(`Initialization failed: ${debugResult.error}`);
      console.log(`Stack trace: ${debugResult.stack}`);
    }

    // We expect it to work, but if not, at least we'll see why
    expect(debugResult).toBeDefined();
  });

  test('should test individual parser creation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const parserResult = await page.evaluate(async () => {
      try {
        // Import parsers individually
        const jsonModule = await import('/src/core/formatters/JsonParser.ts');
        const csvModule = await import('/src/core/formatters/CsvParser.ts');
        const xmlModule = await import('/src/core/formatters/XmlParser.ts');
        
        console.log('Creating JSON parser...');
        const jsonParser = new jsonModule.JsonParser();
        console.log('JSON parser created');
        
        console.log('Creating CSV parser...');
        const csvParser = new csvModule.CsvParser();
        console.log('CSV parser created');
        
        console.log('Creating XML parser...');
        const xmlParser = new xmlModule.XmlParser();
        console.log('XML parser created');
        
        return {
          success: true,
          jsonParser: !!jsonParser,
          csvParser: !!csvParser,
          xmlParser: !!xmlParser
        };
      } catch (error) {
        console.error('Parser creation error:', error.message);
        console.error('Stack:', error.stack);
        return { 
          success: false, 
          error: error.message, 
          stack: error.stack
        };
      }
    });

    console.log('Parser creation result:', parserResult);
    expect(parserResult).toBeDefined();
  });
});