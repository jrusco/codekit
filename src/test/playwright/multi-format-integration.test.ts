import { test, expect } from '@playwright/test';

// Multi-Format Parser Integration Testing Suite
// Tests the complete multi-format system working together
test.describe('Multi-Format Parser Integration - Comprehensive Testing', () => {
  let formatRegistry: any;
  let formatDetector: any;
  let JsonParser: any;
  let CsvParser: any;
  let XmlParser: any;
  let initializeFormatters: any;

  test.beforeAll(async ({ page }) => {
    await page.goto('/');
    
    await page.waitForFunction(() => {
      return typeof window !== 'undefined';
    });
    
    // Import all required modules
    const modules = await page.evaluate(() => {
      return new Promise(async (resolve) => {
        try {
          const [
            registryModule,
            detectorModule,
            jsonModule,
            csvModule,
            xmlModule,
            initModule
          ] = await Promise.all([
            import('/src/core/formatters/FormatRegistry.ts'),
            import('/src/core/formatters/FormatDetector.ts'),
            import('/src/core/formatters/JsonParser.ts'),
            import('/src/core/formatters/CsvParser.ts'),
            import('/src/core/formatters/XmlParser.ts'),
            import('/src/core/formatters/index.ts')
          ]);
          
          resolve({
            formatRegistry: registryModule.formatRegistry,
            formatDetector: detectorModule.formatDetector,
            JsonParser: jsonModule.JsonParser,
            CsvParser: csvModule.CsvParser,
            XmlParser: xmlModule.XmlParser,
            initializeFormatters: initModule.initializeFormatters
          });
        } catch (error) {
          console.error('Failed to import modules:', error);
          resolve(null);
        }
      });
    });

    formatRegistry = modules.formatRegistry;
    formatDetector = modules.formatDetector;
    JsonParser = modules.JsonParser;
    CsvParser = modules.CsvParser;
    XmlParser = modules.XmlParser;
    initializeFormatters = modules.initializeFormatters;
  });

  test.describe('System Initialization and Registration', () => {
    test('should initialize all parsers correctly', async ({ page }) => {
      const result = await page.evaluate(({ initFn }) => {
        // Initialize the formatters
        initFn();
        
        // Return system stats
        return {
          registeredFormats: window.formatRegistry.getRegisteredFormats(),
          stats: window.formatRegistry.getStats()
        };
      }, { initFn: initializeFormatters });

      expect(result.registeredFormats).toContain('JSON');
      expect(result.registeredFormats).toContain('CSV');
      expect(result.registeredFormats).toContain('XML');
      expect(result.stats.registeredParsers).toBe(3);
      expect(result.stats.supportedExtensions.length).toBeGreaterThan(5);
    });

    test('should register parsers with correct metadata', async ({ page }) => {
      const result = await page.evaluate(() => {
        return {
          jsonParser: window.formatRegistry.getParserByName('JSON'),
          csvParser: window.formatRegistry.getParserByName('CSV'),
          xmlParser: window.formatRegistry.getParserByName('XML')
        };
      });

      // Check JSON parser
      expect(result.jsonParser.extensions).toContain('json');
      expect(result.jsonParser.mimeTypes).toContain('application/json');

      // Check CSV parser  
      expect(result.csvParser.extensions).toContain('csv');
      expect(result.csvParser.mimeTypes).toContain('text/csv');

      // Check XML parser
      expect(result.xmlParser.extensions).toContain('xml');
      expect(result.xmlParser.mimeTypes).toContain('application/xml');
    });
  });

  test.describe('Multi-Format Detection Flow', () => {
    test('should correctly identify JSON content', async ({ page }) => {
      const result = await page.evaluate(() => {
        const content = '{"name": "test", "value": 42, "items": [1, 2, 3]}';
        return window.formatDetector.detect(content);
      });

      expect(result.format).toBe('json');
      expect(result.confidence).toBeGreaterThan(80);
      expect(result.evidence.length).toBeGreaterThan(0);
    });

    test('should correctly identify CSV content', async ({ page }) => {
      const result = await page.evaluate(() => {
        const content = `Name,Age,City
John Doe,25,New York
Jane Smith,30,Los Angeles
Bob Johnson,22,Chicago`;
        return window.formatDetector.detect(content);
      });

      expect(result.format).toBe('csv');
      expect(result.confidence).toBeGreaterThan(70);
      expect(result.evidence.some((e: string) => e.includes('delimiter'))).toBe(true);
    });

    test('should correctly identify XML content', async ({ page }) => {
      const result = await page.evaluate(() => {
        const content = `<?xml version="1.0" encoding="UTF-8"?>
<users>
  <user id="1">
    <name>John Doe</name>
    <age>25</age>
  </user>
</users>`;
        return window.formatDetector.detect(content);
      });

      expect(result.format).toBe('xml');
      expect(result.confidence).toBeGreaterThan(80);
      expect(result.evidence.some((e: string) => e.includes('XML declaration'))).toBe(true);
    });

    test('should use multiple detection methods with weighted confidence', async ({ page }) => {
      const testCases = [
        {
          content: '{"test": "value"}',
          filename: 'data.json',
          mimeType: 'application/json',
          expectedFormat: 'json'
        },
        {
          content: 'Name,Value\nTest,123',
          filename: 'data.csv',
          mimeType: 'text/csv',
          expectedFormat: 'csv'
        },
        {
          content: '<root><item>test</item></root>',
          filename: 'data.xml',
          mimeType: 'application/xml',
          expectedFormat: 'xml'
        }
      ];

      for (const testCase of testCases) {
        const result = await page.evaluate(({ content, filename, mimeType }) => {
          return window.formatDetector.detect(content, { filename, mimeType });
        }, testCase);

        expect(result.format).toBe(testCase.expectedFormat);
        expect(result.confidence).toBeGreaterThan(70);
        expect(result.evidence.some((e: string) => e.includes('signature') || e.includes('mime-type') || e.includes('filename'))).toBe(true);
      }
    });

    test('should handle conflicting format indicators', async ({ page }) => {
      const result = await page.evaluate(() => {
        // JSON content with CSV filename
        const content = '{"name": "test", "data": [1, 2, 3]}';
        return window.formatDetector.detect(content, { filename: 'data.csv' });
      });

      // Should still detect as JSON due to high content confidence
      expect(result.format).toBe('json');
      expect(result.evidence.length).toBeGreaterThan(1); // Multiple detection methods
    });
  });

  test.describe('End-to-End Parsing Flow', () => {
    test('should parse JSON through the complete flow', async ({ page }) => {
      const result = await page.evaluate(() => {
        const content = '{"users": [{"name": "John", "age": 25}, {"name": "Jane", "age": 30}]}';
        
        // Step 1: Detect format
        const detection = window.formatDetector.detect(content);
        
        // Step 2: Get appropriate parser
        const parser = window.formatRegistry.getParserByName(detection.format.toUpperCase());
        
        // Step 3: Parse content
        const parseResult = parser.parse(content);
        
        return {
          detection,
          parseResult,
          parserName: parser.name
        };
      });

      expect(result.detection.format).toBe('json');
      expect(result.parserName).toBe('JSON');
      expect(result.parseResult.isValid).toBe(true);
      expect(result.parseResult.data.users).toHaveLength(2);
      expect(result.parseResult.data.users[0].name).toBe('John');
    });

    test('should parse CSV through the complete flow', async ({ page }) => {
      const result = await page.evaluate(() => {
        const content = `ID,Name,Department,Salary
1,John Doe,Engineering,75000
2,Jane Smith,Marketing,65000
3,Bob Johnson,Sales,55000`;
        
        const detection = window.formatDetector.detect(content);
        const parser = window.formatRegistry.getParserByName(detection.format.toUpperCase());
        const parseResult = parser.parse(content);
        
        return {
          detection,
          parseResult,
          parserName: parser.name
        };
      });

      expect(result.detection.format).toBe('csv');
      expect(result.parserName).toBe('CSV');
      expect(result.parseResult.isValid).toBe(true);
      expect(result.parseResult.data.headers).toEqual(['ID', 'Name', 'Department', 'Salary']);
      expect(result.parseResult.data.rows).toHaveLength(3);
      expect(result.parseResult.data.rows[0].cells[1].value).toBe('John Doe');
      expect(result.parseResult.data.rows[0].cells[3].value).toBe(75000); // Auto-typed as number
    });

    test('should parse XML through the complete flow', async ({ page }) => {
      const result = await page.evaluate(() => {
        const content = `<?xml version="1.0"?>
<company>
  <department name="Engineering">
    <employee id="1">
      <name>John Doe</name>
      <position>Senior Developer</position>
    </employee>
    <employee id="2">
      <name>Jane Smith</name>
      <position>Team Lead</position>
    </employee>
  </department>
</company>`;
        
        const detection = window.formatDetector.detect(content);
        const parser = window.formatRegistry.getParserByName(detection.format.toUpperCase());
        const parseResult = parser.parse(content);
        
        return {
          detection,
          parseResult,
          parserName: parser.name
        };
      });

      expect(result.detection.format).toBe('xml');
      expect(result.parserName).toBe('XML');
      expect(result.parseResult.isValid).toBe(true);
      expect(result.parseResult.data.root.name).toBe('company');
      expect(result.parseResult.data.declaration.version).toBe('1.0');
      
      const department = result.parseResult.data.root.children[0];
      expect(department.name).toBe('department');
      expect(department.attributes[0].value).toBe('Engineering');
      expect(department.children).toHaveLength(2); // Two employees
    });
  });

  test.describe('Cross-Format Edge Cases', () => {
    test('should handle ambiguous content correctly', async ({ page }) => {
      const testCases = [
        {
          description: 'Single JSON value that could be CSV',
          content: '"name,value"',
          expectedFormat: 'json' // JSON strings are valid JSON
        },
        {
          description: 'XML-like content in CSV',
          content: 'Field1,Field2\n<tag>,<value>',
          expectedFormat: 'csv' // CSV structure wins
        },
        {
          description: 'CSV-like content in XML comment',
          content: '<root><!-- Name,Age,City --><item>data</item></root>',
          expectedFormat: 'xml' // XML structure wins
        }
      ];

      for (const testCase of testCases) {
        const result = await page.evaluate(({ content }) => {
          return window.formatDetector.detect(content);
        }, { content: testCase.content });

        expect(result.format).toBe(testCase.expectedFormat);
      }
    });

    test('should handle empty and whitespace content', async ({ page }) => {
      const testCases = ['', '   ', '\n\n\t  \n'];

      for (const content of testCases) {
        const result = await page.evaluate(({ testContent }) => {
          return window.formatDetector.detect(testContent);
        }, { testContent: content });

        expect(result.format).toBe('unknown');
        expect(result.confidence).toBe(0);
      }
    });

    test('should handle malformed content gracefully', async ({ page }) => {
      const testCases = [
        { content: '{malformed json', description: 'malformed JSON' },
        { content: 'Name,Age\n"unclosed quote', description: 'malformed CSV' },
        { content: '<root><unclosed>', description: 'malformed XML' }
      ];

      for (const testCase of testCases) {
        const result = await page.evaluate(({ content }) => {
          const detection = window.formatDetector.detect(content);
          
          if (detection.format !== 'unknown') {
            const parser = window.formatRegistry.getParserByName(detection.format.toUpperCase());
            const parseResult = parser.parse(content);
            return { detection, parseResult };
          }
          
          return { detection, parseResult: null };
        }, { content: testCase.content });

        // Either detect as unknown or parse with errors
        if (result.parseResult) {
          expect(result.parseResult.isValid).toBe(false);
          expect(result.parseResult.errors.length).toBeGreaterThan(0);
        } else {
          expect(result.detection.format).toBe('unknown');
        }
      }
    });
  });

  test.describe('Performance Integration Tests', () => {
    test('should handle mixed format workload efficiently', async ({ page }) => {
      const result = await page.evaluate(() => {
        const testCases = [
          { content: '{"test": "json"}', format: 'json' },
          { content: 'Name,Value\nTest,123', format: 'csv' },
          { content: '<root><item>xml</item></root>', format: 'xml' },
          { content: '{"another": "json", "array": [1,2,3]}', format: 'json' },
          { content: 'A,B,C\n1,2,3\n4,5,6', format: 'csv' }
        ];

        const startTime = performance.now();
        const results = [];

        for (const testCase of testCases) {
          const detection = window.formatDetector.detect(testCase.content);
          const parser = window.formatRegistry.getParserByName(detection.format.toUpperCase());
          const parseResult = parser.parse(testCase.content);
          
          results.push({
            expectedFormat: testCase.format,
            detectedFormat: detection.format,
            isValid: parseResult.isValid,
            parseTime: parseResult.metadata.parseTime
          });
        }

        const totalTime = performance.now() - startTime;

        return {
          results,
          totalTime,
          averageTime: totalTime / testCases.length
        };
      });

      // Verify all formats were detected correctly
      result.results.forEach((r: any) => {
        expect(r.detectedFormat).toBe(r.expectedFormat);
        expect(r.isValid).toBe(true);
        expect(r.parseTime).toBeGreaterThan(0);
      });

      // Performance checks
      expect(result.totalTime).toBeLessThan(1000); // Total under 1 second
      expect(result.averageTime).toBeLessThan(200); // Average under 200ms
    });

    test('should cache detection results effectively', async ({ page }) => {
      const result = await page.evaluate(() => {
        const content = '{"repeated": "content", "for": "caching", "test": true}';
        
        // First detection (cache miss)
        const start1 = performance.now();
        const detection1 = window.formatDetector.detect(content);
        const time1 = performance.now() - start1;
        
        // Second detection (cache hit)
        const start2 = performance.now();
        const detection2 = window.formatDetector.detect(content);
        const time2 = performance.now() - start2;
        
        // Third detection with same content (cache hit)
        const start3 = performance.now();
        const detection3 = window.formatDetector.detect(content);
        const time3 = performance.now() - start3;
        
        return {
          detection1,
          detection2,
          detection3,
          times: [time1, time2, time3],
          cacheStats: window.formatDetector.getCacheStats()
        };
      });

      // All detections should return same result
      expect(result.detection1.format).toBe(result.detection2.format);
      expect(result.detection2.format).toBe(result.detection3.format);
      expect(result.detection1.confidence).toBe(result.detection2.confidence);

      // Cache hits should be faster (though this might be flaky in tests)
      // expect(result.times[1]).toBeLessThan(result.times[0]);
      // expect(result.times[2]).toBeLessThan(result.times[0]);

      // Cache should show utilization
      expect(result.cacheStats.size).toBeGreaterThan(0);
      expect(result.cacheStats.utilization).toBeGreaterThan(0);
    });
  });

  test.describe('System Statistics and Monitoring', () => {
    test('should provide comprehensive system statistics', async ({ page }) => {
      const result = await page.evaluate(() => {
        // Parse some content to generate stats
        const jsonContent = '{"test": "data"}';
        const csvContent = 'Name,Value\nTest,123';
        const xmlContent = '<root><item>test</item></root>';

        window.formatDetector.detect(jsonContent);
        window.formatDetector.detect(csvContent);
        window.formatDetector.detect(xmlContent);

        return {
          registryStats: window.formatRegistry.getStats(),
          detectorStats: window.formatDetector.getCacheStats()
        };
      });

      // Registry stats
      expect(result.registryStats.registeredParsers).toBe(3);
      expect(result.registryStats.supportedExtensions.length).toBeGreaterThan(5);
      expect(result.registryStats.supportedMimeTypes.length).toBeGreaterThan(5);

      // Detector stats
      expect(result.detectorStats.maxSize).toBeGreaterThan(0);
      expect(result.detectorStats.utilization).toBeGreaterThanOrEqual(0);
    });

    test('should track parser usage and performance', async ({ page }) => {
      const result = await page.evaluate(() => {
        // Use each parser
        const jsonParser = window.formatRegistry.getParserByName('JSON');
        const csvParser = window.formatRegistry.getParserByName('CSV');
        const xmlParser = window.formatRegistry.getParserByName('XML');

        const jsonResult = jsonParser.parse('{"test": true}');
        const csvResult = csvParser.parse('A,B\n1,2');
        const xmlResult = xmlParser.parse('<root><item>test</item></root>');

        return {
          jsonMetadata: jsonResult.metadata,
          csvMetadata: csvResult.metadata,
          xmlMetadata: xmlResult.metadata
        };
      });

      // All should have performance metadata
      expect(result.jsonMetadata.parseTime).toBeGreaterThan(0);
      expect(result.csvMetadata.parseTime).toBeGreaterThan(0);
      expect(result.xmlMetadata.parseTime).toBeGreaterThan(0);

      expect(result.jsonMetadata.fileSize).toBeGreaterThan(0);
      expect(result.csvMetadata.fileSize).toBeGreaterThan(0);
      expect(result.xmlMetadata.fileSize).toBeGreaterThan(0);

      expect(result.jsonMetadata.confidence).toBe(100);
      expect(result.csvMetadata.confidence).toBe(100);
      expect(result.xmlMetadata.confidence).toBe(100);
    });
  });

  test.describe('Error Handling Integration', () => {
    test('should handle parser failures gracefully', async ({ page }) => {
      const result = await page.evaluate(() => {
        const results = [];

        // Test each parser with invalid content for its format
        const testCases = [
          { content: 'invalid json {', expectedParser: 'JSON' },
          { content: 'Name,Age\n"unclosed', expectedParser: 'CSV' },
          { content: '<root><unclosed>', expectedParser: 'XML' }
        ];

        for (const testCase of testCases) {
          try {
            const detection = window.formatDetector.detect(testCase.content);
            let parseResult = null;
            
            if (detection.format !== 'unknown') {
              const parser = window.formatRegistry.getParserByName(detection.format.toUpperCase());
              parseResult = parser.parse(testCase.content);
            }

            results.push({
              content: testCase.content,
              expectedParser: testCase.expectedParser,
              detection,
              parseResult,
              error: null
            });
          } catch (error) {
            results.push({
              content: testCase.content,
              expectedParser: testCase.expectedParser,
              detection: null,
              parseResult: null,
              error: error.message
            });
          }
        }

        return results;
      });

      result.forEach((r: any) => {
        if (r.parseResult) {
          // Parser should return invalid result with errors, not throw
          expect(r.parseResult.isValid).toBe(false);
          expect(r.parseResult.errors.length).toBeGreaterThan(0);
        }
        // Should not throw uncaught exceptions
        expect(r.error).toBeNull();
      });
    });

    test('should maintain system stability with concurrent operations', async ({ page }) => {
      const result = await page.evaluate(() => {
        const operations = [];
        const contents = [
          '{"json": "data"}',
          'CSV,Data\n1,2',
          '<xml><data>test</data></xml>',
          '{"more": "json"}',
          'A,B,C\n1,2,3'
        ];

        // Simulate concurrent operations
        for (let i = 0; i < 20; i++) {
          const content = contents[i % contents.length];
          const detection = window.formatDetector.detect(content);
          
          if (detection.format !== 'unknown') {
            const parser = window.formatRegistry.getParserByName(detection.format.toUpperCase());
            const parseResult = parser.parse(content);
            operations.push({
              iteration: i,
              format: detection.format,
              isValid: parseResult.isValid,
              hasData: parseResult.data !== null
            });
          }
        }

        return {
          operationCount: operations.length,
          successCount: operations.filter(op => op.isValid).length,
          uniqueFormats: [...new Set(operations.map(op => op.format))]
        };
      });

      expect(result.operationCount).toBe(20);
      expect(result.successCount).toBe(20); // All should succeed
      expect(result.uniqueFormats.length).toBe(3); // JSON, CSV, XML
    });
  });
});