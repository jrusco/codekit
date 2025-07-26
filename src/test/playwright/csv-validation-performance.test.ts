import { test, expect } from '@playwright/test';

// CSV Validation Performance Benchmarking Suite
// Tests for Phase 2, Task 3: Performance validation for CSV error linting
test.describe('CsvParser - Validation Performance Benchmarks', () => {
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

  // Helper function to generate CSV data of different sizes
  const generateCSVData = (rows: number, columns: number): string => {
    const headers = Array.from({ length: columns }, (_, i) => `Column${i + 1}`);
    let content = headers.join(',') + '\n';
    
    for (let i = 0; i < rows; i++) {
      const rowData = Array.from({ length: columns }, (_, j) => {
        if (j === 0) return `Row${i}`;
        if (j === 1) return (Math.random() * 100).toFixed(2);
        if (j === 2) return Math.random() > 0.5 ? 'true' : 'false';
        return `Data${i}_${j}`;
      });
      content += rowData.join(',') + '\n';
    }
    
    return content;
  };

  test.describe('Small File Performance (< 1KB)', () => {
    test('should validate small CSV files quickly', async ({ page }) => {
      const content = generateCSVData(10, 5); // ~500 bytes

      const result = await page.evaluate(({ CsvParserClass, content }) => {
        const parser = new CsvParserClass();
        const startTime = performance.now();
        const errors = parser.validate(content);
        const endTime = performance.now();
        
        return {
          errors,
          validationTime: endTime - startTime,
          fileSize: new Blob([content]).size
        };
      }, { CsvParserClass: CsvParser, content });

      expect(result.validationTime).toBeLessThan(50); // Should validate within 50ms
      expect(result.fileSize).toBeLessThan(1024); // Confirm it's under 1KB
      expect(Array.isArray(result.errors)).toBe(true);
    });

    test('should handle malformed small files efficiently', async ({ page }) => {
      const content = 'Name,Age\n"Unterminated,25\nJane,30\n=SUM(1+1),test';

      const result = await page.evaluate(({ CsvParserClass, content }) => {
        const parser = new CsvParserClass();
        const startTime = performance.now();
        const errors = parser.validate(content);
        const endTime = performance.now();
        
        return {
          errors,
          validationTime: endTime - startTime,
          errorCount: errors.length
        };
      }, { CsvParserClass: CsvParser, content });

      expect(result.validationTime).toBeLessThan(100); // Should validate within 100ms
      expect(result.errorCount).toBeGreaterThan(0); // Should detect multiple issues
    });
  });

  test.describe('Medium File Performance (1KB - 100KB)', () => {
    test('should validate medium CSV files efficiently', async ({ page }) => {
      const content = generateCSVData(100, 10); // ~10KB

      const result = await page.evaluate(({ CsvParserClass, content }) => {
        const parser = new CsvParserClass();
        const startTime = performance.now();
        const errors = parser.validate(content);
        const endTime = performance.now();
        
        return {
          errors,
          validationTime: endTime - startTime,
          fileSize: new Blob([content]).size
        };
      }, { CsvParserClass: CsvParser, content });

      expect(result.validationTime).toBeLessThan(200); // Should validate within 200ms
      expect(result.fileSize).toBeGreaterThan(1024);
      expect(result.fileSize).toBeLessThan(100 * 1024);
      expect(Array.isArray(result.errors)).toBe(true);
    });

    test('should handle CSV with many injection attempts efficiently', async ({ page }) => {
      let content = 'Name,Formula,Age\n';
      for (let i = 0; i < 50; i++) {
        content += `User${i},=SUM(${i}+1),${20 + i}\n`;
      }

      const result = await page.evaluate(({ CsvParserClass, content }) => {
        const parser = new CsvParserClass();
        const startTime = performance.now();
        const errors = parser.validate(content);
        const endTime = performance.now();
        
        return {
          errors,
          validationTime: endTime - startTime,
          injectionErrors: errors.filter(e => e.code === 'CSV_INJECTION').length
        };
      }, { CsvParserClass: CsvParser, content });

      expect(result.validationTime).toBeLessThan(300); // Should validate within 300ms
      expect(result.injectionErrors).toBeGreaterThan(10); // Should detect many injection attempts
    });
  });

  test.describe('Large File Performance (100KB - 1MB)', () => {
    test('should validate large CSV files within reasonable time', async ({ page }) => {
      const content = generateCSVData(1000, 20); // ~200KB

      const result = await page.evaluate(({ CsvParserClass, content }) => {
        const parser = new CsvParserClass();
        const startTime = performance.now();
        const errors = parser.validate(content);
        const endTime = performance.now();
        
        return {
          errors,
          validationTime: endTime - startTime,
          fileSize: new Blob([content]).size
        };
      }, { CsvParserClass: CsvParser, content });

      expect(result.validationTime).toBeLessThan(1000); // Should validate within 1 second
      expect(result.fileSize).toBeGreaterThan(100 * 1024);
      expect(Array.isArray(result.errors)).toBe(true);
      
      // Should warn about large file
      expect(result.errors.some(e => e.code === 'LARGE_FILE_INFO' || e.code === 'FILE_SIZE_WARNING')).toBe(true);
    });

    test('should handle wide CSV files (many columns) efficiently', async ({ page }) => {
      const content = generateCSVData(100, 100); // 100x100 = ~300KB

      const result = await page.evaluate(({ CsvParserClass, content }) => {
        const parser = new CsvParserClass();
        const startTime = performance.now();
        const errors = parser.validate(content);
        const endTime = performance.now();
        
        return {
          errors,
          validationTime: endTime - startTime,
          fileSize: new Blob([content]).size
        };
      }, { CsvParserClass: CsvParser, content });

      expect(result.validationTime).toBeLessThan(1500); // Should validate within 1.5 seconds
      expect(result.fileSize).toBeGreaterThan(100 * 1024);
    });
  });

  test.describe('Configuration Impact on Performance', () => {
    test('should be faster with minimal validation', async ({ page }) => {
      const content = generateCSVData(500, 10); // ~50KB

      const minimalConfig = {
        csv: {
          validation: {
            enableDataQualityChecks: false,
            enableSecurityValidation: false,
            enablePerformanceWarnings: false,
            enableEncodingValidation: false,
            enableHeaderValidation: false
          }
        }
      };

      const fullConfig = {
        csv: {
          validation: {
            enableDataQualityChecks: true,
            enableSecurityValidation: true,
            enablePerformanceWarnings: true,
            enableEncodingValidation: true,
            enableHeaderValidation: true
          }
        }
      };

      const results = await page.evaluate(({ CsvParserClass, content, minimalConfig, fullConfig }) => {
        const parser = new CsvParserClass();
        
        // Test minimal validation
        const startMinimal = performance.now();
        const minimalErrors = parser.validate(content, minimalConfig);
        const endMinimal = performance.now();
        
        // Test full validation
        const startFull = performance.now();
        const fullErrors = parser.validate(content, fullConfig);
        const endFull = performance.now();
        
        return {
          minimalTime: endMinimal - startMinimal,
          fullTime: endFull - startFull,
          minimalErrorCount: minimalErrors.length,
          fullErrorCount: fullErrors.length
        };
      }, { CsvParserClass: CsvParser, content, minimalConfig, fullConfig });

      expect(results.minimalTime).toBeLessThan(results.fullTime); // Minimal should be faster
      expect(results.fullErrorCount).toBeGreaterThanOrEqual(results.minimalErrorCount); // Full should find more issues
      expect(results.fullTime).toBeLessThan(2000); // Full validation should still be reasonable
    });

    test('should handle strict vs lenient mode performance', async ({ page }) => {
      const content = generateCSVData(200, 8); // ~20KB with some inconsistencies
      // Add some inconsistent rows
      const inconsistentContent = content + 'ExtraRow,25\nAnotherRow,30,ExtraField,TooMany\n';

      const strictConfig = {
        csv: {
          validation: {
            strictDelimiterConsistency: true,
            enableDataQualityChecks: true
          }
        }
      };

      const lenientConfig = {
        csv: {
          validation: {
            strictDelimiterConsistency: false,
            enableDataQualityChecks: false
          }
        }
      };

      const results = await page.evaluate(({ CsvParserClass, content, strictConfig, lenientConfig }) => {
        const parser = new CsvParserClass();
        
        // Test strict validation
        const startStrict = performance.now();
        const strictErrors = parser.validate(content, strictConfig);
        const endStrict = performance.now();
        
        // Test lenient validation
        const startLenient = performance.now();
        const lenientErrors = parser.validate(content, lenientConfig);
        const endLenient = performance.now();
        
        return {
          strictTime: endStrict - startStrict,
          lenientTime: endLenient - startLenient,
          strictErrorCount: strictErrors.length,
          lenientErrorCount: lenientErrors.length
        };
      }, { CsvParserClass: CsvParser, content: inconsistentContent, strictConfig, lenientConfig });

      expect(results.strictTime).toBeLessThan(1000); // Strict should still be fast
      expect(results.lenientTime).toBeLessThan(1000); // Lenient should be fast
      expect(results.strictErrorCount).toBeGreaterThanOrEqual(results.lenientErrorCount); // Strict finds more issues
    });
  });

  test.describe('Memory Usage Validation', () => {
    test('should not cause memory issues with repetitive validation', async ({ page }) => {
      const content = generateCSVData(100, 10); // ~10KB

      const result = await page.evaluate(({ CsvParserClass, content }) => {
        const parser = new CsvParserClass();
        const times: number[] = [];
        
        // Run validation 50 times to check for memory leaks
        for (let i = 0; i < 50; i++) {
          const startTime = performance.now();
          parser.validate(content);
          const endTime = performance.now();
          times.push(endTime - startTime);
        }
        
        const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
        const maxTime = Math.max(...times);
        const minTime = Math.min(...times);
        
        return {
          avgTime,
          maxTime,
          minTime,
          timeVariance: maxTime - minTime
        };
      }, { CsvParserClass: CsvParser, content });

      expect(result.avgTime).toBeLessThan(100); // Average should be fast
      expect(result.maxTime).toBeLessThan(500); // Even worst case should be reasonable
      expect(result.timeVariance).toBeLessThan(300); // Should be consistent (no major memory leaks)
    });
  });

  test.describe('Real-world Performance Scenarios', () => {
    test('should handle CSV with mixed content types efficiently', async ({ page }) => {
      let content = 'ID,Name,Email,Age,Score,Active,Date,Notes\n';
      for (let i = 0; i < 300; i++) {
        content += `${i},"User ${i}",user${i}@example.com,${20 + (i % 50)},${Math.random() * 100},${i % 2 === 0},2023-${String((i % 12) + 1).padStart(2, '0')}-15,"Note with special chars: @#$%^&*()"\n`;
      }

      const result = await page.evaluate(({ CsvParserClass, content }) => {
        const parser = new CsvParserClass();
        const startTime = performance.now();
        const errors = parser.validate(content);
        const endTime = performance.now();
        
        return {
          validationTime: endTime - startTime,
          errorCount: errors.length,
          fileSize: new Blob([content]).size
        };
      }, { CsvParserClass: CsvParser, content });

      expect(result.validationTime).toBeLessThan(800); // Should validate within 800ms
      expect(result.fileSize).toBeGreaterThan(10000); // Should be a substantial file
      expect(Array.isArray(result.errors)).toBe(true);
    });

    test('should handle CSV with problematic data patterns efficiently', async ({ page }) => {
      let content = 'Name,Formula,Data,Comments\n';
      // Mix of normal data and problematic patterns
      for (let i = 0; i < 100; i++) {
        if (i % 10 === 0) {
          content += `User${i},=SUM(${i}+1),"Long data field with many characters ".repeat(10),"Problematic comment with <script>alert('xss')</script>"\n`;
        } else if (i % 15 === 0) {
          content += `User${i},+${i}*2,"Data with ""quotes"" and, commas","Normal comment"\n`;
        } else {
          content += `User${i},${Math.random() * 100},"Regular data ${i}","Comment ${i}"\n`;
        }
      }

      const result = await page.evaluate(({ CsvParserClass, content }) => {
        const parser = new CsvParserClass();
        const startTime = performance.now();
        const errors = parser.validate(content);
        const endTime = performance.now();
        
        return {
          validationTime: endTime - startTime,
          injectionErrors: errors.filter(e => e.code === 'CSV_INJECTION').length,
          totalErrors: errors.length
        };
      }, { CsvParserClass: CsvParser, content });

      expect(result.validationTime).toBeLessThan(1000); // Should validate within 1 second
      expect(result.injectionErrors).toBeGreaterThan(0); // Should detect injection attempts
      expect(result.totalErrors).toBeGreaterThan(0); // Should detect various issues
    });
  });

  test.describe('Performance Edge Cases', () => {
    test('should handle extremely wide CSV files', async ({ page }) => {
      const content = generateCSVData(10, 500); // 10 rows, 500 columns

      const result = await page.evaluate(({ CsvParserClass, content }) => {
        const parser = new CsvParserClass();
        const startTime = performance.now();
        const errors = parser.validate(content);
        const endTime = performance.now();
        
        return {
          validationTime: endTime - startTime,
          columnWarnings: errors.filter(e => e.code === 'HIGH_COLUMN_COUNT').length,
          totalErrors: errors.length
        };
      }, { CsvParserClass: CsvParser, content });

      expect(result.validationTime).toBeLessThan(2000); // Should validate within 2 seconds
      expect(result.columnWarnings).toBeGreaterThan(0); // Should warn about high column count
    });

    test('should handle CSV with many empty fields efficiently', async ({ page }) => {
      let content = 'A,B,C,D,E,F,G,H,I,J\n';
      for (let i = 0; i < 200; i++) {
        // Create rows with many empty fields
        content += `${i},,,,,,,,\n`;
      }

      const result = await page.evaluate(({ CsvParserClass, content }) => {
        const parser = new CsvParserClass();
        const startTime = performance.now();
        const errors = parser.validate(content);
        const endTime = performance.now();
        
        return {
          validationTime: endTime - startTime,
          totalErrors: errors.length
        };
      }, { CsvParserClass: CsvParser, content });

      expect(result.validationTime).toBeLessThan(500); // Should be fast with empty fields
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });
});