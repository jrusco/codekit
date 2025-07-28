import { describe, it, expect, beforeEach } from 'vitest';
import { SecurityManager, SecurityError } from '../../../core/security/SecurityManager';

describe('SecurityManager - XSS Protection', () => {
  let securityManager: SecurityManager;

  beforeEach(() => {
    securityManager = SecurityManager.getInstance();
  });

  describe('Script Tag Detection', () => {
    it('should detect and sanitize standard script tags', () => {
      const maliciousInputs = [
        '<script>alert("XSS")</script>',
        '<SCRIPT>alert("XSS")</SCRIPT>',
        '<script type="text/javascript">alert("XSS")</script>',
        '<script src="malicious.js"></script>',
      ];

      maliciousInputs.forEach(input => {
        const result = securityManager.sanitizeInput(input, 'general');
        expect(result).not.toContain('<script');
        expect(result).not.toContain('alert');
      });
    });

    it('should detect script tags with whitespace variations (CodeQL fix)', () => {
      const maliciousInputs = [
        '<script >alert("XSS")</script >',
        '< script>alert("XSS")< /script>',
        '<script\t>alert("XSS")</script\t>',
        '<script\n>alert("XSS")</script\n>',
        '<\tscript>alert("XSS")</\tscript>',
        '<\nscript>alert("XSS")</\nscript>',
      ];

      maliciousInputs.forEach(input => {
        const result = securityManager.sanitizeInput(input, 'general');
        expect(result).not.toContain('script');
        expect(result).not.toContain('alert');
        expect(result).not.toMatch(/<\s*script/i);
      });
    });

    it('should detect self-closing script tags', () => {
      const maliciousInputs = [
        '<script src="malicious.js" />',
        '<script src="malicious.js"/>',
        '<script />',
        '< script />',
        '<script\t/>',
      ];

      maliciousInputs.forEach(input => {
        const result = securityManager.sanitizeInput(input, 'general');
        expect(result).not.toContain('<script');
        expect(result).not.toMatch(/<\s*script/i);
      });
    });
  });

  describe('Event Handler Detection', () => {
    it('should detect and sanitize event handlers (CodeQL duplicate char fix)', () => {
      const maliciousInputs = [
        'onclick="alert(1)"',
        'onmouseover="alert(1)"',
        'onerror="alert(1)"',
        'onload="alert(1)"',
        `onclick='alert(1)'`,
        `onmouseover='alert(1)'`,
        'onclick = "alert(1)"',
        'onclick= "alert(1)"',
        'onclick ="alert(1)"',
        ' onclick="alert(1)"',
      ];

      maliciousInputs.forEach(input => {
        const result = securityManager.sanitizeInput(input, 'general');
        expect(result).not.toMatch(/\s*on\w+\s*=/i);
        expect(result).not.toContain('alert');
      });
    });

    it('should handle mixed quote types in event handlers', () => {
      const maliciousInputs = [
        `onclick="alert('XSS')"`,
        `onclick='alert("XSS")'`,
        `onclick="alert(\\"XSS\\")"`,
        `onclick='alert(\\'XSS\\')'`,
      ];

      maliciousInputs.forEach(input => {
        const result = securityManager.sanitizeInput(input, 'general');
        expect(result).not.toMatch(/\s*on\w+\s*=/i);
        expect(result).not.toContain('alert');
      });
    });
  });

  describe('Advanced XSS Vector Protection', () => {
    it('should detect SVG-based XSS attacks', () => {
      const maliciousInputs = [
        '<svg onload="alert(1)">',
        '<svg><script>alert(1)</script></svg>',
        '<svg/onload="alert(1)">',
        '< svg onload="alert(1)">',
        '<svg\tonload="alert(1)">',
      ];

      maliciousInputs.forEach(input => {
        const result = securityManager.sanitizeInput(input, 'general');
        expect(result).not.toMatch(/<\s*svg/i);
        expect(result).not.toContain('alert');
      });
    });

    it('should detect iframe injection attacks', () => {
      const maliciousInputs = [
        '<iframe src="javascript:alert(1)"></iframe>',
        '<iframe src="data:text/html,<script>alert(1)</script>"></iframe>',
        '< iframe src="malicious.html"></iframe>',
        '<iframe\tsrc="malicious.html"></iframe>',
      ];

      maliciousInputs.forEach(input => {
        const result = securityManager.sanitizeInput(input, 'general');
        expect(result).not.toMatch(/<\s*iframe/i);
        expect(result).not.toContain('javascript:');
      });
    });

    it('should detect object and embed tag attacks', () => {
      const maliciousInputs = [
        '<object data="malicious.swf"></object>',
        '<embed src="malicious.swf">',
        '< object data="data:text/html,<script>alert(1)</script>"></object>',
        '<embed\tsrc="javascript:alert(1)">',
      ];

      maliciousInputs.forEach(input => {
        const result = securityManager.sanitizeInput(input, 'general');
        expect(result).not.toMatch(/<\s*(object|embed)/i);
      });
    });
  });

  describe('JavaScript URL Detection', () => {
    it('should detect javascript: URLs', () => {
      const maliciousInputs = [
        'javascript:alert(1)',
        'JAVASCRIPT:alert(1)',
        'javascript :alert(1)',
        'javascript\t:alert(1)',
        'javascript\n:alert(1)',
      ];

      maliciousInputs.forEach(input => {
        const result = securityManager.sanitizeInput(input, 'general');
        expect(result).not.toMatch(/javascript\s*:/i);
        expect(result).not.toContain('alert');
      });
    });

    it('should detect vbscript: URLs', () => {
      const maliciousInputs = [
        'vbscript:msgbox("XSS")',
        'VBSCRIPT:msgbox("XSS")',
        'vbscript :msgbox("XSS")',
      ];

      maliciousInputs.forEach(input => {
        const result = securityManager.sanitizeInput(input, 'general');
        expect(result).not.toMatch(/vbscript\s*:/i);
        expect(result).not.toContain('msgbox');
      });
    });
  });

  describe('Data URL Protection', () => {
    it('should detect dangerous data URLs', () => {
      const maliciousInputs = [
        'data:text/html,<script>alert(1)</script>',
        'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
        'data: text/html,<script>alert(1)</script>',
        'data:image/svg+xml,<svg onload="alert(1)">',
      ];

      maliciousInputs.forEach(input => {
        const result = securityManager.sanitizeInput(input, 'general');
        expect(result).not.toMatch(/data\s*:\s*text\/html/i);
        expect(result).not.toMatch(/data\s*:\s*[^,]*base64/i);
      });
    });
  });

  describe('CSS Expression Protection', () => {
    it('should detect CSS expression attacks', () => {
      const maliciousInputs = [
        'expression(alert("XSS"))',
        'EXPRESSION(alert("XSS"))',
        'expression (alert("XSS"))',
        'expression\t(alert("XSS"))',
      ];

      maliciousInputs.forEach(input => {
        const result = securityManager.sanitizeInput(input, 'general');
        expect(result).not.toMatch(/expression\s*\(/i);
        expect(result).not.toContain('alert');
      });
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large inputs without performance degradation', () => {
      const largeInput = '<script>alert(1)</script>'.repeat(1000);
      const startTime = performance.now();
      
      const result = securityManager.sanitizeInput(largeInput, 'general');
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // Should complete in <100ms
      expect(result).not.toContain('<script');
    });

    it('should handle nested and complex XSS attempts', () => {
      const complexInput = `
        <div onclick="alert(1)">
          <script>alert(2)</script>
          <svg onload="alert(3)">
            <iframe src="javascript:alert(4)"></iframe>
          </svg>
        </div>
      `;
      
      const result = securityManager.sanitizeInput(complexInput, 'general');
      expect(result).not.toContain('alert');
      expect(result).not.toMatch(/<\s*script/i);
      expect(result).not.toMatch(/<\s*svg/i);
      expect(result).not.toMatch(/<\s*iframe/i);
      expect(result).not.toMatch(/\s*on\w+\s*=/i);
    });

    it('should preserve legitimate content', () => {
      const legitimateInputs = [
        'This is normal text',
        '<div>Normal HTML content</div>',
        '<p>Paragraph with <strong>bold</strong> text</p>',
        'Email: user@example.com',
        'URL: https://example.com',
        '{"key": "value"}', // JSON content
      ];

      legitimateInputs.forEach(input => {
        const result = securityManager.sanitizeInput(input, 'general');
        expect(result.length).toBeGreaterThan(0);
        // Should preserve basic structure for legitimate content
        if (!input.includes('<script') && !input.includes('javascript:')) {
          expect(result).toContain(input.replace(/<[^>]*>/g, '').trim().split(' ')[0]);
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle null and undefined inputs', () => {
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
  });
});

describe('SecurityManager - Context-Specific Sanitization', () => {
  let securityManager: SecurityManager;

  beforeEach(() => {
    securityManager = SecurityManager.getInstance();
  });

  describe('JSON Context', () => {
    it('should apply JSON-specific protections', () => {
      const jsonInput = '{"__proto__": {"isAdmin": true}}';
      
      expect(() => {
        securityManager.sanitizeInput(jsonInput, 'json');
      }).toThrow(SecurityError);
    });
  });

  describe('CSV Context', () => {
    it('should protect against CSV injection', () => {
      const csvInputs = [
        '=cmd|"/c calc"',
        '+cmd|"/c calc"',
        '-cmd|"/c calc"',
        '@SUM(1+1)*cmd|"/c calc"',
      ];

      csvInputs.forEach(input => {
        const result = securityManager.sanitizeInput(input, 'csv');
        expect(result).not.toMatch(/^[=+\-@]/);
      });
    });
  });
});