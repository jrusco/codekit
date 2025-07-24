import { test, expect } from '@playwright/test';

test.describe('FormatRegistry - Comprehensive Testing', () => {
  let FormatRegistry: any;
  let JsonParser: any;
  let mockParser: any;

  test.beforeAll(async ({ page }) => {
    await page.goto('/');
    
    // Import the classes we need
    const modules = await page.evaluate(() => {
      return Promise.all([
        import('/src/core/formatters/FormatRegistry.ts'),
        import('/src/core/formatters/JsonParser.ts')
      ]).then(([registryModule, parserModule]) => ({
        FormatRegistry: registryModule.FormatRegistry,
        JsonParser: parserModule.JsonParser
      }));
    });

    FormatRegistry = modules.FormatRegistry;
    JsonParser = modules.JsonParser;
  });

  test.beforeEach(async ({ page }) => {
    // Create a fresh registry for each test
    await page.evaluate(() => {
      (window as any).testRegistry = new (window as any).FormatRegistry();
    });

    // Create a mock parser for testing
    mockParser = await page.evaluate(() => {
      return {
        name: 'TestFormat',
        extensions: ['test', 'tst'],
        mimeTypes: ['application/test', 'text/test'],
        detect: (content: string) => ({
          format: content.includes('test') ? 'testformat' : 'unknown',
          confidence: content.includes('test') ? 80 : 0,
          evidence: content.includes('test') ? ['Contains test keyword'] : ['No test keyword']
        }),
        parse: (content: string) => ({
          isValid: content.includes('test'),
          data: content.includes('test') ? { content } : null,
          errors: content.includes('test') ? [] : [{ message: 'Invalid test format', code: 'INVALID', severity: 'error' }],
          metadata: { parseTime: 1, fileSize: content.length, format: 'testformat', confidence: 80 }
        }),
        validate: (content: string) => content.includes('test') ? [] : [{ message: 'Missing test keyword', code: 'MISSING_TEST', severity: 'error' }]
      };
    });
  });

  test.describe('Parser Registration Tests', () => {
    test('should register a parser successfully', async ({ page }) => {
      const result = await page.evaluate((mockParser) => {
        const registry = (window as any).testRegistry;
        registry.register(mockParser);
        return {
          registeredFormats: registry.getRegisteredFormats(),
          stats: registry.getStats()
        };
      }, mockParser);

      expect(result.registeredFormats).toContain('testformat');
      expect(result.stats.registeredParsers).toBe(1);
      expect(result.stats.supportedExtensions).toBe(2);
      expect(result.stats.supportedMimeTypes).toBe(2);
    });

    test('should prevent duplicate parser registration', async ({ page }) => {
      const error = await page.evaluate((mockParser) => {
        const registry = (window as any).testRegistry;
        registry.register(mockParser);
        
        try {
          registry.register(mockParser); // Second registration should fail
          return null;
        } catch (e) {
          return e.message;
        }
      }, mockParser);

      expect(error).toContain('already registered');
    });

    test('should register multiple different parsers', async ({ page }) => {
      const result = await page.evaluate((mockParser) => {
        const registry = (window as any).testRegistry;
        const JsonParser = (window as any).JsonParser;
        
        registry.register(mockParser);
        registry.register(new JsonParser());
        
        return {
          formats: registry.getRegisteredFormats(),
          stats: registry.getStats()
        };
      }, mockParser);

      expect(result.formats).toHaveLength(2);
      expect(result.formats).toContain('testformat');
      expect(result.formats).toContain('json');
    });

    test('should unregister parsers correctly', async ({ page }) => {
      const result = await page.evaluate((mockParser) => {
        const registry = (window as any).testRegistry;
        
        registry.register(mockParser);
        const beforeUnregister = registry.getRegisteredFormats();
        
        const unregistered = registry.unregister('TestFormat');
        const afterUnregister = registry.getRegisteredFormats();
        
        return {
          beforeUnregister,
          afterUnregister,
          unregistered,
          stats: registry.getStats()
        };
      }, mockParser);

      expect(result.beforeUnregister).toContain('testformat');
      expect(result.afterUnregister).not.toContain('testformat');
      expect(result.unregistered).toBe(true);
      expect(result.stats.registeredParsers).toBe(0);
    });

    test('should handle unregistering non-existent parser', async ({ page }) => {
      const result = await page.evaluate(() => {
        const registry = (window as any).testRegistry;
        return registry.unregister('NonExistentFormat');
      });

      expect(result).toBe(false);
    });
  });

  test.describe('Parser Lookup Tests', () => {
    test('should find parser by format name', async ({ page }) => {
      const result = await page.evaluate((mockParser) => {
        const registry = (window as any).testRegistry;
        registry.register(mockParser);
        
        const parser = registry.getParser('TestFormat');
        return parser ? parser.name : null;
      }, mockParser);

      expect(result).toBe('TestFormat');
    });

    test('should find parser by extension', async ({ page }) => {
      const result = await page.evaluate((mockParser) => {
        const registry = (window as any).testRegistry;
        registry.register(mockParser);
        
        const parser = registry.getParserByExtension('test');
        return parser ? parser.name : null;
      }, mockParser);

      expect(result).toBe('TestFormat');
    });

    test('should find parser by MIME type', async ({ page }) => {
      const result = await page.evaluate((mockParser) => {
        const registry = (window as any).testRegistry;
        registry.register(mockParser);
        
        const parser = registry.getParserByMimeType('application/test');
        return parser ? parser.name : null;
      }, mockParser);

      expect(result).toBe('TestFormat');
    });

    test('should handle case-insensitive lookups', async ({ page }) => {
      const result = await page.evaluate((mockParser) => {
        const registry = (window as any).testRegistry;
        registry.register(mockParser);
        
        return {
          formatLookup: registry.getParser('testformat') ? 'found' : 'not found',
          extensionLookup: registry.getParserByExtension('TEST') ? 'found' : 'not found',
          mimeLookup: registry.getParserByMimeType('APPLICATION/TEST') ? 'found' : 'not found'
        };
      }, mockParser);

      expect(result.formatLookup).toBe('found');
      expect(result.extensionLookup).toBe('found');
      expect(result.mimeLookup).toBe('found');
    });

    test('should return null for non-existent lookups', async ({ page }) => {
      const result = await page.evaluate(() => {
        const registry = (window as any).testRegistry;
        
        return {
          format: registry.getParser('nonexistent'),
          extension: registry.getParserByExtension('xyz'),
          mime: registry.getParserByMimeType('application/nonexistent')
        };
      });

      expect(result.format).toBeNull();
      expect(result.extension).toBeNull();
      expect(result.mime).toBeNull();
    });
  });

  test.describe('Format Detection Tests', () => {
    test('should detect format with content analysis only', async ({ page }) => {
      const result = await page.evaluate((mockParser) => {
        const registry = (window as any).testRegistry;
        registry.register(mockParser);
        
        return registry.detectFormat('this is test content');
      }, mockParser);

      expect(result.format).toBe('testformat');
      expect(result.confidence).toBe(80);
      expect(result.evidence).toContain('Contains test keyword');
    });

    test('should boost confidence with filename hint', async ({ page }) => {
      const result = await page.evaluate((mockParser) => {
        const registry = (window as any).testRegistry;
        registry.register(mockParser);
        
        return registry.detectFormat('this is test content', 'myfile.test');
      }, mockParser);

      expect(result.format).toBe('testformat');
      expect(result.confidence).toBe(100); // 80 + 20 bonus
      expect(result.evidence.some(e => e.includes('Filename suggests'))).toBe(true);
    });

    test('should boost confidence with MIME type hint', async ({ page }) => {
      const result = await page.evaluate((mockParser) => {
        const registry = (window as any).testRegistry;
        registry.register(mockParser);
        
        return registry.detectFormat('this is test content', undefined, 'application/test');
      }, mockParser);

      expect(result.format).toBe('testformat');
      expect(result.confidence).toBe(95); // 80 + 15 bonus
      expect(result.evidence.some(e => e.includes('MIME type suggests'))).toBe(true);
    });

    test('should combine multiple hints effectively', async ({ page }) => {
      const result = await page.evaluate((mockParser) => {
        const registry = (window as any).testRegistry;
        registry.register(mockParser);
        
        return registry.detectFormat('this is test content', 'file.test', 'application/test');
      }, mockParser);

      expect(result.format).toBe('testformat');
      expect(result.confidence).toBeGreaterThan(90);
    });

    test('should handle unknown format gracefully', async ({ page }) => {
      const result = await page.evaluate(() => {
        const registry = (window as any).testRegistry;
        return registry.detectFormat('unknown content format');
      });

      expect(result.format).toBe('unknown');
      expect(result.confidence).toBe(0);
      expect(result.evidence).toContain('No format detected by any parser');
    });

    test('should prefer higher confidence detections', async ({ page }) => {
      const result = await page.evaluate((mockParser) => {
        const registry = (window as any).testRegistry;
        const JsonParser = (window as any).JsonParser;
        
        registry.register(mockParser);
        registry.register(new JsonParser());
        
        // JSON should win with higher confidence
        return registry.detectFormat('{"test": "value"}');
      }, mockParser);

      expect(result.format).toBe('json');
      expect(result.confidence).toBeGreaterThan(80);
    });
  });

  test.describe('Parsing Tests', () => {
    test('should parse with explicit format specification', async ({ page }) => {
      const result = await page.evaluate((mockParser) => {
        const registry = (window as any).testRegistry;
        registry.register(mockParser);
        
        return registry.parse('this is test content', { format: 'TestFormat' });
      }, mockParser);

      expect(result.isValid).toBe(true);
      expect(result.data.content).toBe('this is test content');
      expect(result.errors).toHaveLength(0);
    });

    test('should parse with auto-detection', async ({ page }) => {
      const result = await page.evaluate((mockParser) => {
        const registry = (window as any).testRegistry;
        registry.register(mockParser);
        
        return registry.parse('this is test content');
      }, mockParser);

      expect(result.isValid).toBe(true);
      expect(result.data.content).toBe('this is test content');
    });

    test('should handle unknown format error', async ({ page }) => {
      const result = await page.evaluate(() => {
        const registry = (window as any).testRegistry;
        return registry.parse('content', { format: 'UnknownFormat' });
      });

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('UNKNOWN_FORMAT');
      expect(result.errors[0].message).toContain('Unknown format: UnknownFormat');
    });

    test('should handle format detection failure', async ({ page }) => {
      const result = await page.evaluate(() => {
        const registry = (window as any).testRegistry;
        return registry.parse('undetectable content');
      });

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('FORMAT_DETECTION_FAILED');
    });

    test('should use filename and MIME type hints in parsing', async ({ page }) => {
      const result = await page.evaluate((mockParser) => {
        const registry = (window as any).testRegistry;
        registry.register(mockParser);
        
        return registry.parse('this is test content', { 
          filename: 'myfile.test',
          mimeType: 'application/test'
        });
      }, mockParser);

      expect(result.isValid).toBe(true);
      expect(result.data.content).toBe('this is test content');
    });
  });

  test.describe('Validation Tests', () => {
    test('should validate with explicit format', async ({ page }) => {
      const result = await page.evaluate((mockParser) => {
        const registry = (window as any).testRegistry;
        registry.register(mockParser);
        
        return registry.validate('this is test content', { format: 'TestFormat' });
      }, mockParser);

      expect(result).toHaveLength(0);
    });

    test('should validate with auto-detection', async ({ page }) => {
      const result = await page.evaluate((mockParser) => {
        const registry = (window as any).testRegistry;
        registry.register(mockParser);
        
        return registry.validate('this is test content');
      }, mockParser);

      expect(result).toHaveLength(0);
    });

    test('should return validation errors for invalid content', async ({ page }) => {
      const result = await page.evaluate((mockParser) => {
        const registry = (window as any).testRegistry;
        registry.register(mockParser);
        
        return registry.validate('invalid content without test keyword');
      }, mockParser);

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('MISSING_TEST');
    });

    test('should handle validation when format cannot be detected', async ({ page }) => {
      const result = await page.evaluate(() => {
        const registry = (window as any).testRegistry;
        return registry.validate('undetectable content');
      });

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('VALIDATION_UNAVAILABLE');
    });
  });

  test.describe('Registry Management Tests', () => {
    test('should clear all parsers', async ({ page }) => {
      const result = await page.evaluate((mockParser) => {
        const registry = (window as any).testRegistry;
        const JsonParser = (window as any).JsonParser;
        
        registry.register(mockParser);
        registry.register(new JsonParser());
        
        const beforeClear = registry.getStats();
        registry.clear();
        const afterClear = registry.getStats();
        
        return { beforeClear, afterClear };
      }, mockParser);

      expect(result.beforeClear.registeredParsers).toBe(2);
      expect(result.afterClear.registeredParsers).toBe(0);
      expect(result.afterClear.supportedExtensions).toBe(0);
      expect(result.afterClear.supportedMimeTypes).toBe(0);
    });

    test('should get all parsers', async ({ page }) => {
      const result = await page.evaluate((mockParser) => {
        const registry = (window as any).testRegistry;
        const JsonParser = (window as any).JsonParser;
        
        registry.register(mockParser);
        registry.register(new JsonParser());
        
        const allParsers = registry.getAllParsers();
        return allParsers.map((p: any) => p.name);
      }, mockParser);

      expect(result).toHaveLength(2);
      expect(result).toContain('TestFormat');
      expect(result).toContain('JSON');
    });

    test('should provide comprehensive statistics', async ({ page }) => {
      const stats = await page.evaluate((mockParser) => {
        const registry = (window as any).testRegistry;
        const JsonParser = (window as any).JsonParser;
        
        registry.register(mockParser);
        registry.register(new JsonParser());
        
        return registry.getStats();
      }, mockParser);

      expect(stats.registeredParsers).toBe(2);
      expect(stats.supportedExtensions).toBeGreaterThan(0);
      expect(stats.supportedMimeTypes).toBeGreaterThan(0);
      expect(stats.formats).toHaveLength(2);
      expect(stats.extensions.length).toBeGreaterThan(0);
      expect(stats.mimeTypes.length).toBeGreaterThan(0);
    });
  });

  test.describe('Edge Cases and Error Handling', () => {
    test('should handle parser with empty extensions', async ({ page }) => {
      const result = await page.evaluate(() => {
        const registry = (window as any).testRegistry;
        
        const emptyExtensionParser = {
          name: 'EmptyExt',
          extensions: [],
          mimeTypes: ['application/empty'],
          detect: () => ({ format: 'unknown', confidence: 0, evidence: [] }),
          parse: () => ({ isValid: false, data: null, errors: [], metadata: {} }),
          validate: () => []
        };
        
        registry.register(emptyExtensionParser);
        
        return {
          stats: registry.getStats(),
          byExtension: registry.getParserByExtension('any'),
          byMime: registry.getParserByMimeType('application/empty')
        };
      });

      expect(result.stats.registeredParsers).toBe(1);
      expect(result.byExtension).toBeNull();
      expect(result.byMime).toBeDefined();
    });

    test('should handle filename without extension', async ({ page }) => {
      const result = await page.evaluate((mockParser) => {
        const registry = (window as any).testRegistry;
        registry.register(mockParser);
        
        return registry.detectFormat('this is test content', 'filename_without_extension');
      }, mockParser);

      expect(result.format).toBe('testformat');
      expect(result.confidence).toBe(80); // No filename bonus
    });

    test('should handle empty filename', async ({ page }) => {
      const result = await page.evaluate((mockParser) => {
        const registry = (window as any).testRegistry;
        registry.register(mockParser);
        
        return registry.detectFormat('this is test content', '');
      }, mockParser);

      expect(result.format).toBe('testformat');
      expect(result.confidence).toBe(80); // No filename bonus
    });

    test('should extract extension correctly from complex filenames', async ({ page }) => {
      const result = await page.evaluate((mockParser) => {
        const registry = (window as any).testRegistry;
        registry.register(mockParser);
        
        const testCases = [
          'file.test',
          'file.name.test',
          'path/to/file.test',
          'file.TEST', // Case handling
        ];
        
        return testCases.map(filename => ({
          filename,
          detected: registry.detectFormat('this is test content', filename).confidence > 90
        }));
      }, mockParser);

      result.forEach(testCase => {
        expect(testCase.detected).toBe(true);
      });
    });
  });
});