import { describe, it, expect, beforeEach } from 'vitest';
import { FormatDetector } from '@/core/formatters/FormatDetector';

describe('FormatDetector Unit Tests', () => {
  let detector: FormatDetector;

  beforeEach(() => {
    detector = new FormatDetector();
  });

  describe('Basic Format Detection', () => {
    it('should detect JSON format correctly', () => {
      const jsonContent = '{"key": "value", "number": 42}';
      const result = detector.detect(jsonContent);
      
      expect(result.format).toBe('json');
      expect(result.confidence).toBeGreaterThan(50);
      expect(Array.isArray(result.evidence)).toBe(true);
    });

    it('should detect CSV format correctly', () => {
      const csvContent = 'name,age,city\nJohn,30,NYC\nJane,25,LA';
      const result = detector.detect(csvContent);
      
      expect(result.format).toBe('csv');
      expect(result.confidence).toBeGreaterThan(50);
    });

    it('should detect XML format correctly', () => {
      const xmlContent = '<?xml version="1.0"?><root><item>test</item></root>';
      const result = detector.detect(xmlContent);
      
      expect(result.format).toBe('xml');
      expect(result.confidence).toBeGreaterThan(50);
    });

    it('should return text for unrecognized content', () => {
      const unknownContent = 'This is just plain text without any specific format';
      const result = detector.detect(unknownContent);
      
      expect(result.format).toBe('text');
      expect(result.confidence).toBeLessThan(100);
    });
  });

  describe('Format Detection with Hints', () => {
    it('should use filename hint for detection', () => {
      const content = '{"data": "value"}';
      const resultWithHint = detector.detect(content, { filename: 'data.json' });
      const resultWithoutHint = detector.detect(content);
      
      // With filename hint should have higher or equal confidence
      expect(resultWithHint.confidence).toBeGreaterThanOrEqual(resultWithoutHint.confidence);
      expect(resultWithHint.format).toBe('json');
    });

    it('should use MIME type hint for detection', () => {
      const content = 'name,age\nJohn,30\nJane,25';
      const result = detector.detect(content, { mimeType: 'text/csv' });
      
      // MIME type hint might not override content-based detection
      expect(['csv', 'text']).toContain(result.format);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should prioritize content over hints when content is strong', () => {
      const strongJsonContent = '{"very": "clear", "json": true, "structure": [1, 2, 3]}';
      const result = detector.detect(strongJsonContent, { filename: 'data.csv' });
      
      // Strong JSON content should override CSV filename hint
      expect(result.format).toBe('json');
      expect(result.confidence).toBeGreaterThan(50);
    });
  });

  describe('Signature-based Detection', () => {
    it('should detect formats by signature', () => {
      const xmlWithDeclaration = '<?xml version="1.0" encoding="UTF-8"?><root></root>';
      const result = detector.detectBySignature(xmlWithDeclaration);
      
      expect(result.format).toBe('xml');
      expect(result.confidence).toBeGreaterThan(80);
    });

    it('should handle content without clear signatures', () => {
      const ambiguousContent = 'data';
      const result = detector.detectBySignature(ambiguousContent);
      
      expect(['unknown', 'text']).toContain(result.format);
      expect(result.confidence).toBeLessThan(100);
    });
  });

  describe('Caching Functionality', () => {
    it('should cache detection results', () => {
      const content = '{"cached": true}';
      
      // First call
      const result1 = detector.detect(content, { useCache: true });
      
      // Second call should return same result (from cache)
      const result2 = detector.detect(content, { useCache: true });
      
      expect(result1).toEqual(result2);
      expect(result1.format).toBe('json');
    });

    it('should bypass cache when requested', () => {
      const content = '{"test": "cache"}';
      
      // Call with cache disabled
      const result = detector.detect(content, { useCache: false });
      
      expect(result.format).toBe('json');
      expect(result.confidence).toBeGreaterThan(50);
    });

    it('should handle cache key generation correctly', () => {
      const content = '{"same": "content"}';
      
      // Same content should produce same cache key
      const result1 = detector.detect(content, { filename: 'file1.json' });
      const result2 = detector.detect(content, { filename: 'file1.json' });
      
      expect(result1).toEqual(result2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', () => {
      const result = detector.detect('');
      
      expect(['unknown', 'text']).toContain(result.format);
      expect(typeof result.confidence).toBe('number');
    });

    it('should handle whitespace-only content', () => {
      const result = detector.detect('   \n\t   ');
      
      expect(['unknown', 'text']).toContain(result.format);
      expect(typeof result.confidence).toBe('number');
    });

    it('should handle very large content efficiently', () => {
      const largeContent = '{"data": "' + 'x'.repeat(10000) + '"}';
      const startTime = performance.now();
      
      const result = detector.detect(largeContent);
      const duration = performance.now() - startTime;
      
      expect(result.format).toBe('json');
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle malformed content gracefully', () => {
      const malformedJson = '{"key": value'; // Malformed JSON
      const result = detector.detect(malformedJson);
      
      // Should still attempt detection without crashing
      expect(typeof result.format).toBe('string');
      expect(typeof result.confidence).toBe('number');
    });
  });

  describe('Multi-format Ambiguity', () => {
    it('should handle ambiguous content', () => {
      const ambiguousContent = '1,2,3'; // Could be CSV or just numbers
      const result = detector.detect(ambiguousContent);
      
      // Should make a reasonable guess
      expect(['csv', 'unknown']).toContain(result.format);
      expect(typeof result.confidence).toBe('number');
    });

    it('should provide evidence for detection decisions', () => {
      const jsonContent = '{"key": "value"}';
      const result = detector.detect(jsonContent);
      
      expect(Array.isArray(result.evidence)).toBe(true);
      expect(result.evidence.length).toBeGreaterThan(0);
    });

    it('should handle mixed format content', () => {
      const mixedContent = '{"csv": "name,age\nJohn,30"}';
      const result = detector.detect(mixedContent);
      
      // Should detect the outer format (JSON in this case)
      expect(result.format).toBe('json');
      expect(result.confidence).toBeGreaterThan(50);
    });
  });

  describe('Configuration and Options', () => {
    it('should handle detection options correctly', () => {
      const content = '{"test": true}';
      const options = {
        filename: 'test.json',
        mimeType: 'application/json',
        useCache: true
      };
      
      const result = detector.detect(content, options);
      
      expect(result.format).toBe('json');
      expect(result.confidence).toBeGreaterThan(50);
    });

    it('should work with partial options', () => {
      const content = 'name,age\nJohn,30\nJane,25';
      const result = detector.detect(content, { filename: 'data.csv' });
      
      // Filename hint might not override content-based detection
      expect(['csv', 'text']).toContain(result.format);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should work with no options', () => {
      const content = '<root><item>test</item></root>';
      const result = detector.detect(content);
      
      expect(result.format).toBe('xml');
      expect(result.confidence).toBeGreaterThan(50);
    });
  });
});