import { test, expect } from '@playwright/test';

// Import the JsonParser for testing
// Note: We'll need to set up proper module loading for this
test.describe('JsonParser - Comprehensive Testing', () => {
  let JsonParser: any;
  
  test.beforeAll(async ({ page }) => {
    // Navigate to our app and expose the JsonParser class
    await page.goto('/');
    
    // Wait for the app to load and expose our modules
    await page.waitForFunction(() => {
      return typeof window !== 'undefined';
    });
    
    // Import JsonParser class in the browser context
    JsonParser = await page.evaluate(() => {
      // This will be dynamically imported from our built modules
      return new Promise(async (resolve) => {
        try {
          const module = await import('/src/core/formatters/JsonParser.ts');
          resolve(module.JsonParser);
        } catch (error) {
          console.error('Failed to import JsonParser:', error);
          resolve(null);
        }
      });
    });
  });

  test.describe('Happy Path Tests', () => {
    test('should parse valid JSON object', async ({ page }) => {
      const result = await page.evaluate((JsonParserClass) => {
        const parser = new JsonParserClass();
        const validJson = '{"name": "test", "value": 42}';
        return parser.parse(validJson);
      }, JsonParser);

      expect(result.isValid).toBe(true);
      expect(result.data).toEqual({ name: 'test', value: 42 });
      expect(result.errors).toHaveLength(0);
      expect(result.metadata.format).toBe('json');
      expect(result.metadata.confidence).toBe(100);
    });

    test('should parse valid JSON array', async ({ page }) => {
      const result = await page.evaluate((JsonParserClass) => {
        const parser = new JsonParserClass();
        const validJson = '[1, 2, 3, "test"]';
        return parser.parse(validJson);
      }, JsonParser);

      expect(result.isValid).toBe(true);
      expect(result.data).toEqual([1, 2, 3, 'test']);
      expect(result.errors).toHaveLength(0);
    });

    test('should parse nested JSON structures', async ({ page }) => {
      const result = await page.evaluate((JsonParserClass) => {
        const parser = new JsonParserClass();
        const validJson = `{
          "user": {
            "name": "John",
            "preferences": {
              "theme": "dark",
              "notifications": true
            }
          },
          "data": [1, 2, 3]
        }`;
        return parser.parse(validJson);
      }, JsonParser);

      expect(result.isValid).toBe(true);
      expect(result.data.user.name).toBe('John');
      expect(result.data.user.preferences.theme).toBe('dark');
      expect(result.data.data).toEqual([1, 2, 3]);
    });

    test('should handle JSON with special values', async ({ page }) => {
      const result = await page.evaluate((JsonParserClass) => {
        const parser = new JsonParserClass();
        const validJson = `{
          "nullValue": null,
          "boolTrue": true,
          "boolFalse": false,
          "emptyString": "",
          "emptyArray": [],
          "emptyObject": {}
        }`;
        return parser.parse(validJson);
      }, JsonParser);

      expect(result.isValid).toBe(true);
      expect(result.data.nullValue).toBeNull();
      expect(result.data.boolTrue).toBe(true);
      expect(result.data.boolFalse).toBe(false);
      expect(result.data.emptyString).toBe('');
      expect(result.data.emptyArray).toEqual([]);
      expect(result.data.emptyObject).toEqual({});
    });
  });

  test.describe('Format Detection Tests', () => {
    test('should detect valid JSON with high confidence', async ({ page }) => {
      const result = await page.evaluate((JsonParserClass) => {
        const parser = new JsonParserClass();
        return parser.detect('{"test": "value"}');
      }, JsonParser);

      expect(result.format).toBe('json');
      expect(result.confidence).toBeGreaterThan(50);
      expect(result.evidence).toContain('Valid JSON wrapper structure');
    });

    test('should detect JSON array format', async ({ page }) => {
      const result = await page.evaluate((JsonParserClass) => {
        const parser = new JsonParserClass();
        return parser.detect('[1, 2, 3]');
      }, JsonParser);

      expect(result.format).toBe('json');
      expect(result.confidence).toBeGreaterThan(50);
    });

    test('should reject non-JSON content', async ({ page }) => {
      const result = await page.evaluate((JsonParserClass) => {
        const parser = new JsonParserClass();
        return parser.detect('<xml>not json</xml>');
      }, JsonParser);

      expect(result.format).toBe('unknown');
      expect(result.confidence).toBeLessThan(50);
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle empty content gracefully', async ({ page }) => {
      const result = await page.evaluate((JsonParserClass) => {
        const parser = new JsonParserClass();
        return parser.parse('');
      }, JsonParser);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('EMPTY_CONTENT');
      expect(result.errors[0].message).toBe('Content is empty');
    });

    test('should handle whitespace-only content', async ({ page }) => {
      const result = await page.evaluate((JsonParserClass) => {
        const parser = new JsonParserClass();
        return parser.parse('   \n  \t  ');
      }, JsonParser);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('EMPTY_CONTENT');
    });

    test('should detect and report syntax errors with location', async ({ page }) => {
      const result = await page.evaluate((JsonParserClass) => {
        const parser = new JsonParserClass();
        return parser.parse('{"name": "test",}'); // Trailing comma
      }, JsonParser);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('SYNTAX_ERROR');
      expect(result.errors[0].line).toBeGreaterThan(0);
      expect(result.errors[0].column).toBeGreaterThan(0);
    });

    test('should detect unmatched brackets', async ({ page }) => {
      const result = await page.evaluate((JsonParserClass) => {
        const parser = new JsonParserClass();
        return parser.validate('{"name": "test"'); // Missing closing brace
      }, JsonParser);

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('UNCLOSED_BRACKET');
      expect(result[0].message).toContain('Unclosed brace');
    });

    test('should detect mismatched brackets', async ({ page }) => {
      const result = await page.evaluate((JsonParserClass) => {
        const parser = new JsonParserClass();
        return parser.validate('{"name": ["test"}'); // Bracket mismatch
      }, JsonParser);

      expect(result.some(error => error.code === 'MISMATCHED_BRACKETS')).toBe(true);
    });

    test('should detect unterminated strings', async ({ page }) => {
      const result = await page.evaluate((JsonParserClass) => {
        const parser = new JsonParserClass();
        return parser.validate('{"name": "unterminated string');
      }, JsonParser);

      expect(result.some(error => error.code === 'UNTERMINATED_STRING')).toBe(true);
    });

    test('should handle malformed JSON with helpful messages', async ({ page }) => {
      const testCases = [
        { input: '{name: "test"}', expectedCode: 'SYNTAX_ERROR' }, // Unquoted key
        { input: '{"name": undefined}', expectedCode: 'SYNTAX_ERROR' }, // Undefined value
        { input: '{}"extra"', expectedCode: 'SYNTAX_ERROR' }, // Extra content
      ];

      for (const testCase of testCases) {
        const result = await page.evaluate(({ JsonParserClass, input }) => {
          const parser = new JsonParserClass();
          return parser.parse(input);
        }, { JsonParserClass: JsonParser, input: testCase.input });

        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.code === testCase.expectedCode)).toBe(true);
      }
    });
  });

  test.describe('Performance and Large Data Tests', () => {
    test('should handle large JSON objects efficiently', async ({ page }) => {
      const result = await page.evaluate((JsonParserClass) => {
        const parser = new JsonParserClass();
        
        // Generate a large JSON object
        const largeObject: any = {};
        for (let i = 0; i < 1000; i++) {
          largeObject[`key_${i}`] = {
            id: i,
            name: `Item ${i}`,
            data: new Array(10).fill(i),
            nested: {
              level1: { level2: { level3: `deep_${i}` } }
            }
          };
        }
        
        const jsonString = JSON.stringify(largeObject);
        const startTime = performance.now();
        const parseResult = parser.parse(jsonString);
        const endTime = performance.now();
        
        return {
          ...parseResult,
          testMetrics: {
            parseTime: endTime - startTime,
            inputSize: jsonString.length
          }
        };
      }, JsonParser);

      expect(result.isValid).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.metadata.parseTime).toBeGreaterThan(0);
      expect(result.testMetrics.parseTime).toBeLessThan(1000); // Should parse within 1 second
      
      // Verify data integrity
      expect(result.data.key_0.id).toBe(0);
      expect(result.data.key_999.id).toBe(999);
      expect(result.data.key_500.nested.level1.level2.level3).toBe('deep_500');
    });

    test('should handle deeply nested JSON structures', async ({ page }) => {
      const result = await page.evaluate((JsonParserClass) => {
        const parser = new JsonParserClass();
        
        // Create deeply nested structure
        let deepObject: any = { value: 'deep' };
        for (let i = 0; i < 50; i++) {
          deepObject = { level: i, nested: deepObject };
        }
        
        const jsonString = JSON.stringify(deepObject);
        return parser.parse(jsonString);
      }, JsonParser);

      expect(result.isValid).toBe(true);
      expect(result.data.level).toBe(49);
      
      // Navigate to the deepest level
      let current = result.data;
      for (let i = 49; i >= 0; i--) {
        expect(current.level).toBe(i);
        current = current.nested;
      }
      expect(current.value).toBe('deep');
    });

    test('should measure and report accurate parsing metrics', async ({ page }) => {
      const result = await page.evaluate((JsonParserClass) => {
        const parser = new JsonParserClass();
        const testJson = '{"test": "value", "number": 42, "array": [1, 2, 3]}';
        return parser.parse(testJson);
      }, JsonParser);

      expect(result.metadata.parseTime).toBeGreaterThan(0);
      expect(result.metadata.fileSize).toBeGreaterThan(0);
      expect(result.metadata.format).toBe('json');
      expect(result.metadata.confidence).toBe(100);
    });
  });

  test.describe('Unicode and Special Character Handling', () => {
    test('should handle Unicode characters correctly', async ({ page }) => {
      const result = await page.evaluate((JsonParserClass) => {
        const parser = new JsonParserClass();
        const unicodeJson = '{"emoji": "🚀", "chinese": "你好", "arabic": "مرحبا", "special": "\\u0048\\u0069"}';
        return parser.parse(unicodeJson);
      }, JsonParser);

      expect(result.isValid).toBe(true);
      expect(result.data.emoji).toBe('🚀');
      expect(result.data.chinese).toBe('你好');
      expect(result.data.arabic).toBe('مرحبا');
      expect(result.data.special).toBe('Hi');
    });

    test('should handle escaped characters properly', async ({ page }) => {
      const result = await page.evaluate((JsonParserClass) => {
        const parser = new JsonParserClass();
        const escapedJson = '{"quotes": "\\"Hello\\"", "newlines": "Line1\\nLine2", "tabs": "Col1\\tCol2"}';
        return parser.parse(escapedJson);
      }, JsonParser);

      expect(result.isValid).toBe(true);
      expect(result.data.quotes).toBe('"Hello"');
      expect(result.data.newlines).toBe('Line1\nLine2');
      expect(result.data.tabs).toBe('Col1\tCol2');
    });
  });

  test.describe('Validation Method Tests', () => {
    test('should validate correct JSON without errors', async ({ page }) => {
      const result = await page.evaluate((JsonParserClass) => {
        const parser = new JsonParserClass();
        return parser.validate('{"valid": true, "array": [1, 2, 3]}');
      }, JsonParser);

      expect(result).toHaveLength(0);
    });

    test('should return validation errors for invalid structure', async ({ page }) => {
      const result = await page.evaluate((JsonParserClass) => {
        const parser = new JsonParserClass();
        return parser.validate('not json at all');
      }, JsonParser);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].code).toBe('INVALID_STRUCTURE');
    });

    test('should validate bracket matching comprehensively', async ({ page }) => {
      const testCases = [
        { input: '{"test": [}', expectError: 'MISMATCHED_BRACKETS' },
        { input: '{"test": ]', expectError: 'MISMATCHED_BRACKETS' },
        { input: '{"test": "value"', expectError: 'UNCLOSED_BRACKET' },
        { input: '["test", "value"}', expectError: 'MISMATCHED_BRACKETS' },
      ];

      for (const testCase of testCases) {
        const result = await page.evaluate(({ JsonParserClass, input }) => {
          const parser = new JsonParserClass();
          return parser.validate(input);
        }, { JsonParserClass: JsonParser, input: testCase.input });

        expect(result.some(error => error.code === testCase.expectError)).toBe(true);
      }
    });
  });
});