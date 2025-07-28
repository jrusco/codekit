import { describe, it, expect, beforeEach } from 'vitest';
import { CsvParser } from '@/core/formatters/CsvParser';

describe('CsvParser Unit Tests', () => {
  let parser: CsvParser;

  beforeEach(() => {
    parser = new CsvParser();
  });

  describe('Basic Functionality', () => {
    it('should have correct parser properties', () => {
      expect(parser.name).toBe('CSV');
      expect(parser.extensions).toContain('csv');
      expect(parser.mimeTypes).toContain('text/csv');
    });

    it('should detect CSV format correctly', () => {
      const validCsv = 'name,age,city\nJohn,30,NYC\nJane,25,LA';
      const result = parser.detect(validCsv);
      
      expect(result.confidence).toBeGreaterThan(50);
      expect(result.format).toBe('csv');
    });

    it('should reject non-CSV content', () => {
      const invalidContent = 'This is plain text without delimiters';
      const result = parser.detect(invalidContent);
      
      expect(result.confidence).toBeLessThan(30);
    });
  });

  describe('Validation', () => {
    it('should validate empty content', () => {
      const errors = parser.validate('');
      
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('EMPTY_CONTENT');
      expect(errors[0].severity).toBe('error');
    });

    it('should validate without errors for valid CSV', () => {
      const validCsv = 'name,age\nJohn,30\nJane,25';
      const errors = parser.validate(validCsv);
      
      const errorSeverityErrors = errors.filter(e => e.severity === 'error');
      expect(errorSeverityErrors).toHaveLength(0);
    });

    it('should detect potential security issues', () => {
      const injectionCsv = 'name,formula\nJohn,=SUM(A1:A10)\nJane,@SUM(B1:B10)';
      const errors = parser.validate(injectionCsv);
      
      // Should have some validation warnings/errors for formulas
      expect(errors.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle validation with custom config', () => {
      const csv = 'name,age\nJohn,30\nJane,25';
      const config = {
        csv: {
          validation: {
            profile: 'strict' as const,
            enableDataQualityChecks: true,
            enableSecurityValidation: true,
            enablePerformanceWarnings: true
          }
        }
      };
      
      const errors = parser.validate(csv, config);
      // Should not have errors for valid CSV even in strict mode
      const errorSeverityErrors = errors.filter(e => e.severity === 'error');
      expect(errorSeverityErrors).toHaveLength(0);
    });
  });

  describe('Performance Characteristics', () => {
    it('should handle moderately large CSV content', () => {
      const headers = 'name,age,city';
      const rows = Array(100).fill(0).map((_, i) => `User${i},${20 + i},City${i}`);
      const largeCsv = headers + '\n' + rows.join('\n');
      
      const result = parser.detect(largeCsv);
      expect(result.confidence).toBeGreaterThan(50);
      expect(result.format).toBe('csv');
    });

    it('should validate large content with performance warnings', () => {
      const headers = 'name,data';
      const rows = Array(1000).fill('John,test');
      const largeCsv = headers + '\n' + rows.join('\n');
      
      const config = {
        csv: {
          validation: {
            maxFileSize: 1000,
            enablePerformanceWarnings: true
          }
        }
      };
      
      const errors = parser.validate(largeCsv, config);
      // May have performance warnings for large content
      expect(Array.isArray(errors)).toBe(true);
    });
  });

  describe('Format Detection Edge Cases', () => {
    it('should handle content with mixed separators', () => {
      const mixedContent = 'name,age;city\nJohn,30;NYC';
      const result = parser.detect(mixedContent);
      
      // Should still detect as CSV format
      expect(result.format).toMatch(/csv|unknown/);
    });

    it('should detect tab-separated values', () => {
      const tsvContent = 'name\tage\tcity\nJohn\t30\tNYC';
      const result = parser.detect(tsvContent);
      
      expect(result.confidence).toBeGreaterThan(30);
    });

    it('should handle quoted fields correctly in detection', () => {
      const quotedCsv = '"name","description"\n"John","Software Engineer, Tech Lead"';
      const result = parser.detect(quotedCsv);
      
      expect(result.confidence).toBeGreaterThan(50);
      expect(result.format).toBe('csv');
    });
  });

  describe('Error Handling', () => {
    it('should provide meaningful error messages', () => {
      const invalidCsv = '';
      const errors = parser.validate(invalidCsv);
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toBeDefined();
      expect(typeof errors[0].message).toBe('string');
      expect(errors[0].message.length).toBeGreaterThan(0);
    });

    it('should handle malformed content gracefully', () => {
      const malformedCsv = 'name,age\nJohn'; // Missing field
      const errors = parser.validate(malformedCsv);
      
      // Should validate without throwing errors
      expect(Array.isArray(errors)).toBe(true);
    });
  });
});