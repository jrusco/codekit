import { test, expect } from '@playwright/test';

// Comprehensive CSV Parser Testing Suite
// Enterprise-grade test coverage similar to JUnit/TestNG patterns
test.describe('CsvParser - Comprehensive Testing', () => {
  let CsvParser: any;
  
  test.beforeAll(async ({ page }) => {
    await page.goto('/');
    
    await page.waitForFunction(() => {
      return typeof window !== 'undefined';
    });
    
    CsvParser = await page.evaluate(() => {
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
  });

  test.describe('Happy Path Tests - Basic Functionality', () => {
    test('should parse simple comma-separated values', async ({ page }) => {
      const result = await page.evaluate((CsvParserClass) => {
        const parser = new CsvParserClass();
        const csvContent = `Name,Age,City
John,25,New York
Jane,30,Los Angeles
Bob,22,Chicago`;
        return parser.parse(csvContent);
      }, CsvParser);

      expect(result.isValid).toBe(true);
      expect(result.data.headers).toEqual(['Name', 'Age', 'City']);
      expect(result.data.rows).toHaveLength(3);
      expect(result.data.rows[0].cells[0].value).toBe('John');
      expect(result.data.rows[0].cells[1].value).toBe(25); // Auto-typed as number
      expect(result.data.rows[0].cells[2].value).toBe('New York');
      expect(result.metadata.format).toBe('csv');
    });

    test('should handle different delimiters automatically', async ({ page }) => {
      const testCases = [
        { content: 'A;B;C\n1;2;3', delimiter: ';' },
        { content: 'A\tB\tC\n1\t2\t3', delimiter: '\t' },
        { content: 'A|B|C\n1|2|3', delimiter: '|' },
      ];

      for (const testCase of testCases) {
        const result = await page.evaluate(({ CsvParserClass, content }) => {
          const parser = new CsvParserClass();
          return parser.parse(content);
        }, { CsvParserClass: CsvParser, content: testCase.content });

        expect(result.isValid).toBe(true);
        expect(result.data.metadata.delimiter).toBe(testCase.delimiter);
        expect(result.data.headers).toEqual(['A', 'B', 'C']);
        expect(result.data.rows[0].cells.map(c => c.value)).toEqual([1, 2, 3]);
      }
    });

    test('should handle quoted fields with special characters', async ({ page }) => {
      const result = await page.evaluate((CsvParserClass) => {
        const parser = new CsvParserClass();
        const csvContent = `Name,Description,Price
"Smith, John","A person with a ""great"" attitude","$1,234.56"
"Jane's Product","Contains, commas and ""quotes""","$99.99"`;
        return parser.parse(csvContent);
      }, CsvParser);

      expect(result.isValid).toBe(true);
      expect(result.data.rows[0].cells[0].value).toBe('Smith, John');
      expect(result.data.rows[0].cells[1].value).toBe('A person with a "great" attitude');
      expect(result.data.rows[0].cells[2].value).toBe('$1,234.56');
      expect(result.data.rows[1].cells[1].value).toBe('Contains, commas and "quotes"');
    });

    test('should infer data types correctly', async ({ page }) => {
      const result = await page.evaluate((CsvParserClass) => {
        const parser = new CsvParserClass();
        const csvContent = `ID,Name,Active,Created,Score
1,Alice,true,2023-01-15,95.5
2,Bob,false,2023-02-20,87.2
3,Charlie,yes,2023-03-10,92.0`;
        return parser.parse(csvContent);
      }, CsvParser);

      expect(result.isValid).toBe(true);
      
      // Check column type inference
      const columns = result.data.columns;
      expect(columns[0].inferredType).toBe('number'); // ID
      expect(columns[1].inferredType).toBe('string');  // Name
      expect(columns[2].inferredType).toBe('boolean'); // Active
      expect(columns[3].inferredType).toBe('date');    // Created
      expect(columns[4].inferredType).toBe('number');  // Score

      // Check actual typed values
      expect(result.data.rows[0].cells[0].value).toBe(1);
      expect(result.data.rows[0].cells[2].value).toBe(true);
      expect(result.data.rows[0].cells[3].value).toBeInstanceOf(Date);
      expect(result.data.rows[0].cells[4].value).toBe(95.5);
    });

    test('should handle files without headers', async ({ page }) => {
      const result = await page.evaluate((CsvParserClass) => {
        const parser = new CsvParserClass();
        const csvContent = `123,Product A,19.99
456,Product B,29.99
789,Product C,39.99`;
        const config = { csv: { hasHeaders: false } };
        return parser.parse(csvContent, config);
      }, CsvParser);

      expect(result.isValid).toBe(true);
      expect(result.data.headers).toEqual(['Column 1', 'Column 2', 'Column 3']);
      expect(result.data.metadata.hasHeaders).toBe(false);
      expect(result.data.rows).toHaveLength(3);
      expect(result.data.rows[0].cells[0].value).toBe(123);
    });
  });

  test.describe('Format Detection Tests', () => {
    test('should detect CSV format with high confidence', async ({ page }) => {
      const result = await page.evaluate((CsvParserClass) => {
        const parser = new CsvParserClass();
        return parser.detect('Name,Age,City\nJohn,25,NYC\nJane,30,LA');
      }, CsvParser);

      expect(result.format).toBe('csv');
      expect(result.confidence).toBeGreaterThan(70);
      expect(result.evidence.some(e => e.includes('delimiter'))).toBe(true);
    });

    test('should detect different CSV delimiters', async ({ page }) => {
      const testCases = [
        'A;B;C\n1;2;3',  // Semicolon
        'A\tB\tC\n1\t2\t3', // Tab
        'A|B|C\n1|2|3',   // Pipe
      ];

      for (const csvContent of testCases) {
        const result = await page.evaluate(({ CsvParserClass, content }) => {
          const parser = new CsvParserClass();
          return parser.detect(content);
        }, { CsvParserClass: CsvParser, content: csvContent });

        expect(result.format).toBe('csv');
        expect(result.confidence).toBeGreaterThan(50);
      }
    });

    test('should detect quoted CSV fields', async ({ page }) => {
      const result = await page.evaluate((CsvParserClass) => {
        const parser = new CsvParserClass();
        return parser.detect('Name,Description\n"Smith, John","A great person"');
      }, CsvParser);

      expect(result.format).toBe('csv');
      expect(result.evidence.some(e => e.includes('quoted fields'))).toBe(true);
    });

    test('should reject non-CSV content', async ({ page }) => {
      const testCases = [
        '<xml>not csv</xml>',
        '{"json": "object"}',
        'plain text without delimiters',
      ];

      for (const content of testCases) {
        const result = await page.evaluate(({ CsvParserClass, testContent }) => {
          const parser = new CsvParserClass();
          return parser.detect(testContent);
        }, { CsvParserClass: CsvParser, testContent: content });

        expect(result.format).toBe('unknown');
        expect(result.confidence).toBeLessThan(50);
      }
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle empty content gracefully', async ({ page }) => {
      const result = await page.evaluate((CsvParserClass) => {
        const parser = new CsvParserClass();
        return parser.parse('');
      }, CsvParser);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('EMPTY_CONTENT');
    });

    test('should detect unterminated quotes', async ({ page }) => {
      const result = await page.evaluate((CsvParserClass) => {
        const parser = new CsvParserClass();
        return parser.validate('Name,Description\n"John Smith,"Unterminated quote');
      }, CsvParser);

      expect(result.some(error => error.code === 'UNTERMINATED_QUOTE')).toBe(true);
    });

    test('should handle inconsistent row lengths', async ({ page }) => {
      const result = await page.evaluate((CsvParserClass) => {
        const parser = new CsvParserClass();
        const csvContent = `Name,Age,City
John,25,NYC
Jane,30
Bob,22,Chicago,Extra`;
        return parser.validate(csvContent);
      }, CsvParser);

      expect(result.some(error => error.code === 'INCONSISTENT_ROWS')).toBe(true);
      expect(result.some(error => error.severity === 'warning')).toBe(true);
    });

    test('should handle mixed data types gracefully', async ({ page }) => {
      const result = await page.evaluate((CsvParserClass) => {
        const parser = new CsvParserClass();
        const csvContent = `ID,Value
1,100
2,not_a_number
3,300`;
        return parser.parse(csvContent);
      }, CsvParser);

      expect(result.isValid).toBe(true);
      expect(result.data.rows[1].isValid).toBe(false); // Row with conversion error
      expect(result.data.rows[1].errors.length).toBeGreaterThan(0);
    });

    test('should detect delimiter detection failures', async ({ page }) => {
      const result = await page.evaluate((CsvParserClass) => {
        const parser = new CsvParserClass();
        return parser.validate('no delimiters here just plain text');
      }, CsvParser);

      expect(result.some(error => error.code === 'DELIMITER_DETECTION_FAILED')).toBe(true);
    });
  });

  test.describe('Advanced CSV Features', () => {
    test('should handle various line endings', async ({ page }) => {
      const testCases = [
        { content: 'A,B\r\n1,2\r\n3,4', ending: '\r\n' }, // Windows
        { content: 'A,B\n1,2\n3,4', ending: '\n' },       // Unix
        { content: 'A,B\r1,2\r3,4', ending: '\r' },       // Mac Classic
      ];

      for (const testCase of testCases) {
        const result = await page.evaluate(({ CsvParserClass, content }) => {
          const parser = new CsvParserClass();
          return parser.parse(content);
        }, { CsvParserClass: CsvParser, content: testCase.content });

        expect(result.isValid).toBe(true);
        expect(result.data.metadata.lineEnding).toBe(testCase.ending);
        expect(result.data.rows).toHaveLength(2);
      }
    });

    test('should skip empty lines when configured', async ({ page }) => {
      const result = await page.evaluate((CsvParserClass) => {
        const parser = new CsvParserClass();
        const csvContent = `Name,Age

John,25

Jane,30
`;
        const config = { csv: { skipEmptyLines: true } };
        return parser.parse(csvContent, config);
      }, CsvParser);

      expect(result.isValid).toBe(true);
      expect(result.data.rows).toHaveLength(2); // Empty lines skipped
    });

    test('should handle null and empty values correctly', async ({ page }) => {
      const result = await page.evaluate((CsvParserClass) => {
        const parser = new CsvParserClass();
        const csvContent = `Name,Age,Note
John,25,
Jane,,Active
,30,N/A
Bob,null,`;
        return parser.parse(csvContent);
      }, CsvParser);

      expect(result.isValid).toBe(true);
      expect(result.data.rows[0].cells[2].value).toBeNull(); // Empty string -> null
      expect(result.data.rows[1].cells[1].value).toBeNull(); // Empty -> null
      expect(result.data.rows[2].cells[0].value).toBeNull(); // Empty -> null
    });

    test('should auto-detect headers vs data rows', async ({ page }) => {
      const result = await page.evaluate((CsvParserClass) => {
        const parser = new CsvParserClass();
        const csvContent = `Product_Name,Price,Quantity
Widget A,19.99,100
Widget B,29.99,50`;
        return parser.parse(csvContent);
      }, CsvParser);

      expect(result.isValid).toBe(true);
      expect(result.data.metadata.hasHeaders).toBe(true);
      expect(result.data.headers[0]).toBe('Product_Name');
    });
  });

  test.describe('Performance and Large Data Tests', () => {
    test('should handle large CSV files efficiently', async ({ page }) => {
      const result = await page.evaluate((CsvParserClass) => {
        const parser = new CsvParserClass();
        
        // Generate large CSV data
        let csvContent = 'ID,Name,Score,Date,Active\n';
        for (let i = 1; i <= 1000; i++) {
          csvContent += `${i},User${i},${85 + Math.random() * 15},2023-01-${String(i % 28 + 1).padStart(2, '0')},${i % 2 === 0}\n`;
        }
        
        const startTime = performance.now();
        const parseResult = parser.parse(csvContent);
        const endTime = performance.now();
        
        return {
          ...parseResult,
          testMetrics: {
            parseTime: endTime - startTime,
            inputSize: csvContent.length,
            rowCount: parseResult.data?.rows?.length || 0
          }
        };
      }, CsvParser);

      expect(result.isValid).toBe(true);
      expect(result.testMetrics.rowCount).toBe(1000);
      expect(result.testMetrics.parseTime).toBeLessThan(2000); // Should parse within 2 seconds
      expect(result.data.rows[999].cells[0].value).toBe(1000); // Verify last row
    });

    test('should handle wide CSV files (many columns)', async ({ page }) => {
      const result = await page.evaluate((CsvParserClass) => {
        const parser = new CsvParserClass();
        
        // Generate CSV with many columns
        const headers = Array.from({ length: 50 }, (_, i) => `Col${i + 1}`);
        const dataRow = Array.from({ length: 50 }, (_, i) => i + 1);
        
        const csvContent = headers.join(',') + '\n' + dataRow.join(',');
        return parser.parse(csvContent);
      }, CsvParser);

      expect(result.isValid).toBe(true);
      expect(result.data.headers).toHaveLength(50);
      expect(result.data.rows[0].cells).toHaveLength(50);
      expect(result.data.rows[0].cells[49].value).toBe(50);
    });
  });

  test.describe('Unicode and International Support', () => {
    test('should handle Unicode characters in CSV', async ({ page }) => {
      const result = await page.evaluate((CsvParserClass) => {
        const parser = new CsvParserClass();
        const csvContent = `Name,City,Note
José,São Paulo,Olá mundo
李明,北京,你好世界
محمد,القاهرة,مرحبا بالعالم
🦄,🌈,"Emoji, test"`;
        return parser.parse(csvContent);
      }, CsvParser);

      expect(result.isValid).toBe(true);
      expect(result.data.rows[0].cells[0].value).toBe('José');
      expect(result.data.rows[1].cells[0].value).toBe('李明');
      expect(result.data.rows[2].cells[0].value).toBe('محمد');
      expect(result.data.rows[3].cells[0].value).toBe('🦄');
    });

    test('should handle different number formats', async ({ page }) => {
      const result = await page.evaluate((CsvParserClass) => {
        const parser = new CsvParserClass();
        const csvContent = `Amount,Formatted
1234.56,"1,234.56"
-789.12,"-789.12"
0.001,"0.001"
1000000,"1,000,000"`;
        return parser.parse(csvContent);
      }, CsvParser);

      expect(result.isValid).toBe(true);
      expect(result.data.rows[0].cells[1].value).toBe(1234.56); // Comma removed
      expect(result.data.rows[1].cells[1].value).toBe(-789.12);
      expect(result.data.rows[3].cells[1].value).toBe(1000000);
    });
  });

  test.describe('Validation Method Tests - Enhanced', () => {
    test('should validate correct CSV without critical errors', async ({ page }) => {
      const result = await page.evaluate((CsvParserClass) => {
        const parser = new CsvParserClass();
        return parser.validate('Name,Age\nJohn,25\nJane,30');
      }, CsvParser);

      // Should not have any error-level issues, but may have warnings/info
      expect(result.filter(error => error.severity === 'error')).toHaveLength(0);
    });

    test('should detect structural issues', async ({ page }) => {
      const result = await page.evaluate((CsvParserClass) => {
        const parser = new CsvParserClass();
        return parser.validate('not really csv content here');
      }, CsvParser);

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(error => error.code === 'INVALID_CSV_FORMAT')).toBe(true);
    });

    test('should provide helpful error messages with enhanced validation', async ({ page }) => {
      const testCases = [
        { 
          input: 'Name,Age\n"John,25', 
          expectedCode: 'UNTERMINATED_QUOTE',
          description: 'unterminated quote' 
        },
        { 
          input: 'A,B\n1,2,3\n4,5', 
          expectedCode: 'INCONSISTENT_ROWS',
          description: 'inconsistent row lengths' 
        },
      ];

      for (const testCase of testCases) {
        const result = await page.evaluate(({ CsvParserClass, input }) => {
          const parser = new CsvParserClass();
          return parser.validate(input);
        }, { CsvParserClass: CsvParser, input: testCase.input });

        expect(result.some(error => error.code === testCase.expectedCode)).toBe(true);
      }
    });

    test('should support validation configuration', async ({ page }) => {
      const config = {
        csv: {
          validation: {
            enableSecurityValidation: false,
            enablePerformanceWarnings: false,
            enableDataQualityChecks: false,
            enableEncodingValidation: false,
            enableHeaderValidation: false
          }
        }
      };

      const result = await page.evaluate(({ CsvParserClass, config }) => {
        const parser = new CsvParserClass();
        return parser.validate('=SUM(1+1),Age\nJohn,25', config);
      }, { CsvParserClass: CsvParser, config });

      // Should have fewer validation errors with everything disabled
      expect(result.filter(error => error.code === 'CSV_INJECTION')).toHaveLength(0);
    });

    test('should include validation in parse results', async ({ page }) => {
      const content = 'Name,Age,Name\nJohn,25,Smith'; // Duplicate headers

      const result = await page.evaluate(({ CsvParserClass, content }) => {
        const parser = new CsvParserClass();
        return parser.parse(content);
      }, { CsvParserClass: CsvParser, content });

      expect(result.isValid).toBe(true); // Should still parse successfully
      expect(result.errors.some(error => error.code === 'DUPLICATE_HEADERS')).toBe(true);
      expect(result.errors.some(error => error.severity === 'warning')).toBe(true);
    });
  });

  test.describe('Configuration and Customization', () => {
    test('should respect custom delimiter configuration', async ({ page }) => {
      const result = await page.evaluate((CsvParserClass) => {
        const parser = new CsvParserClass();
        const csvContent = 'A|B|C\n1|2|3';
        const config = { csv: { delimiter: '|' } };
        return parser.parse(csvContent, config);
      }, CsvParser);

      expect(result.isValid).toBe(true);
      expect(result.data.metadata.delimiter).toBe('|');
    });

    test('should respect custom quote character configuration', async ({ page }) => {
      const result = await page.evaluate((CsvParserClass) => {
        const parser = new CsvParserClass();
        const csvContent = "A,B\n'Hello, World','Test'";
        const config = { csv: { quoteChar: "'" } };
        return parser.parse(csvContent, config);
      }, CsvParser);

      expect(result.isValid).toBe(true);
      expect(result.data.rows[0].cells[0].value).toBe('Hello, World');
    });

    test('should handle empty lines configuration', async ({ page }) => {
      const csvContent = 'A,B\n\n1,2\n\n3,4\n';
      
      // Test with skipEmptyLines = true
      const result1 = await page.evaluate(({ CsvParserClass, content }) => {
        const parser = new CsvParserClass();
        const config = { csv: { skipEmptyLines: true } };
        return parser.parse(content, config);
      }, { CsvParserClass: CsvParser, content: csvContent });

      expect(result1.data.rows).toHaveLength(2);

      // Test with skipEmptyLines = false
      const result2 = await page.evaluate(({ CsvParserClass, content }) => {
        const parser = new CsvParserClass();
        const config = { csv: { skipEmptyLines: false } };
        return parser.parse(content, config);
      }, { CsvParserClass: CsvParser, content: csvContent });

      expect(result2.data.rows.length).toBeGreaterThan(2);
    });
  });
});