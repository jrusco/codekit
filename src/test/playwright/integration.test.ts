import { test, expect } from '@playwright/test';

test.describe('Integration Tests - All Components Working Together', () => {
  let modules: any;

  test.beforeAll(async ({ page }) => {
    await page.goto('/');
    
    // Load all necessary modules including new CSV and XML parsers
    modules = await page.evaluate(() => {
      return Promise.all([
        import('/src/core/formatters/index.ts'),
        import('/src/core/formatters/JsonParser.ts'),
        import('/src/core/formatters/CsvParser.ts'),
        import('/src/core/formatters/XmlParser.ts'),
        import('/src/core/formatters/FormatRegistry.ts'),
        import('/src/core/formatters/FormatDetector.ts'),
        import('/src/core/formatters/PerformanceOptimizer.ts')
      ]).then(([indexModule, jsonModule, csvModule, xmlModule, registryModule, detectorModule, optimizerModule]) => ({
        initializeFormatters: indexModule.initializeFormatters,
        getFormatterStats: indexModule.getFormatterStats,
        JsonParser: jsonModule.JsonParser,
        CsvParser: csvModule.CsvParser,
        XmlParser: xmlModule.XmlParser,
        FormatRegistry: registryModule.FormatRegistry,
        formatRegistry: registryModule.formatRegistry,
        FormatDetector: detectorModule.FormatDetector,
        formatDetector: detectorModule.formatDetector,
        PerformanceOptimizer: optimizerModule.PerformanceOptimizer,
        performanceOptimizer: optimizerModule.performanceOptimizer
      }));
    });
  });

  test.beforeEach(async ({ page }) => {
    // Initialize a fresh system for each test
    await page.evaluate((modules) => {
      // Clear any existing state
      modules.formatRegistry.clear();
      modules.formatDetector.clearCache();
      
      // Initialize the system
      modules.initializeFormatters();
      
      // Store modules in window for test access
      (window as any).testModules = modules;
    }, modules);
  });

  test.describe('System Initialization Tests', () => {
    test('should initialize all components successfully', async ({ page }) => {
      const result = await page.evaluate(() => {
        const modules = (window as any).testModules;
        
        return {
          stats: modules.getFormatterStats(),
          registeredFormats: modules.formatRegistry.getRegisteredFormats(),
          detectorCacheStats: modules.formatDetector.getCacheStats(),
          performanceMetrics: modules.performanceOptimizer.getPerformanceMetrics()
        };
      });

      expect(result.stats.registry.registeredParsers).toBe(3); // JSON, CSV, XML
      expect(result.registeredFormats).toContain('JSON');
      expect(result.registeredFormats).toContain('CSV');
      expect(result.registeredFormats).toContain('XML');
      expect(result.detectorCacheStats.size).toBe(0); // Fresh cache
      expect(result.performanceMetrics.availableWorkers).toBeGreaterThan(0);
    });

    test('should have all parsers properly registered', async ({ page }) => {
      const result = await page.evaluate(() => {
        const modules = (window as any).testModules;
        
        const jsonParser = modules.formatRegistry.getParserByName('JSON');
        const csvParser = modules.formatRegistry.getParserByName('CSV');
        const xmlParser = modules.formatRegistry.getParserByName('XML');
        
        return {
          json: {
            hasParser: !!jsonParser,
            name: jsonParser?.name,
            extensions: jsonParser?.extensions,
            mimeTypes: jsonParser?.mimeTypes
          },
          csv: {
            hasParser: !!csvParser,
            name: csvParser?.name,
            extensions: csvParser?.extensions,
            mimeTypes: csvParser?.mimeTypes
          },
          xml: {
            hasParser: !!xmlParser,
            name: xmlParser?.name,
            extensions: xmlParser?.extensions,
            mimeTypes: xmlParser?.mimeTypes
          }
        };
      });

      // JSON Parser
      expect(result.json.hasParser).toBe(true);
      expect(result.json.name).toBe('JSON');
      expect(result.json.extensions).toContain('json');
      expect(result.json.mimeTypes).toContain('application/json');

      // CSV Parser
      expect(result.csv.hasParser).toBe(true);
      expect(result.csv.name).toBe('CSV');
      expect(result.csv.extensions).toContain('csv');
      expect(result.csv.mimeTypes).toContain('text/csv');

      // XML Parser
      expect(result.xml.hasParser).toBe(true);
      expect(result.xml.name).toBe('XML');
      expect(result.xml.extensions).toContain('xml');
      expect(result.xml.mimeTypes).toContain('application/xml');
    });
  });

  test.describe('End-to-End JSON Processing Tests', () => {
    test('should parse valid JSON through the entire pipeline', async ({ page }) => {
      const result = await page.evaluate(() => {
        const modules = (window as any).testModules;
        
        const jsonContent = '{"name": "test", "value": 42, "nested": {"array": [1, 2, 3]}}';
        
        // Test the entire pipeline
        const detection = modules.formatDetector.detect(jsonContent);
        const parseResult = modules.formatRegistry.parse(jsonContent);
        
        return {
          detection,
          parseResult,
          stats: modules.getFormatterStats()
        };
      });

      // Detection should work correctly
      expect(result.detection.format).toBe('json');
      expect(result.detection.confidence).toBeGreaterThan(50);

      // Parsing should work correctly
      expect(result.parseResult.isValid).toBe(true);
      expect(result.parseResult.data.name).toBe('test');
      expect(result.parseResult.data.value).toBe(42);
      expect(result.parseResult.data.nested.array).toEqual([1, 2, 3]);
      expect(result.parseResult.errors).toHaveLength(0);

      // Stats should be populated
      expect(result.stats.registry.registeredParsers).toBeGreaterThan(0);
      expect(result.stats.detector.size).toBeGreaterThan(0); // Cache should have entries
    });

    test('should handle invalid JSON with detailed error reporting', async ({ page }) => {
      const result = await page.evaluate(() => {
        const modules = (window as any).testModules;
        
        const invalidJson = '{"name": "test", "value": invalid}'; // Missing quotes around invalid
        
        const detection = modules.formatDetector.detect(invalidJson);
        const parseResult = modules.formatRegistry.parse(invalidJson);
        
        return { detection, parseResult };
      });

      // Should still detect as JSON format
      expect(result.detection.format).toBe('json');
      
      // But parsing should fail with detailed errors
      expect(result.parseResult.isValid).toBe(false);
      expect(result.parseResult.errors.length).toBeGreaterThan(0);
      expect(result.parseResult.errors[0].code).toBe('SYNTAX_ERROR');
      expect(result.parseResult.errors[0].line).toBeGreaterThan(0);
      expect(result.parseResult.errors[0].column).toBeGreaterThan(0);
    });

    test('should use filename hints to improve detection', async ({ page }) => {
      const result = await page.evaluate(() => {
        const modules = (window as any).testModules;
        
        const ambiguousContent = '42'; // Could be JSON number or plain text
        
        const withoutHint = modules.formatDetector.detect(ambiguousContent);
        const withHint = modules.formatDetector.detect(ambiguousContent, { filename: 'data.json' });
        
        return { withoutHint, withHint };
      });

      // Filename hint should improve detection confidence
      expect(result.withHint.confidence).toBeGreaterThan(result.withoutHint.confidence);
      expect(result.withHint.evidence.some(e => e.includes('Filename suggests'))).toBe(true);
    });

    test('should use MIME type hints effectively', async ({ page }) => {
      const result = await page.evaluate(() => {
        const modules = (window as any).testModules;
        
        const content = '{"data": "test"}';
        
        const withMimeType = modules.formatDetector.detect(content, { mimeType: 'application/json' });
        const parseWithMime = modules.formatRegistry.parse(content, { mimeType: 'application/json' });
        
        return { detection: withMimeType, parseResult: parseWithMime };
      });

      expect(result.detection.confidence).toBeGreaterThan(80);
      expect(result.detection.evidence.some(e => e.includes('MIME type'))).toBe(true);
      expect(result.parseResult.isValid).toBe(true);
    });
  });

  test.describe('Performance Integration Tests', () => {
    test('should handle large JSON files efficiently', async ({ page }) => {
      const result = await page.evaluate(() => {
        const modules = (window as any).testModules;
        
        // Create a large JSON object
        const largeObject = {};
        for (let i = 0; i < 1000; i++) {
          largeObject[`item_${i}`] = {
            id: i,
            name: `Item ${i}`,
            data: new Array(10).fill(i),
            nested: { level1: { level2: i * 2 } }
          };
        }
        
        const largeJsonContent = JSON.stringify(largeObject);
        
        const startTime = performance.now();
        
        // Test detection
        const detection = modules.formatDetector.detect(largeJsonContent);
        const detectionTime = performance.now();
        
        // Test parsing
        const parseResult = modules.formatRegistry.parse(largeJsonContent);
        const parseTime = performance.now();
        
        return {
          detection,
          parseResult: {
            isValid: parseResult.isValid,
            hasData: !!parseResult.data,
            errorCount: parseResult.errors.length,
            parseTime: parseResult.metadata.parseTime,
            fileSize: parseResult.metadata.fileSize
          },
          testMetrics: {
            detectionTime: detectionTime - startTime,
            totalParsingTime: parseTime - detectionTime,
            contentSize: largeJsonContent.length
          }
        };
      });

      // Detection should work
      expect(result.detection.format).toBe('json');
      expect(result.detection.confidence).toBeGreaterThan(80);

      // Parsing should succeed
      expect(result.parseResult.isValid).toBe(true);
      expect(result.parseResult.hasData).toBe(true);
      expect(result.parseResult.errorCount).toBe(0);

      // Performance should be reasonable
      expect(result.testMetrics.detectionTime).toBeLessThan(500); // Detection under 500ms
      expect(result.testMetrics.totalParsingTime).toBeLessThan(2000); // Parsing under 2s
      expect(result.testMetrics.contentSize).toBeGreaterThan(50000); // Verify it's actually large
    });

    test('should use performance optimizer for very large content', async ({ page }) => {
      const result = await page.evaluate(() => {
        const modules = (window as any).testModules;
        
        // Create very large JSON content
        const veryLargeArray = [];
        for (let i = 0; i < 5000; i++) {
          veryLargeArray.push({
            id: i,
            data: `item_${i}_`.repeat(100) // Make each item substantial
          });
        }
        
        const veryLargeJsonContent = JSON.stringify(veryLargeArray);
        
        // Mock the optimized parse to use our JSON parser
        const jsonParser = modules.formatRegistry.getParser('json');
        const mockParseFunction = (content) => jsonParser.parse(content);
        
        const startTime = performance.now();
        const optimizedResult = modules.performanceOptimizer.optimizedParse(
          veryLargeJsonContent,
          mockParseFunction,
          { chunkSize: 100000 } // 100KB chunks
        );
        const endTime = performance.now();
        
        return {
          result: {
            isValid: optimizedResult.isValid,
            hasData: !!optimizedResult.data,
            errorCount: optimizedResult.errors.length,
            parseTime: optimizedResult.metadata.parseTime
          },
          contentSize: veryLargeJsonContent.length,
          totalTime: endTime - startTime
        };
      });

      expect(result.result.isValid).toBe(true);
      expect(result.result.hasData).toBe(true);
      expect(result.contentSize).toBeGreaterThan(1000000); // > 1MB
      expect(result.totalTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  test.describe('Caching and State Management Tests', () => {
    test('should cache detection results across multiple calls', async ({ page }) => {
      const result = await page.evaluate(() => {
        const modules = (window as any).testModules;
        
        const content = '{"cached": "content", "test": true}';
        
        // Clear cache first
        modules.formatDetector.clearCache();
        const initialCacheStats = modules.formatDetector.getCacheStats();
        
        // First detection
        const detection1 = modules.formatDetector.detect(content);
        const afterFirstStats = modules.formatDetector.getCacheStats();
        
        // Second detection (should use cache)
        const detection2 = modules.formatDetector.detect(content);
        const afterSecondStats = modules.formatDetector.getCacheStats();
        
        // Third detection with different options (should create new cache entry)
        const detection3 = modules.formatDetector.detect(content, { filename: 'test.json' });
        const afterThirdStats = modules.formatDetector.getCacheStats();
        
        return {
          detection1,
          detection2,
          detection3,
          cacheProgression: {
            initial: initialCacheStats.size,
            afterFirst: afterFirstStats.size,
            afterSecond: afterSecondStats.size,
            afterThird: afterThirdStats.size
          }
        };
      });

      // All detections should succeed
      expect(result.detection1.format).toBe('json');
      expect(result.detection2.format).toBe('json');
      expect(result.detection3.format).toBe('json');

      // Results should be consistent
      expect(result.detection1.confidence).toBe(result.detection2.confidence);
      expect(result.detection3.confidence).toBeGreaterThan(result.detection1.confidence); // Filename bonus

      // Cache should grow appropriately
      expect(result.cacheProgression.initial).toBe(0);
      expect(result.cacheProgression.afterFirst).toBe(1);
      expect(result.cacheProgression.afterSecond).toBe(1); // Should use cache, not add new entry
      expect(result.cacheProgression.afterThird).toBe(2); // Different cache key due to filename
    });

    test('should maintain registry state correctly', async ({ page }) => {
      const result = await page.evaluate(() => {
        const modules = (window as any).testModules;
        
        const initialStats = modules.formatRegistry.getStats();
        
        // Create and register a test parser
        const testParser = {
          name: 'TestIntegration',
          extensions: ['tint'],
          mimeTypes: ['application/test-integration'],
          detect: (content) => ({
            format: 'testintegration',
            confidence: content.includes('integration') ? 90 : 0,
            evidence: ['Test integration parser']
          }),
          parse: (content) => ({
            isValid: content.includes('integration'),
            data: { content },
            errors: [],
            metadata: { parseTime: 1, fileSize: content.length, format: 'testintegration', confidence: 90 }
          }),
          validate: () => []
        };
        
        modules.formatRegistry.register(testParser);
        const afterRegistration = modules.formatRegistry.getStats();
        
        // Test detection with the new parser
        const detection = modules.formatDetector.detect('integration test content');
        
        // Test parsing with the new parser
        const parseResult = modules.formatRegistry.parse('integration test content');
        
        return {
          initialStats,
          afterRegistration,
          detection,
          parseResult: {
            isValid: parseResult.isValid,
            data: parseResult.data,
            errorCount: parseResult.errors.length
          }
        };
      });

      // Stats should change after registration
      expect(result.afterRegistration.registeredParsers).toBe(result.initialStats.registeredParsers + 1);
      expect(result.afterRegistration.supportedExtensions).toBeGreaterThan(result.initialStats.supportedExtensions);

      // New parser should work in detection
      expect(result.detection.format).toBe('testintegration');
      expect(result.detection.confidence).toBe(90);

      // New parser should work in parsing
      expect(result.parseResult.isValid).toBe(true);
      expect(result.parseResult.data.content).toBe('integration test content');
    });
  });

  test.describe('Error Handling Integration Tests', () => {
    test('should handle errors gracefully across the entire system', async ({ page }) => {
      const result = await page.evaluate(() => {
        const modules = (window as any).testModules;
        
        // Test with completely invalid content
        const invalidContent = 'This is not structured data at all';
        
        const detection = modules.formatDetector.detect(invalidContent);
        const parseResult = modules.formatRegistry.parse(invalidContent);
        const validation = modules.formatRegistry.validate(invalidContent);
        
        return { detection, parseResult, validation };
      });

      // Detection should fail gracefully
      expect(result.detection.format).toBe('unknown');
      expect(result.detection.confidence).toBe(0);

      // Parsing should fail with appropriate errors
      expect(result.parseResult.isValid).toBe(false);
      expect(result.parseResult.errors.length).toBeGreaterThan(0);

      // Validation should indicate unavailability
      expect(result.validation.length).toBeGreaterThan(0);
      expect(result.validation[0].code).toBe('VALIDATION_UNAVAILABLE');
    });

    test('should handle parser exceptions without crashing the system', async ({ page }) => {
      const result = await page.evaluate(() => {
        const modules = (window as any).testModules;
        
        // Register a parser that throws exceptions
        const faultyParser = {
          name: 'FaultyParser',
          extensions: ['faulty'],
          mimeTypes: ['application/faulty'],
          detect: (content) => {
            throw new Error('Detection error');
          },
          parse: (content) => {
            throw new Error('Parse error');
          },
          validate: (content) => {
            throw new Error('Validation error');
          }
        };
        
        try {
          modules.formatRegistry.register(faultyParser);
          
          // Test detection - should not crash
          const detection = modules.formatDetector.detect('test content');
          
          // Test explicit parsing with faulty parser - should handle gracefully
          let parseError = null;
          try {
            modules.formatRegistry.parse('test content', { format: 'FaultyParser' });
          } catch (e) {
            parseError = e.message;
          }
          
          return { 
            registration: 'success',
            detection,
            parseError: parseError || 'no error'
          };
        } catch (e) {
          return { error: e.message };
        }
      });

      expect(result.registration).toBe('success');
      expect(result.detection.format).toBeDefined(); // Should still work with other parsers
      // Parse error should be handled gracefully (not crash the system)
    });
  });

  test.describe('Statistics and Monitoring Integration Tests', () => {
    test('should provide comprehensive system statistics', async ({ page }) => {
      const result = await page.evaluate(() => {
        const modules = (window as any).testModules;
        
        // Perform some operations to generate stats
        modules.formatDetector.detect('{"stats": "test"}');
        modules.formatRegistry.parse('{"stats": "test"}');
        
        return modules.getFormatterStats();
      });

      expect(result.registry.registeredParsers).toBeGreaterThan(0);
      expect(result.registry.supportedExtensions).toBeGreaterThan(0);
      expect(result.registry.supportedMimeTypes).toBeGreaterThan(0);
      expect(result.registry.formats).toContain('json');

      expect(result.detector.size).toBeGreaterThan(0);
      expect(result.detector.maxSize).toBeGreaterThan(0);
      expect(result.detector.utilization).toBeGreaterThanOrEqual(0);

      expect(result.performance.availableWorkers).toBeGreaterThan(0);
      expect(result.performance.chunkSize).toBeGreaterThan(0);
      expect(result.performance.memoryThreshold).toBeGreaterThan(0);
    });

    test('should track system usage over time', async ({ page }) => {
      const result = await page.evaluate(() => {
        const modules = (window as any).testModules;
        
        // Clear cache to start fresh
        modules.formatDetector.clearCache();
        
        const initialStats = modules.getFormatterStats();
        
        // Perform various operations
        const operations = [
          '{"test1": "value1"}',
          '{"test2": "value2"}',
          '[1, 2, 3]',
          '{"nested": {"data": "test"}}'
        ];
        
        operations.forEach(content => {
          modules.formatDetector.detect(content);
          modules.formatRegistry.parse(content);
        });
        
        const finalStats = modules.getFormatterStats();
        
        return { initialStats, finalStats };
      });

      expect(result.finalStats.detector.size).toBeGreaterThan(result.initialStats.detector.size);
      expect(result.finalStats.detector.utilization).toBeGreaterThan(result.initialStats.detector.utilization);
    });
  });

  test.describe('Real-World Scenario Tests', () => {
    test('should handle realistic JSON data processing workflow', async ({ page }) => {
      const result = await page.evaluate(() => {
        const modules = (window as any).testModules;
        
        // Simulate a realistic JSON processing scenario
        const apiResponse = JSON.stringify({
          status: 'success',
          data: {
            users: [
              { id: 1, name: 'John Doe', email: 'john@example.com', active: true },
              { id: 2, name: 'Jane Smith', email: 'jane@example.com', active: false },
              { id: 3, name: 'Bob Johnson', email: 'bob@example.com', active: true }
            ],
            pagination: {
              page: 1,
              perPage: 10,
              total: 3,
              hasNext: false
            },
            metadata: {
              timestamp: '2024-01-01T00:00:00Z',
              version: '1.0',
              source: 'api'
            }
          }
        });
        
        // Full workflow: detect -> parse -> validate
        const detection = modules.formatDetector.detect(
          apiResponse, 
          { filename: 'api-response.json', mimeType: 'application/json' }
        );
        
        const parseResult = modules.formatRegistry.parse(apiResponse);
        
        const validation = modules.formatRegistry.validate(apiResponse);
        
        return {
          detection: {
            format: detection.format,
            confidence: detection.confidence,
            evidenceCount: detection.evidence.length
          },
          parseResult: {
            isValid: parseResult.isValid,
            hasUsers: !!parseResult.data?.data?.users,
            userCount: parseResult.data?.data?.users?.length,
            status: parseResult.data?.status,
            errorCount: parseResult.errors.length,
            parseTime: parseResult.metadata.parseTime
          },
          validation: {
            errorCount: validation.length
          },
          dataSize: apiResponse.length
        };
      });

      // Detection should be highly confident
      expect(result.detection.format).toBe('json');
      expect(result.detection.confidence).toBeGreaterThan(90);
      expect(result.detection.evidenceCount).toBeGreaterThan(2);

      // Parsing should extract data correctly
      expect(result.parseResult.isValid).toBe(true);
      expect(result.parseResult.hasUsers).toBe(true);
      expect(result.parseResult.userCount).toBe(3);
      expect(result.parseResult.status).toBe('success');
      expect(result.parseResult.errorCount).toBe(0);
      expect(result.parseResult.parseTime).toBeGreaterThan(0);

      // Validation should pass
      expect(result.validation.errorCount).toBe(0);

      // Performance should be reasonable
      expect(result.dataSize).toBeGreaterThan(100);
    });

    test('should handle malformed JSON gracefully in realistic scenarios', async ({ page }) => {
      const result = await page.evaluate(() => {
        const modules = (window as any).testModules;
        
        // Simulate common JSON errors from real-world scenarios
        const malformedScenarios = [
          {
            name: 'trailing_comma',
            content: '{"users": [{"id": 1, "name": "John",}]}', // Trailing comma
            filename: 'users.json'
          },
          {
            name: 'unquoted_keys',
            content: '{users: [{"id": 1, "name": "John"}]}', // Unquoted key
            filename: 'config.json'
          },
          {
            name: 'single_quotes',
            content: "{'id': 1, 'name': 'John'}", // Single quotes
            filename: 'data.json'
          },
          {
            name: 'incomplete',
            content: '{"users": [{"id": 1, "name": "John"', // Incomplete
            filename: 'incomplete.json'
          }
        ];
        
        return malformedScenarios.map(scenario => {
          const detection = modules.formatDetector.detect(scenario.content, { filename: scenario.filename });
          const parseResult = modules.formatRegistry.parse(scenario.content);
          
          return {
            scenario: scenario.name,
            detection: {
              format: detection.format,
              confidence: detection.confidence
            },
            parseResult: {
              isValid: parseResult.isValid,
              errorCount: parseResult.errors.length,
              hasLocationInfo: parseResult.errors.some(e => e.line && e.column)
            }
          };
        });
      });

      result.forEach(scenarioResult => {
        // Should still detect as JSON due to filename
        expect(scenarioResult.detection.format).toBe('json');
        
        // But parsing should fail
        expect(scenarioResult.parseResult.isValid).toBe(false);
        expect(scenarioResult.parseResult.errorCount).toBeGreaterThan(0);
        
        // Should provide location information for debugging
        expect(scenarioResult.parseResult.hasLocationInfo).toBe(true);
      });
    });
  });
});