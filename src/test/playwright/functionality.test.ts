import { test, expect } from '@playwright/test';

/**
 * Functional tests to verify the app's core features work
 */
test.describe('Core Functionality Tests', () => {
  test('should initialize format parsers correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const formatTest = await page.evaluate(async () => {
      try {
        // Import the core modules
        const [indexModule, registryModule] = await Promise.all([
          import('/src/core/formatters/index.ts'),
          import('/src/core/formatters/FormatRegistry.ts')
        ]);

        // Get stats (formatters should already be initialized by main.ts)
        const stats = indexModule.getFormatterStats();
        const registeredFormats = registryModule.formatRegistry.getRegisteredFormats();

        return {
          success: true,
          stats,
          registeredFormats,
          hasJsonParser: registeredFormats.includes('json'),
          hasCsvParser: registeredFormats.includes('csv'),
          hasXmlParser: registeredFormats.includes('xml')
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    expect(formatTest.success).toBe(true);
    expect(formatTest.hasJsonParser).toBe(true);
    expect(formatTest.hasCsvParser).toBe(true);
    expect(formatTest.hasXmlParser).toBe(true);
    expect(formatTest.stats.registry.registeredParsers).toBeGreaterThan(0);
  });

  test('should detect and parse JSON correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const jsonTest = await page.evaluate(async () => {
      try {
        const [detectorModule, registryModule] = await Promise.all([
          import('/src/core/formatters/FormatDetector.ts'),
          import('/src/core/formatters/FormatRegistry.ts')
        ]);

        const jsonContent = '{"name": "test", "value": 42}';
        
        // Test detection
        const detection = detectorModule.formatDetector.detect(jsonContent);
        
        // Test parsing
        const parseResult = registryModule.formatRegistry.parse(jsonContent);

        return {
          success: true,
          detection: {
            format: detection.format,
            confidence: detection.confidence
          },
          parseResult: {
            isValid: parseResult.isValid,
            data: parseResult.data,
            errorCount: parseResult.errors.length
          }
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    expect(jsonTest.success).toBe(true);
    expect(jsonTest.detection.format).toBe('json');
    expect(jsonTest.detection.confidence).toBeGreaterThan(50);
    expect(jsonTest.parseResult.isValid).toBe(true);
    expect(jsonTest.parseResult.data.name).toBe('test');
    expect(jsonTest.parseResult.data.value).toBe(42);
    expect(jsonTest.parseResult.errorCount).toBe(0);
  });

  test('should detect and parse CSV correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const csvTest = await page.evaluate(async () => {
      try {
        const [detectorModule, registryModule] = await Promise.all([
          import('/src/core/formatters/FormatDetector.ts'),
          import('/src/core/formatters/FormatRegistry.ts')
        ]);

        const csvContent = 'name,age,city\nJohn,30,NYC\nJane,25,LA';
        
        // Test detection
        const detection = detectorModule.formatDetector.detect(csvContent);
        
        // Test parsing
        const parseResult = registryModule.formatRegistry.parse(csvContent);

        return {
          success: true,
          detection: {
            format: detection.format,
            confidence: detection.confidence
          },
          parseResult: {
            isValid: parseResult.isValid,
            hasData: !!parseResult.data,
            errorCount: parseResult.errors.length
          }
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    expect(csvTest.success).toBe(true);
    expect(csvTest.detection.format).toBe('csv');
    expect(csvTest.detection.confidence).toBeGreaterThan(50);
    expect(csvTest.parseResult.isValid).toBe(true);
    expect(csvTest.parseResult.hasData).toBe(true);
    expect(csvTest.parseResult.errorCount).toBe(0);
  });

  test('should detect and parse XML correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const xmlTest = await page.evaluate(async () => {
      try {
        const [detectorModule, registryModule] = await Promise.all([
          import('/src/core/formatters/FormatDetector.ts'),
          import('/src/core/formatters/FormatRegistry.ts')
        ]);

        const xmlContent = '<?xml version="1.0"?><root><item>test</item></root>';
        
        // Test detection
        const detection = detectorModule.formatDetector.detect(xmlContent);
        
        // Test parsing
        const parseResult = registryModule.formatRegistry.parse(xmlContent);

        return {
          success: true,
          detection: {
            format: detection.format,
            confidence: detection.confidence
          },
          parseResult: {
            isValid: parseResult.isValid,
            hasData: !!parseResult.data,
            errorCount: parseResult.errors.length
          }
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    expect(xmlTest.success).toBe(true);
    expect(xmlTest.detection.format).toBe('xml');
    expect(xmlTest.detection.confidence).toBeGreaterThan(50);
    expect(xmlTest.parseResult.isValid).toBe(true);
    expect(xmlTest.parseResult.hasData).toBe(true);
    expect(xmlTest.parseResult.errorCount).toBe(0);
  });

  test('should handle UI components without errors', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const uiTest = await page.evaluate(async () => {
      try {
        // Test that we can import UI components
        const [baseComponent, statusBar, splitPanel] = await Promise.all([
          import('/src/ui/components/BaseComponent.ts'),
          import('/src/ui/components/StatusBar.ts'),
          import('/src/ui/layout/SplitPanel.ts')
        ]);

        return {
          success: true,
          hasBaseComponent: !!baseComponent.BaseComponent,
          hasStatusBar: !!statusBar.StatusBar,
          hasSplitPanel: !!splitPanel.SplitPanel
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    expect(uiTest.success).toBe(true);
    expect(uiTest.hasBaseComponent).toBe(true);
    expect(uiTest.hasStatusBar).toBe(true);
    expect(uiTest.hasSplitPanel).toBe(true);
  });
});