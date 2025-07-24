import { test, expect } from '@playwright/test';

/**
 * Debug test to see what's in the registry
 */
test.describe('Debug Registry State', () => {
  test('should show registry contents', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const registryState = await page.evaluate(async () => {
      try {
        const registryModule = await import('/src/core/formatters/FormatRegistry.ts');
        
        console.log('Registry module loaded');
        
        const registeredFormats = registryModule.formatRegistry.getRegisteredFormats();
        const stats = registryModule.formatRegistry.getStats();
        
        console.log('Registered formats:', registeredFormats);
        console.log('Registry stats:', stats);
        
        return {
          success: true,
          registeredFormats,
          stats,
          hasFormatRegistry: !!registryModule.formatRegistry,
          formatRegistryMethods: Object.getOwnPropertyNames(Object.getPrototypeOf(registryModule.formatRegistry))
        };
      } catch (error) {
        console.error('Registry debug error:', error.message);
        console.error('Stack:', error.stack);
        return { 
          success: false, 
          error: error.message, 
          stack: error.stack
        };
      }
    });

    console.log('Registry state result:', registryState);
    
    expect(registryState.success).toBe(true);
  });

  test('should show individual parser lookup', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const parserLookup = await page.evaluate(async () => {
      try {
        const registryModule = await import('/src/core/formatters/FormatRegistry.ts');
        
        const jsonParser = registryModule.formatRegistry.getParserByName('JSON');
        const csvParser = registryModule.formatRegistry.getParserByName('CSV');
        const xmlParser = registryModule.formatRegistry.getParserByName('XML');
        
        console.log('JSON parser:', jsonParser);
        console.log('CSV parser:', csvParser);
        console.log('XML parser:', xmlParser);
        
        return {
          success: true,
          jsonParser: !!jsonParser,
          csvParser: !!csvParser,
          xmlParser: !!xmlParser,
          jsonParserName: jsonParser?.name,
          csvParserName: csvParser?.name,
          xmlParserName: xmlParser?.name
        };
      } catch (error) {
        console.error('Parser lookup error:', error.message);
        return { 
          success: false, 
          error: error.message
        };
      }
    });

    console.log('Parser lookup result:', parserLookup);
    expect(parserLookup.success).toBe(true);
  });
});