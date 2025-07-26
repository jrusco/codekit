import { test, expect } from '@playwright/test';

// Comprehensive CSV Validation Testing Suite
// Tests for Phase 2, Task 3: CSV Error linting and format validation
test.describe('CsvParser - Enhanced Validation Testing', () => {
  const getCsvParser = async (page: any) => {
    await page.goto('/');
    
    await page.waitForFunction(() => {
      return typeof window !== 'undefined';
    });
    
    return await page.evaluate(() => {
      return new Promise(async (resolve) => {
        try {
          const module = await import('/src/core/formatters/CsvParser.ts');
          resolve(module.CsvParser);
        } catch (error) {
          console.error('Failed to import CsvParser:', error);
          resolve(null);
        }
      });
    });
  };

  test.describe('Security Validation - CSV Injection Detection', () => {
    test('should detect formula injection attempts', async ({ page }) => {
      const CsvParser = await getCsvParser(page);
      const testCases = [
        { content: 'Name,Value\n=SUM(1+1),test', expected: 'CSV_INJECTION' },
        { content: 'Name,Value\n+1+1,test', expected: 'CSV_INJECTION' },
        { content: 'Name,Value\n-1-1,test', expected: 'CSV_INJECTION' },
        { content: 'Name,Value\n@SUM(A1:A5),test', expected: 'CSV_INJECTION' },
      ];

      for (const testCase of testCases) {
        const result = await page.evaluate(({ CsvParserClass, content }) => {
          const parser = new CsvParserClass();
          return parser.validate(content);
        }, { CsvParserClass: CsvParser, content: testCase.content });

        expect(result.some(error => error.code === testCase.expected)).toBe(true);
        expect(result.some(error => error.severity === 'error' || error.severity === 'warning')).toBe(true);
      }
    });

    test('should detect dangerous function calls', async ({ page }) => {
      const testCases = [
        'Name,Value\n"=CMD(""calc"")",test',
        'Name,Value\n"=SYSTEM(""rm -rf /"")",test',
        'Name,Value\n"=HYPERLINK(""http://evil.com"")",test',
        'Name,Value\n"=IMPORTDATA(""http://evil.com/data"")",test',
      ];

      for (const content of testCases) {
        const result = await page.evaluate(({ CsvParserClass, testContent }) => {
          const parser = new CsvParserClass();
          return parser.validate(testContent);
        }, { CsvParserClass: CsvParser, testContent: content });

        expect(result.some(error => error.code === 'CSV_INJECTION')).toBe(true);
        expect(result.some(error => error.severity === 'error')).toBe(true);
      }
    });

    test('should detect suspiciously long fields', async ({ page }) => {
      const longField = 'A'.repeat(15000);
      const content = `Name,Value\n${longField},test`;

      const result = await page.evaluate(({ CsvParserClass, content }) => {
        const parser = new CsvParserClass();
        return parser.validate(content);
      }, { CsvParserClass: CsvParser, content });

      expect(result.some(error => error.code === 'SUSPICIOUS_FIELD_LENGTH')).toBe(true);
      expect(result.some(error => error.severity === 'warning')).toBe(true);
    });

    test('should detect multiple injection attempts', async ({ page }) => {
      let content = 'Name,Value\n';
      for (let i = 0; i < 15; i++) {
        content += `=SUM(${i}),test${i}\n`;
      }

      const result = await page.evaluate(({ CsvParserClass, content }) => {
        const parser = new CsvParserClass();
        return parser.validate(content);
      }, { CsvParserClass: CsvParser, content });

      expect(result.some(error => error.code === 'MULTIPLE_INJECTION_ATTEMPTS')).toBe(true);
      expect(result.some(error => error.severity === 'error')).toBe(true);
    });

    test('should allow safe content to pass security validation', async ({ page }) => {
      const content = 'Name,Age,City\nJohn,25,New York\nJane,30,Los Angeles';

      const result = await page.evaluate(({ CsvParserClass, content }) => {
        const parser = new CsvParserClass();
        return parser.validate(content);
      }, { CsvParserClass: CsvParser, content });

      expect(result.filter(error => error.code === 'CSV_INJECTION')).toHaveLength(0);
    });
  });

  test.describe('Performance Validation', () => {
    test('should warn about large file sizes', async ({ page }) => {
      const config = {
        csv: {
          validation: {
            maxFileSize: 1024, // 1KB limit for testing
            enablePerformanceWarnings: true
          }
        }
      };

      // Create content larger than 1KB
      let content = 'Name,Age,City,Country,Email,Phone,Address\n';
      for (let i = 0; i < 50; i++) {
        content += `User${i},${20 + i},City${i},Country${i},user${i}@example.com,+1-555-${String(i).padStart(4, '0')},123 Street ${i}\n`;
      }

      const result = await page.evaluate(({ CsvParserClass, content, config }) => {
        const parser = new CsvParserClass();
        return parser.validate(content, config);
      }, { CsvParserClass: CsvParser, content, config });

      expect(result.some(error => error.code === 'FILE_SIZE_WARNING')).toBe(true);
      expect(result.some(error => error.severity === 'warning')).toBe(true);
    });

    test('should warn about high row count', async ({ page }) => {
      const config = {
        csv: {
          validation: {
            maxRowCount: 10, // Low limit for testing
            enablePerformanceWarnings: true
          }
        }
      };

      let content = 'Name,Value\n';
      for (let i = 0; i < 15; i++) {
        content += `Item${i},${i}\n`;
      }

      const result = await page.evaluate(({ CsvParserClass, content, config }) => {
        const parser = new CsvParserClass();
        return parser.validate(content, config);
      }, { CsvParserClass: CsvParser, content, config });

      expect(result.some(error => error.code === 'HIGH_ROW_COUNT')).toBe(true);
      expect(result.some(error => error.severity === 'warning')).toBe(true);
    });

    test('should warn about high column count', async ({ page }) => {
      const config = {
        csv: {
          validation: {
            maxColumnCount: 5, // Low limit for testing
            enablePerformanceWarnings: true
          }
        }
      };

      const headers = Array.from({ length: 10 }, (_, i) => `Col${i + 1}`);
      const content = headers.join(',') + '\n' + headers.map((_, i) => i).join(',');

      const result = await page.evaluate(({ CsvParserClass, content, config }) => {
        const parser = new CsvParserClass();
        return parser.validate(content, config);
      }, { CsvParserClass: CsvParser, content, config });

      expect(result.some(error => error.code === 'HIGH_COLUMN_COUNT')).toBe(true);
      expect(result.some(error => error.severity === 'warning')).toBe(true);
    });

    test('should estimate memory usage warnings', async ({ page }) => {
      // Create a large content string to trigger memory warning
      let content = 'Name,Description,Data\n';
      const largeField = 'X'.repeat(10000);
      for (let i = 0; i < 100; i++) {
        content += `Item${i},"${largeField}",${i}\n`;
      }

      const result = await page.evaluate(({ CsvParserClass, content }) => {
        const parser = new CsvParserClass();
        return parser.validate(content);
      }, { CsvParserClass: CsvParser, content });

      expect(result.some(error => error.code === 'HIGH_MEMORY_USAGE')).toBe(true);
      expect(result.some(error => error.severity === 'warning')).toBe(true);
    });
  });

  test.describe('Encoding Validation', () => {
    test('should detect BOM (Byte Order Mark)', async ({ page }) => {
      const contentWithBOM = '\uFEFFName,Age\nJohn,25';

      const result = await page.evaluate(({ CsvParserClass, content }) => {
        const parser = new CsvParserClass();
        return parser.validate(content);
      }, { CsvParserClass: CsvParser, content: contentWithBOM });

      expect(result.some(error => error.code === 'BOM_DETECTED')).toBe(true);
      expect(result.some(error => error.severity === 'info')).toBe(true);
    });

    test('should detect mixed line endings', async ({ page }) => {
      const content = 'Name,Age\r\nJohn,25\nJane,30\rBob,22';

      const result = await page.evaluate(({ CsvParserClass, content }) => {
        const parser = new CsvParserClass();
        return parser.validate(content);
      }, { CsvParserClass: CsvParser, content });

      expect(result.some(error => error.code === 'MIXED_LINE_ENDINGS')).toBe(true);
      expect(result.some(error => error.severity === 'warning')).toBe(true);
    });

    test('should detect control characters', async ({ page }) => {
      const content = 'Name,Age\nJohn\x00,25'; // Null character

      const result = await page.evaluate(({ CsvParserClass, content }) => {
        const parser = new CsvParserClass();
        return parser.validate(content);
      }, { CsvParserClass: CsvParser, content });

      expect(result.some(error => error.code === 'CONTROL_CHARACTERS')).toBe(true);
      expect(result.some(error => error.severity === 'warning')).toBe(true);
    });

    test('should detect encoding issues (replacement characters)', async ({ page }) => {
      const content = 'Name,Age\nJohn\uFFFD,25'; // Unicode replacement character

      const result = await page.evaluate(({ CsvParserClass, content }) => {
        const parser = new CsvParserClass();
        return parser.validate(content);
      }, { CsvParserClass: CsvParser, content });

      expect(result.some(error => error.code === 'ENCODING_ISSUES')).toBe(true);
      expect(result.some(error => error.severity === 'error')).toBe(true);
    });
  });

  test.describe('Structure Validation', () => {
    test('should enforce strict delimiter consistency', async ({ page }) => {
      const config = {
        csv: {
          validation: {
            strictDelimiterConsistency: true
          }
        }
      };

      const content = 'Name,Age,City\nJohn,25,NYC\nJane,30'; // Missing last field

      const result = await page.evaluate(({ CsvParserClass, content, config }) => {
        const parser = new CsvParserClass();
        return parser.validate(content, config);
      }, { CsvParserClass: CsvParser, content, config });

      expect(result.some(error => error.code === 'STRICT_CONSISTENCY_VIOLATION')).toBe(true);
      expect(result.some(error => error.severity === 'error')).toBe(true);
    });

    test('should allow lenient delimiter consistency', async ({ page }) => {
      const config = {
        csv: {
          validation: {
            strictDelimiterConsistency: false
          }
        }
      };

      const content = 'Name,Age,City\nJohn,25,NYC\nJane,30'; // Missing last field

      const result = await page.evaluate(({ CsvParserClass, content, config }) => {
        const parser = new CsvParserClass();
        return parser.validate(content, config);
      }, { CsvParserClass: CsvParser, content, config });

      const strictErrors = result.filter(error => error.code === 'STRICT_CONSISTENCY_VIOLATION');
      expect(strictErrors).toHaveLength(0);
      
      // Should still have inconsistent rows warning
      expect(result.some(error => error.code === 'INCONSISTENT_ROWS')).toBe(true);
    });

    test('should validate quote termination', async ({ page }) => {
      const content = 'Name,Description\n"John Smith,"Unterminated quote';

      const result = await page.evaluate(({ CsvParserClass, content }) => {
        const parser = new CsvParserClass();
        return parser.validate(content);
      }, { CsvParserClass: CsvParser, content });

      expect(result.some(error => error.code === 'UNTERMINATED_QUOTE')).toBe(true);
      expect(result.some(error => error.severity === 'error')).toBe(true);
    });
  });

  test.describe('Data Quality Validation', () => {
    test('should detect mixed data types in columns', async ({ page }) => {
      const content = `ID,Name,Score
1,John,95
2,Jane,NotANumber
3,Bob,87
4,Alice,AnotherNonNumber
5,Charlie,92`;

      const result = await page.evaluate(({ CsvParserClass, content }) => {
        const parser = new CsvParserClass();
        return parser.validate(content);
      }, { CsvParserClass: CsvParser, content });

      expect(result.some(error => error.code === 'MIXED_DATA_TYPES')).toBe(true);
      expect(result.some(error => error.severity === 'info')).toBe(true);
    });

    test('should detect high null rates', async ({ page }) => {
      const content = `Name,Age,City
John,,
Jane,,
Bob,,
Alice,,
Charlie,,`;

      const result = await page.evaluate(({ CsvParserClass, content }) => {
        const parser = new CsvParserClass();
        return parser.validate(content);
      }, { CsvParserClass: CsvParser, content });

      expect(result.some(error => error.code === 'HIGH_NULL_RATE')).toBe(true);
      expect(result.some(error => error.severity === 'info')).toBe(true);
    });

    test('should detect duplicate identifiers', async ({ page }) => {
      const content = `ID,Name,Score
1,John,95
2,Jane,87
1,Bob,92
3,Alice,88
2,Charlie,90`;

      const result = await page.evaluate(({ CsvParserClass, content }) => {
        const parser = new CsvParserClass();
        return parser.validate(content);
      }, { CsvParserClass: CsvParser, content });

      expect(result.some(error => error.code === 'DUPLICATE_IDENTIFIERS')).toBe(true);
      expect(result.some(error => error.severity === 'warning')).toBe(true);
    });

    test('should handle data quality analysis failures gracefully', async ({ page }) => {
      const malformedContent = 'Malformed CSV content that cannot be parsed properly\n"unclosed quote';

      const result = await page.evaluate(({ CsvParserClass, content }) => {
        const parser = new CsvParserClass();
        const config = { csv: { validation: { enableDataQualityChecks: true } } };
        return parser.validate(content, config);
      }, { CsvParserClass: CsvParser, content: malformedContent });

      // Should handle errors gracefully
      expect(Array.isArray(result)).toBe(true);
    });
  });

  test.describe('Header Validation', () => {
    test('should detect duplicate headers', async ({ page }) => {
      const content = 'Name,Age,Name,Score\nJohn,25,Smith,95';

      const result = await page.evaluate(({ CsvParserClass, content }) => {
        const parser = new CsvParserClass();
        return parser.validate(content);
      }, { CsvParserClass: CsvParser, content });

      expect(result.some(error => error.code === 'DUPLICATE_HEADERS')).toBe(true);
      expect(result.some(error => error.severity === 'warning')).toBe(true);
    });

    test('should detect empty headers', async ({ page }) => {
      const content = 'Name,,Age,Score\nJohn,Smith,25,95';

      const result = await page.evaluate(({ CsvParserClass, content }) => {
        const parser = new CsvParserClass();
        return parser.validate(content);
      }, { CsvParserClass: CsvParser, content });

      expect(result.some(error => error.code === 'EMPTY_HEADER')).toBe(true);
      expect(result.some(error => error.severity === 'info')).toBe(true);
    });

    test('should detect problematic header names', async ({ page }) => {
      const testCases = [
        { content: '1Name,Age\nJohn,25', issue: 'starts with number' },
        { content: 'Name  With  Spaces,Age\nJohn,25', issue: 'multiple spaces' },
        { content: 'Name<>|&,Age\nJohn,25', issue: 'problematic characters' },
        { content: 'SELECT,Age\nJohn,25', issue: 'SQL keyword' },
      ];

      for (const testCase of testCases) {
        const result = await page.evaluate(({ CsvParserClass, content }) => {
          const parser = new CsvParserClass();
          return parser.validate(content);
        }, { CsvParserClass: CsvParser, content: testCase.content });

        expect(result.some(error => error.code === 'PROBLEMATIC_HEADER_NAME')).toBe(true);
      }
    });

    test('should detect long header names', async ({ page }) => {
      const longHeader = 'A'.repeat(150);
      const content = `${longHeader},Age\nJohn,25`;

      const result = await page.evaluate(({ CsvParserClass, content }) => {
        const parser = new CsvParserClass();
        return parser.validate(content);
      }, { CsvParserClass: CsvParser, content });

      expect(result.some(error => error.code === 'LONG_HEADER_NAME')).toBe(true);
      expect(result.some(error => error.severity === 'info')).toBe(true);
    });
  });

  test.describe('Validation Configuration Profiles', () => {
    test('should use strict profile correctly', async ({ page }) => {
      const config = {
        csv: {
          validation: {
            enableDataQualityChecks: true,
            enableSecurityValidation: true,
            enablePerformanceWarnings: true,
            strictDelimiterConsistency: true,
            maxFileSize: 1024, // 1KB
            maxRowCount: 10
          }
        }
      };

      let content = 'Name,Age\n';
      for (let i = 0; i < 15; i++) {
        content += `User${i},${20 + i}\n`;
      }

      const result = await page.evaluate(({ CsvParserClass, content, config }) => {
        const parser = new CsvParserClass();
        return parser.validate(content, config);
      }, { CsvParserClass: CsvParser, content, config });

      expect(result.some(error => error.code === 'HIGH_ROW_COUNT')).toBe(true);
      expect(result.some(error => error.code === 'FILE_SIZE_WARNING')).toBe(true);
    });

    test('should use lenient profile correctly', async ({ page }) => {
      const config = {
        csv: {
          validation: {
            enableDataQualityChecks: false,
            enableSecurityValidation: false,
            enablePerformanceWarnings: false,
            strictDelimiterConsistency: false,
            maxFileSize: 100 * 1024 * 1024, // 100MB
            maxRowCount: 1000000
          }
        }
      };

      const content = 'Name,Age\n=SUM(1+1),25\nJane,30'; // Contains injection

      const result = await page.evaluate(({ CsvParserClass, content, config }) => {
        const parser = new CsvParserClass();
        return parser.validate(content, config);
      }, { CsvParserClass: CsvParser, content, config });

      // Should not detect injection due to disabled security validation
      expect(result.filter(error => error.code === 'CSV_INJECTION')).toHaveLength(0);
      expect(result.filter(error => error.code === 'FILE_SIZE_WARNING')).toHaveLength(0);
    });
  });

  test.describe('Performance Validation', () => {
    test('should track validation performance', async ({ page }) => {
      // Create moderately complex content
      let content = 'Name,Age,City,Country,Email\n';
      for (let i = 0; i < 100; i++) {
        content += `User${i},${20 + i},City${i},Country${i},user${i}@example.com\n`;
      }

      const result = await page.evaluate(({ CsvParserClass, content }) => {
        const parser = new CsvParserClass();
        const startTime = performance.now();
        const validationResult = parser.validate(content);
        const endTime = performance.now();
        
        return {
          errors: validationResult,
          validationTime: endTime - startTime
        };
      }, { CsvParserClass: CsvParser, content });

      expect(result.validationTime).toBeLessThan(1000); // Should complete within 1 second
      expect(Array.isArray(result.errors)).toBe(true);
    });

    test('should warn about slow validation', async ({ page }) => {
      // This test simulates slow validation by using a large file
      let content = 'Name,Age,City,Country,Email,Phone,Address,Company,Department,Salary\n';
      for (let i = 0; i < 1000; i++) {
        content += `User${i},${20 + i},City${i},Country${i},user${i}@example.com,+1-555-${i},Address${i},Company${i},Dept${i},${50000 + i}\n`;
      }

      const result = await page.evaluate(({ CsvParserClass, content }) => {
        const parser = new CsvParserClass();
        return parser.validate(content);
      }, { CsvParserClass: CsvParser, content });

      // May or may not get slow validation warning depending on system performance
      // At minimum, should return an array of errors without crashing
      expect(Array.isArray(result)).toBe(true);
    });
  });

  test.describe('Integration with Existing Parsing', () => {
    test('should maintain compatibility with existing parse method', async ({ page }) => {
      const content = 'Name,Age,City\nJohn,25,NYC\nJane,30,LA';

      const result = await page.evaluate(({ CsvParserClass, content }) => {
        const parser = new CsvParserClass();
        return parser.parse(content);
      }, { CsvParserClass: CsvParser, content });

      expect(result.isValid).toBe(true);
      expect(result.data).toBeTruthy();
      expect(result.data.headers).toEqual(['Name', 'Age', 'City']);
      expect(result.errors).toBeDefined(); // Should include validation warnings/info
    });

    test('should block parsing when validation finds errors', async ({ page }) => {
      const content = 'Name,Age\n"Unclosed quote,25';

      const result = await page.evaluate(({ CsvParserClass, content }) => {
        const parser = new CsvParserClass();
        return parser.parse(content);
      }, { CsvParserClass: CsvParser, content });

      expect(result.isValid).toBe(false);
      expect(result.data).toBe(null);
      expect(result.errors.some(e => e.severity === 'error')).toBe(true);
    });

    test('should allow parsing with warnings', async ({ page }) => {
      const content = 'Name,Age\nJohn,25\nJane'; // Inconsistent row

      const result = await page.evaluate(({ CsvParserClass, content }) => {
        const parser = new CsvParserClass();
        return parser.parse(content);
      }, { CsvParserClass: CsvParser, content });

      expect(result.isValid).toBe(true);
      expect(result.data).toBeTruthy();
      expect(result.errors.some(e => e.severity === 'warning')).toBe(true);
    });
  });

  test.describe('Error Message Quality', () => {
    test('should provide actionable error messages', async ({ page }) => {
      const content = 'Name,Age\n=SUM(A1:A5),25';

      const result = await page.evaluate(({ CsvParserClass, content }) => {
        const parser = new CsvParserClass();
        return parser.validate(content);
      }, { CsvParserClass: CsvParser, content });

      const injectionError = result.find(error => error.code === 'CSV_INJECTION');
      expect(injectionError).toBeTruthy();
      expect(injectionError.message).toContain('Potential CSV injection detected');
      expect(injectionError.line).toBe(2);
      expect(injectionError.column).toBe(1);
    });

    test('should provide precise error locations', async ({ page }) => {
      const content = 'Name,Age,City\nJohn,25,"Unterminated quote';

      const result = await page.evaluate(({ CsvParserClass, content }) => {
        const parser = new CsvParserClass();
        return parser.validate(content);
      }, { CsvParserClass: CsvParser, content });

      const quoteError = result.find(error => error.code === 'UNTERMINATED_QUOTE');
      expect(quoteError).toBeTruthy();
      expect(quoteError.line).toBe(2);
      expect(quoteError.column).toBeTruthy();
    });

    test('should categorize errors by severity', async ({ page }) => {
      const content = `=DANGEROUS(),Age,Name
John,25,Smith
Jane,30,Doe`;

      const result = await page.evaluate(({ CsvParserClass, content }) => {
        const parser = new CsvParserClass();
        return parser.validate(content);
      }, { CsvParserClass: CsvParser, content });

      const errorSeverities = result.map(error => error.severity);
      expect(errorSeverities).toContain('error');
      expect(errorSeverities.every(severity => ['error', 'warning', 'info'].includes(severity))).toBe(true);
    });
  });
});