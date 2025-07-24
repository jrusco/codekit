import { test, expect } from '@playwright/test';

test.describe('FormatDetector - Comprehensive Testing', () => {
  let FormatDetector: any;
  let formatRegistry: any;
  let JsonParser: any;

  test.beforeAll(async ({ page }) => {
    await page.goto('/');
    
    const modules = await page.evaluate(() => {
      return Promise.all([
        import('/src/core/formatters/FormatDetector.ts'),
        import('/src/core/formatters/FormatRegistry.ts'),
        import('/src/core/formatters/JsonParser.ts')
      ]).then(([detectorModule, registryModule, parserModule]) => ({
        FormatDetector: detectorModule.FormatDetector,
        formatRegistry: registryModule.formatRegistry,
        JsonParser: parserModule.JsonParser
      }));
    });

    FormatDetector = modules.FormatDetector;
    formatRegistry = modules.formatRegistry;
    JsonParser = modules.JsonParser;
  });

  test.beforeEach(async ({ page }) => {
    // Set up fresh detector and registry for each test
    await page.evaluate((JsonParserClass) => {
      (window as any).testDetector = new (window as any).FormatDetector();
      (window as any).testRegistry = (window as any).formatRegistry;
      
      // Clear and register JSON parser
      (window as any).testRegistry.clear();
      (window as any).testRegistry.register(new JsonParserClass());
    }, JsonParser);
  });

  test.describe('Basic Detection Tests', () => {
    test('should detect format using content analysis', async ({ page }) => {
      const result = await page.evaluate(() => {
        const detector = (window as any).testDetector;
        return detector.detect('{"name": "test", "value": 42}');
      });

      expect(result.format).toBe('json');
      expect(result.confidence).toBeGreaterThan(50);
      expect(result.evidence.length).toBeGreaterThan(0);
    });

    test('should detect format with filename hint', async ({ page }) => {
      const result = await page.evaluate(() => {
        const detector = (window as any).testDetector;
        return detector.detect('{"test": "value"}', { filename: 'data.json' });
      });

      expect(result.format).toBe('json');
      expect(result.confidence).toBeGreaterThan(50);
      expect(result.evidence.some(e => e.includes('Filename suggests'))).toBe(true);
    });

    test('should detect format with MIME type hint', async ({ page }) => {
      const result = await page.evaluate(() => {
        const detector = (window as any).testDetector;
        return detector.detect('{"test": "value"}', { mimeType: 'application/json' });
      });

      expect(result.format).toBe('json');
      expect(result.confidence).toBeGreaterThan(50);
      expect(result.evidence.some(e => e.includes('MIME type'))).toBe(true);
    });

    test('should combine multiple detection methods', async ({ page }) => {
      const result = await page.evaluate(() => {
        const detector = (window as any).testDetector;
        return detector.detect(
          '{"test": "value"}', 
          { 
            filename: 'data.json',
            mimeType: 'application/json'
          }
        );
      });

      expect(result.format).toBe('json');
      expect(result.confidence).toBeGreaterThan(80);
      expect(result.evidence.length).toBeGreaterThan(2);
    });
  });

  test.describe('Signature-Based Detection Tests', () => {
    test('should detect JSON by signature', async ({ page }) => {
      const testCases = [
        '{"key": "value"}',
        '[1, 2, 3]',
        '  {"spaced": true}  ',
        '[\n  "array",\n  "with",\n  "newlines"\n]'
      ];

      for (const testCase of testCases) {
        const result = await page.evaluate((content) => {
          const detector = (window as any).testDetector;
          return detector.detectBySignature(content);
        }, testCase);

        expect(result.format).toBe('json');
        expect(result.confidence).toBe(95);
      }
    });

    test('should detect XML by signature', async ({ page }) => {
      const testCases = [
        '<?xml version="1.0"?><root></root>',
        '<html><body></body></html>',
        '  <document>content</document>  '
      ];

      for (const testCase of testCases) {
        const result = await page.evaluate((content) => {
          const detector = (window as any).testDetector;
          return detector.detectBySignature(content);
        }, testCase);

        expect(result.format).toBe('xml');
        expect(result.confidence).toBe(95);
      }
    });

    test('should detect CSV by signature', async ({ page }) => {
      const testCases = [
        'name,age,city\nJohn,25,NYC',
        'a;b;c\n1;2;3',
        'col1,col2\nval1,val2'
      ];

      for (const testCase of testCases) {
        const result = await page.evaluate((content) => {
          const detector = (window as any).testDetector;
          return detector.detectBySignature(content);
        }, testCase);

        expect(result.format).toBe('csv');
        expect(result.confidence).toBe(95);
      }
    });

    test('should handle unknown signatures', async ({ page }) => {
      const result = await page.evaluate(() => {
        const detector = (window as any).testDetector;
        return detector.detectBySignature('this is just plain text without structure');
      });

      expect(result.format).toBe('unknown');
      expect(result.confidence).toBe(0);
    });
  });

  test.describe('Filename-Based Detection Tests', () => {
    test('should detect by common extensions', async ({ page }) => {
      const testCases = [
        { filename: 'data.json', expectedFormat: 'json' },
        { filename: 'config.JSON', expectedFormat: 'json' }, // Case insensitive
        { filename: 'path/to/file.json', expectedFormat: 'json' },
        { filename: 'file.name.json', expectedFormat: 'json' }
      ];

      for (const testCase of testCases) {
        const result = await page.evaluate((filename) => {
          const detector = (window as any).testDetector;
          return detector.detectByFilename(filename);
        }, testCase.filename);

        expect(result.format).toBe(testCase.expectedFormat);
        expect(result.confidence).toBe(70);
      }
    });

    test('should handle filenames without extensions', async ({ page }) => {
      const result = await page.evaluate(() => {
        const detector = (window as any).testDetector;
        return detector.detectByFilename('filename_without_extension');
      });

      expect(result.format).toBe('unknown');
      expect(result.confidence).toBe(0);
      expect(result.evidence).toContain('No file extension found');
    });

    test('should handle empty or null filenames', async ({ page }) => {
      const testCases = ['', null, undefined];

      for (const testCase of testCases) {
        const result = await page.evaluate((filename) => {
          const detector = (window as any).testDetector;
          return detector.detectByFilename(filename);
        }, testCase);

        expect(result.format).toBe('unknown');
        expect(result.confidence).toBe(0);
        expect(result.evidence).toContain('No filename provided');
      }
    });

    test('should handle unknown extensions', async ({ page }) => {
      const result = await page.evaluate(() => {
        const detector = (window as any).testDetector;
        return detector.detectByFilename('file.unknownext');
      });

      expect(result.format).toBe('unknown');
      expect(result.confidence).toBe(0);
      expect(result.evidence.some(e => e.includes('Unknown file extension'))).toBe(true);
    });
  });

  test.describe('MIME Type Detection Tests', () => {
    test('should detect by standard MIME types', async ({ page }) => {
      const testCases = [
        { mimeType: 'application/json', expectedFormat: 'json' },
        { mimeType: 'text/json', expectedFormat: 'json' },
        { mimeType: 'APPLICATION/JSON', expectedFormat: 'json' } // Case insensitive
      ];

      for (const testCase of testCases) {
        const result = await page.evaluate((mimeType) => {
          const detector = (window as any).testDetector;
          return detector.detectByMimeType(mimeType);
        }, testCase.mimeType);

        expect(result.format).toBe(testCase.expectedFormat);
        expect(result.confidence).toBe(80);
      }
    });

    test('should handle unknown MIME types', async ({ page }) => {
      const result = await page.evaluate(() => {
        const detector = (window as any).testDetector;
        return detector.detectByMimeType('application/unknown');
      });

      expect(result.format).toBe('unknown');
      expect(result.confidence).toBe(0);
      expect(result.evidence.some(e => e.includes('Unknown MIME type'))).toBe(true);
    });

    test('should handle empty or null MIME types', async ({ page }) => {
      const testCases = ['', null, undefined];

      for (const testCase of testCases) {
        const result = await page.evaluate((mimeType) => {
          const detector = (window as any).testDetector;
          return detector.detectByMimeType(mimeType);
        }, testCase);

        expect(result.format).toBe('unknown');
        expect(result.confidence).toBe(0);
        expect(result.evidence).toContain('No MIME type provided');
      }
    });
  });

  test.describe('Content Analysis Detection Tests', () => {
    test('should analyze content using registered parsers', async ({ page }) => {
      const result = await page.evaluate(() => {
        const detector = (window as any).testDetector;
        return detector.detectByContent('{"key": "value", "number": 42}');
      });

      expect(result.format).toBe('json');
      expect(result.confidence).toBeGreaterThan(50);
    });

    test('should handle multiple parser candidates', async ({ page }) => {
      // Add a mock parser that also detects JSON-like content
      const result = await page.evaluate(() => {
        const registry = (window as any).testRegistry;
        const detector = (window as any).testDetector;
        
        // Add a competing parser
        const mockParser = {
          name: 'MockJSON',
          extensions: ['mock'],
          mimeTypes: ['application/mock'],
          detect: (content) => ({
            format: 'mockjson',
            confidence: content.includes('{') ? 60 : 0,
            evidence: ['Mock parser detected JSON-like structure']
          }),
          parse: () => ({}),
          validate: () => []
        };
        
        registry.register(mockParser);
        
        return detector.detectByContent('{"competing": "parsers"}');
      });

      // Should prefer the higher confidence parser (JSON with ~80+ vs Mock with 60)
      expect(result.format).toBe('json');
      expect(result.evidence.some(e => e.includes('Best match among'))).toBe(true);
    });

    test('should handle content with no parser matches', async ({ page }) => {
      const result = await page.evaluate(() => {
        const detector = (window as any).testDetector;
        return detector.detectByContent('completely unstructured plain text content');
      });

      expect(result.format).toBe('unknown');
      expect(result.confidence).toBe(0);
      expect(result.evidence).toContain('Content analysis yielded no format matches');
    });
  });

  test.describe('Multi-Stage Detection Tests', () => {
    test('should aggregate results from multiple detection methods', async ({ page }) => {
      const result = await page.evaluate(() => {
        const detector = (window as any).testDetector;
        return detector.detect(
          '{"data": "test"}',
          {
            filename: 'test.json',
            mimeType: 'application/json'
          }
        );
      });

      expect(result.format).toBe('json');
      expect(result.confidence).toBeGreaterThan(90); // High confidence due to multiple methods
      expect(result.evidence.length).toBeGreaterThan(3); // Evidence from multiple methods
    });

    test('should weight different detection methods appropriately', async ({ page }) => {
      // Test that signature detection has higher weight than content analysis
      const result = await page.evaluate(() => {
        const detector = (window as any).testDetector;
        return detector.detect('{"signature": "based"}'); // Should trigger signature detection
      });

      expect(result.format).toBe('json');
      expect(result.confidence).toBeGreaterThan(85); // Signature detection should give high confidence
    });

    test('should handle conflicting detection results', async ({ page }) => {
      // This test simulates a case where different methods might suggest different formats
      const result = await page.evaluate(() => {
        const registry = (window as any).testRegistry;
        const detector = (window as any).testDetector;
        
        // Add a parser that would conflict with JSON detection
        const conflictParser = {
          name: 'ConflictFormat',
          extensions: ['json'], // Same extension as JSON
          mimeTypes: ['application/conflict'],
          detect: (content) => ({
            format: 'conflict',
            confidence: content.includes('conflict') ? 90 : 30, // Lower confidence for JSON content
            evidence: ['Conflict parser detection']
          }),
          parse: () => ({}),
          validate: () => []
        };
        
        registry.register(conflictParser);
        
        return detector.detect('{"no_conflict": "here"}', { filename: 'test.json' });
      });

      // Should still prefer JSON due to higher content analysis confidence
      expect(result.format).toBe('json');
      expect(result.evidence.some(e => e.includes('Alternative formats'))).toBe(true);
    });
  });

  test.describe('Caching Tests', () => {
    test('should cache detection results', async ({ page }) => {
      const result = await page.evaluate(() => {
        const detector = (window as any).testDetector;
        
        // First detection
        const result1 = detector.detect('{"cached": "content"}');
        
        // Second detection with same content should use cache
        const result2 = detector.detect('{"cached": "content"}');
        
        return { result1, result2, cacheStats: detector.getCacheStats() };
      });

      expect(result.result1.format).toBe(result.result2.format);
      expect(result.result1.confidence).toBe(result.result2.confidence);
      expect(result.cacheStats.size).toBeGreaterThan(0);
    });

    test('should respect cache disable option', async ({ page }) => {
      const result = await page.evaluate(() => {
        const detector = (window as any).testDetector;
        
        const result1 = detector.detect('{"no_cache": "content"}', { useCache: false });
        const result2 = detector.detect('{"no_cache": "content"}', { useCache: false });
        
        return { result1, result2, cacheStats: detector.getCacheStats() };
      });

      expect(result.result1.format).toBe(result.result2.format);
      // Cache should remain empty or minimal since we disabled caching
      expect(result.cacheStats.size).toBeLessThanOrEqual(1);
    });

    test('should implement LRU cache eviction', async ({ page }) => {
      const result = await page.evaluate(() => {
        const detector = (window as any).testDetector;
        
        // Clear cache first
        detector.clearCache();
        
        // Fill cache beyond capacity (assuming maxCacheSize is 100)
        for (let i = 0; i < 102; i++) {
          detector.detect(`{"item": ${i}}`);
        }
        
        return detector.getCacheStats();
      });

      expect(result.size).toBeLessThanOrEqual(100); // Should not exceed max size
      expect(result.utilization).toBeGreaterThan(90); // Should be near capacity
    });

    test('should generate different cache keys for different inputs', async ({ page }) => {
      const result = await page.evaluate(() => {
        const detector = (window as any).testDetector;
        
        detector.clearCache();
        
        // Different content
        detector.detect('{"content1": "test"}');
        const stats1 = detector.getCacheStats();
        
        // Different filename
        detector.detect('{"content1": "test"}', { filename: 'different.json' });
        const stats2 = detector.getCacheStats();
        
        // Different MIME type
        detector.detect('{"content1": "test"}', { mimeType: 'text/json' });
        const stats3 = detector.getCacheStats();
        
        return { stats1: stats1.size, stats2: stats2.size, stats3: stats3.size };
      });

      expect(result.stats2).toBeGreaterThan(result.stats1);
      expect(result.stats3).toBeGreaterThan(result.stats2);
    });

    test('should clear cache successfully', async ({ page }) => {
      const result = await page.evaluate(() => {
        const detector = (window as any).testDetector;
        
        // Add some items to cache
        detector.detect('{"item1": "test"}');
        detector.detect('{"item2": "test"}');
        
        const beforeClear = detector.getCacheStats();
        detector.clearCache();
        const afterClear = detector.getCacheStats();
        
        return { beforeClear: beforeClear.size, afterClear: afterClear.size };
      });

      expect(result.beforeClear).toBeGreaterThan(0);
      expect(result.afterClear).toBe(0);
    });
  });

  test.describe('Performance and Edge Cases', () => {
    test('should handle very large content efficiently', async ({ page }) => {
      const result = await page.evaluate(() => {
        const detector = (window as any).testDetector;
        
        // Create large JSON content
        const largeObject = {};
        for (let i = 0; i < 1000; i++) {
          largeObject[`key_${i}`] = `value_${i}`.repeat(100);
        }
        const largeContent = JSON.stringify(largeObject);
        
        const startTime = performance.now();
        const detection = detector.detect(largeContent);
        const endTime = performance.now();
        
        return {
          detection,
          performanceTime: endTime - startTime,
          contentSize: largeContent.length
        };
      });

      expect(result.detection.format).toBe('json');
      expect(result.performanceTime).toBeLessThan(1000); // Should complete within 1 second
      expect(result.contentSize).toBeGreaterThan(100000); // Verify it's actually large
    });

    test('should handle empty content gracefully', async ({ page }) => {
      const result = await page.evaluate(() => {
        const detector = (window as any).testDetector;
        return detector.detect('');
      });

      expect(result.format).toBe('unknown');
      expect(result.confidence).toBe(0);
      expect(result.evidence).toContain('All detection methods failed to identify format');
    });

    test('should handle whitespace-only content', async ({ page }) => {
      const result = await page.evaluate(() => {
        const detector = (window as any).testDetector;
        return detector.detect('   \n\t   ');
      });

      expect(result.format).toBe('unknown');
      expect(result.confidence).toBe(0);
    });

    test('should handle binary-like content safely', async ({ page }) => {
      const result = await page.evaluate(() => {
        const detector = (window as any).testDetector;
        // Simulate binary content with null bytes and non-printable characters
        const binaryContent = '\x00\x01\x02\x03\xFF\xFE';
        return detector.detect(binaryContent);
      });

      expect(result.format).toBe('unknown');
      expect(result.confidence).toBe(0);
    });

    test('should handle extremely deep nesting', async ({ page }) => {
      const result = await page.evaluate(() => {
        const detector = (window as any).testDetector;
        
        // Create deeply nested JSON
        let deepJson = '"deep"';
        for (let i = 0; i < 100; i++) {
          deepJson = `{"level_${i}": ${deepJson}}`;
        }
        
        return detector.detect(deepJson);
      });

      expect(result.format).toBe('json');
      expect(result.confidence).toBeGreaterThan(50);
    });

    test('should be deterministic with same inputs', async ({ page }) => {
      const result = await page.evaluate(() => {
        const detector = (window as any).testDetector;
        
        const testContent = '{"deterministic": "test"}';
        const results = [];
        
        // Run detection multiple times
        for (let i = 0; i < 5; i++) {
          results.push(detector.detect(testContent, { useCache: false }));
        }
        
        return results;
      });

      // All results should be identical
      const firstResult = result[0];
      for (let i = 1; i < result.length; i++) {
        expect(result[i].format).toBe(firstResult.format);
        expect(result[i].confidence).toBe(firstResult.confidence);
        expect(result[i].evidence).toEqual(firstResult.evidence);
      }
    });
  });
});