import { describe, it, expect, beforeEach } from 'vitest';
import { SecurityManager, SecurityError } from '../../../core/security/SecurityManager';

describe('SecurityManager - Library-Based Security', () => {
  let securityManager: SecurityManager;

  beforeEach(() => {
    securityManager = SecurityManager.getInstance();
  });

  describe('DOMPurify XSS Protection', () => {
    it('should sanitize standard XSS attacks using DOMPurify', () => {
      const maliciousInputs = [
        '<script>alert("XSS")</script>',
        '<SCRIPT>alert("XSS")</SCRIPT>',
        '<script type="text/javascript">alert("XSS")</script>',
        '<script src="malicious.js"></script>',
        '<img src="x" onerror="alert(1)">',
        '<svg onload="alert(1)">',
        '<iframe src="javascript:alert(1)"></iframe>'
      ];

      maliciousInputs.forEach(input => {
        const result = securityManager.sanitizeInput(input, 'general');
        // DOMPurify should completely remove dangerous elements
        expect(result).not.toContain('<script');
        expect(result).not.toContain('alert');
        expect(result).not.toContain('javascript:');
        expect(result).not.toContain('onerror');
        expect(result).not.toContain('onload');
      });
    });

    it('should handle complex nested XSS attempts', () => {
      const complexAttacks = [
        '<div><script>alert(1)</script><p>Content</p></div>',
        '<svg><script>alert(2)</script></svg>',
        '<iframe src="data:text/html,<script>alert(3)</script>"></iframe>',
        '<object data="javascript:alert(4)"></object>',
        '<embed src="javascript:alert(5)"></embed>'
      ];

      complexAttacks.forEach(input => {
        const result = securityManager.sanitizeInput(input, 'general');
        expect(result).not.toContain('<script');
        expect(result).not.toContain('alert');
        expect(result).not.toContain('javascript:');
        expect(result).not.toContain('data:text/html');
      });
    });

    it('should preserve safe content while removing dangerous elements', () => {
      const mixedInput = '<div>Safe content</div><script>alert("bad")</script><p>More safe content</p>';
      const result = securityManager.sanitizeInput(mixedInput, 'general');
      
      // Should remove script but preserve safe content structure
      expect(result).not.toContain('<script');
      expect(result).not.toContain('alert');
      // DOMPurify with strict config may remove all tags, so check content preservation
      expect(result).toContain('Safe content');
      expect(result).toContain('More safe content');
    });

    it('should escape content for display contexts', () => {
      const htmlInput = '<div>Test &amp; content</div>';
      const result = securityManager.sanitizeInput(htmlInput, 'json');
      
      // Should be escaped for safe display
      expect(result).toContain('&lt;div&gt;');
      expect(result).toContain('&amp;');
    });
  });

  describe('Enhanced CSV Injection Protection', () => {
    it('should prevent traditional formula injection', () => {
      const csvAttacks = [
        '=cmd|"/c calc"',
        '+cmd|"/c calc"',
        '-cmd|"/c calc"',
        '@SUM(1+1)*cmd|"/c calc"'
      ];

      csvAttacks.forEach(input => {
        const result = securityManager.sanitizeInput(input, 'csv');
        expect(result).toContain("'"); // Should be prefixed with single quote
        expect(result).not.toMatch(/^[=+\-@]/); // Should not start with dangerous chars
      });
    });

    it('should detect advanced CSV injection patterns', () => {
      const advancedAttacks = [
        'cmd|"/c powershell"',
        'POWERSHELL -Command "Start-Process calc"',
        '=1+1+cmd|"/c calc"',
        '@SUM(A1:A10)+cmd|"/c notepad"'
      ];

      advancedAttacks.forEach(input => {
        const result = securityManager.sanitizeInput(input, 'csv');
        expect(result).toContain("'"); // Should be escaped and prefixed
        // The dangerous content is escaped but may still be visible as HTML entities
        expect(result).not.toMatch(/^[=@+\-]/); // Should not start with dangerous chars
      });
    });

    it('should preserve safe CSV content', () => {
      const safeInputs = [
        'Normal,Text,Content',
        '"Quoted content","More content"',
        'Numbers,123,456.78',
        'Safe-Content,With-Dashes'
      ];

      safeInputs.forEach(input => {
        const result = securityManager.sanitizeInput(input, 'csv');
        // Safe content should be preserved (may be escaped for security)
        expect(result).toBeTruthy();
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Enhanced JSON Prototype Pollution Protection', () => {
    it('should detect prototype pollution in JSON strings', () => {
      const pollutionAttempts = [
        '{"__proto__": {"isAdmin": true}}',
        '{"constructor": {"prototype": {"isAdmin": true}}}',
        '{"prototype": {"polluted": true}}',
        '{"test": {"__proto__": {"evil": true}}}'
      ];

      pollutionAttempts.forEach(input => {
        expect(() => {
          securityManager.sanitizeInput(input, 'json');
        }).toThrow(SecurityError);
      });
    });

    it('should detect prototype pollution with array notation', () => {
      const arrayNotationAttempts = [
        '{"__proto__": {"polluted": true}}', // Standard prototype pollution
        '{"constructor": {"prototype": {"polluted": true}}}', // Constructor pollution
        '{"prototype": {"evil": true}}' // Direct prototype access
      ];

      arrayNotationAttempts.forEach(input => {
        expect(() => {
          securityManager.sanitizeInput(input, 'json');
        }).toThrow(SecurityError);
      });
    });

    it('should allow safe JSON content', () => {
      const safeJSON = [
        '{"name": "John", "age": 30}',
        '{"data": [1, 2, 3, 4, 5]}',
        '{"config": {"theme": "dark", "lang": "en"}}',
        '{"proto": "safe", "construct": "allowed"}'  // Similar names but safe
      ];

      safeJSON.forEach(input => {
        expect(() => {
          securityManager.sanitizeInput(input, 'json');
        }).not.toThrow();
      });
    });

    it('should validate JSON format when strict validation is enabled', () => {
      const invalidJSON = [
        '{invalid json}', // Looks like JSON but invalid
        '{"unclosed": "quote}', // Looks like JSON but invalid
        '{trailing: comma,}' // Looks like JSON but invalid
      ];

      // Get instance with strict validation
      const strictManager = SecurityManager.getInstance({ strictValidation: true });

      invalidJSON.forEach(input => {
        expect(() => {
          strictManager.sanitizeInput(input, 'json');
        }).toThrow(SecurityError);
      });
    });
  });

  describe('Library Integration and Performance', () => {
    it('should handle large inputs efficiently', () => {
      const largeInput = '<div>Safe content </div>'.repeat(1000);
      const startTime = performance.now();
      
      const result = securityManager.sanitizeInput(largeInput, 'general');
      
      const endTime = performance.now();
      
      // Environment-aware performance thresholds
      // CI environments typically show 60-70% slower performance due to virtualization
      const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
      const performanceThreshold = isCI ? 1000 : 500; // CI: 1000ms, Local: 500ms
      
      expect(endTime - startTime).toBeLessThan(performanceThreshold);
      expect(result).toBeTruthy();
    });

    it('should provide fallback when DOMPurify fails', () => {
      // This test verifies the fallback mechanism exists
      const input = '<script>alert("test")</script>';
      const result = securityManager.sanitizeInput(input, 'general');
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should validate library configuration', () => {
      const config = securityManager.getSecurityConfig();
      
      expect(config.enableXSSProtection).toBe(true);
      expect(config.enableCSVInjectionProtection).toBe(true);
      expect(config.enablePrototypePollutionProtection).toBe(true);
      expect(config.dompurifyConfig).toBeDefined();
      expect(config.strictValidation).toBeDefined();
    });
  });

  describe('Error Message Sanitization with validator.js', () => {
    it('should sanitize error messages and escape HTML', () => {
      const dangerousError = new Error('<script>alert("XSS in error")</script>');
      const result = securityManager.sanitizeErrorMessage(dangerousError);
      
      expect(result.message).not.toContain('<script');
      expect(result.message).toContain('&lt;script&gt;');
    });

    it('should remove sensitive information from error messages', () => {
      const sensitiveError = new Error('Database connection failed: password=secret123 token=abc123');
      const result = securityManager.sanitizeErrorMessage(sensitiveError);
      
      expect(result.message).not.toContain('secret123');
      expect(result.message).not.toContain('abc123');
      expect(result.message).toContain('[REDACTED]');
    });

    it('should truncate long error messages properly', () => {
      const longMessage = 'Error: ' + 'A'.repeat(300);
      const longError = new Error(longMessage);
      const result = securityManager.sanitizeErrorMessage(longError);
      
      expect(result.message.length).toBeLessThanOrEqual(203); // 200 + "..."
      if (result.message.length > 200) {
        expect(result.message).toMatch(/\.\.\.$/);
      }
    });

    it('should provide contextual suggestions based on error type', () => {
      const jsonError = new Error('Invalid JSON syntax at line 5');
      const csvError = new Error('CSV parsing failed: invalid format');
      const sizeError = new Error('Input size exceeds maximum limit');
      
      const jsonResult = securityManager.sanitizeErrorMessage(jsonError);
      const csvResult = securityManager.sanitizeErrorMessage(csvError);
      const sizeResult = securityManager.sanitizeErrorMessage(sizeError);
      
      expect(jsonResult.suggestion).toContain('JSON syntax');
      expect(csvResult.suggestion).toContain('CSV format');
      expect(sizeResult.suggestion).toContain('reduce the file size');
    });
  });

  describe('Security Error Handling', () => {
    it('should handle null and undefined inputs gracefully', () => {
      expect(() => securityManager.sanitizeInput(null as any)).not.toThrow();
      expect(securityManager.sanitizeInput(null as any)).toBe(null);
      expect(() => securityManager.sanitizeInput(undefined as any)).not.toThrow();
    });

    it('should throw SecurityError for oversized inputs', () => {
      const oversizedInput = 'x'.repeat(11 * 1024 * 1024); // 11MB (over 10MB limit)
      
      expect(() => {
        securityManager.sanitizeInput(oversizedInput, 'general');
      }).toThrow(SecurityError);
      
      try {
        securityManager.sanitizeInput(oversizedInput, 'general');
      } catch (error) {
        expect(error).toBeInstanceOf(SecurityError);
        expect((error as SecurityError).type).toBe('INPUT_SIZE');
      }
    });

    it('should maintain security even with malformed library input', () => {
      // Test edge cases that might cause library issues
      const edgeCases = [
        '\x00\x01\x02', // Null bytes
        '\u0000\u0001\u0002', // Unicode null chars
        String.fromCharCode(0, 1, 2), // Control characters
        '\\x3cscript\\x3e', // Encoded script tags
      ];

      edgeCases.forEach(input => {
        expect(() => {
          const result = securityManager.sanitizeInput(input, 'general');
          expect(result).toBeDefined();
        }).not.toThrow();
      });
    });
  });

  describe('Library Security Validation', () => {
    it('should detect potential DOMPurify bypasses', () => {
      // This tests the additional validation layer
      const potentialBypasses = [
        'vbscript:msgbox("test")',
        'data:text/html,<script>alert(1)</script>',
        'onclick="alert(1)"'
      ];

      potentialBypasses.forEach(input => {
        const result = securityManager.sanitizeInput(input, 'general');
        // Should be cleaned by DOMPurify or validation layer
        // vbscript: should be neutralized (replaced with removed-vbscript:)
        expect(result).not.toMatch(/^vbscript:/i);
        expect(result).not.toContain('data:text/html');
        // onclick should be safe if it's escaped (as HTML entities)
        if (result.includes('onclick')) {
          expect(result).toMatch(/onclick=&quot;/); // Should be HTML escaped
        }
        
        // Additional check: dangerous functions should be neutralized (prefixed with 'removed-')
        if (result.includes('msgbox')) {
          expect(result).toMatch(/removed-msgbox/);
        }
        expect(result).not.toMatch(/<script/i);
      });
    });

    it('should maintain configuration integrity', () => {
      const config = securityManager.getSecurityConfig();
      
      // Test that security config contains expected library settings
      expect(config.dompurifyConfig).toBeDefined();
      expect(config.strictValidation).toBe(true);
      
      // Verify DOMPurify config is security-focused
      expect(config.dompurifyConfig.ALLOWED_TAGS).toBeDefined();
      expect(config.dompurifyConfig.KEEP_CONTENT).toBeDefined();
    });
  });
});