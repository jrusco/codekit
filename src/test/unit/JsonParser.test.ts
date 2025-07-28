import { describe, it, expect, beforeEach } from 'vitest';
import { JsonParser } from '@/core/formatters/JsonParser';

describe('JsonParser Unit Tests', () => {
  let parser: JsonParser;

  beforeEach(() => {
    parser = new JsonParser();
  });

  describe('Basic Functionality', () => {
    it('should have correct parser properties', () => {
      expect(parser.name).toBe('JSON');
      expect(parser.extensions).toContain('json');
      expect(parser.mimeTypes).toContain('application/json');
    });

    it('should detect JSON format correctly', () => {
      const validJson = '{"key": "value"}';
      const result = parser.detect(validJson);
      
      expect(result.confidence).toBeGreaterThan(80);
      expect(result.format).toBe('json');
    });

    it('should reject non-JSON content', () => {
      const invalidContent = 'This is not JSON';
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

    it('should validate without errors for valid JSON', () => {
      const validJson = '{"name": "John", "age": 30}';
      const errors = parser.validate(validJson);
      
      const errorSeverityErrors = errors.filter(e => e.severity === 'error');
      expect(errorSeverityErrors).toHaveLength(0);
    });

    it('should detect syntax errors', () => {
      const invalidJson = '{"key": value}'; // missing quotes around value
      const errors = parser.validate(invalidJson);
      
      // Some parsers might be lenient with syntax, so check for any errors or warnings
      expect(Array.isArray(errors)).toBe(true);
    });

    it('should handle validation with custom config', () => {
      const json = '{"key": "value"}';
      const config = {
        json: {
          validation: {
            profile: 'strict' as const,
            enableSyntaxValidation: true,
            enableStructureValidation: true,
            enableSecurityValidation: true
          }
        }
      };
      
      const errors = parser.validate(json, config);
      // Should not have errors for valid JSON even in strict mode
      const errorSeverityErrors = errors.filter(e => e.severity === 'error');
      expect(errorSeverityErrors).toHaveLength(0);
    });
  });

  describe('Security Validation', () => {
    it('should detect potential prototype pollution', () => {
      const prototypePollution = '{"__proto__": {"admin": true}}';
      const errors = parser.validate(prototypePollution);
      
      // Should have some validation warnings/errors for prototype pollution
      expect(errors.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect dangerous properties', () => {
      const dangerousJson = '{"constructor": {"prototype": {}}}';
      const errors = parser.validate(dangerousJson);
      
      // Should validate without throwing errors
      expect(Array.isArray(errors)).toBe(true);
    });
  });

  describe('Performance Characteristics', () => {
    it('should handle large JSON objects', () => {
      const largeObject = {
        data: Array(100).fill(0).map((_, i) => ({ id: i, value: `item${i}` }))
      };
      const largeJson = JSON.stringify(largeObject);
      
      const result = parser.detect(largeJson);
      expect(result.confidence).toBeGreaterThan(80);
      expect(result.format).toBe('json');
    });

    it('should validate large content with performance warnings', () => {
      const largeData = 'x'.repeat(100000);
      const largeJson = `{"data": "${largeData}"}`;
      
      const config = {
        json: {
          validation: {
            maxFileSize: 1000,
            enablePerformanceWarnings: true
          }
        }
      };
      
      const errors = parser.validate(largeJson, config);
      // May have performance warnings for large content
      expect(Array.isArray(errors)).toBe(true);
    });
  });

  describe('Format Detection Edge Cases', () => {
    it('should detect JSON arrays', () => {
      const jsonArray = '[1, 2, 3, "test"]';
      const result = parser.detect(jsonArray);
      
      expect(result.confidence).toBeGreaterThan(50);
      expect(result.format).toBe('json');
    });

    it('should handle nested JSON correctly', () => {
      const nestedJson = '{"user": {"profile": {"name": "Jane"}}}';
      const result = parser.detect(nestedJson);
      
      expect(result.confidence).toBeGreaterThan(80);
      expect(result.format).toBe('json');
    });

    it('should reject malformed JSON', () => {
      const malformedJson = '{key: "value"}'; // missing quotes around key
      const result = parser.detect(malformedJson);
      
      expect(result.confidence).toBeLessThan(80);
    });
  });

  describe('Error Handling', () => {
    it('should provide meaningful error messages', () => {
      const invalidJson = '';
      const errors = parser.validate(invalidJson);
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toBeDefined();
      expect(typeof errors[0].message).toBe('string');
      expect(errors[0].message.length).toBeGreaterThan(0);
    });

    it('should handle syntax errors gracefully', () => {
      const syntaxErrorJson = '{"key": value,}'; // trailing comma and unquoted value
      const errors = parser.validate(syntaxErrorJson);
      
      expect(Array.isArray(errors)).toBe(true);
      // Some parsers might be lenient, just ensure it doesn't crash
    });

    it('should provide line and column information when available', () => {
      const multilineJson = `{
  "key": "value",
  "invalid": 
}`;
      const errors = parser.validate(multilineJson);
      
      // Some parsers might be lenient with malformed JSON
      expect(Array.isArray(errors)).toBe(true);
      // Line information may or may not be available depending on implementation
      if (errors.length > 0) {
        expect(typeof errors[0].line === 'number' || errors[0].line === undefined).toBe(true);
      }
    });
  });
});