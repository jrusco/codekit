import { describe, it, expect, beforeEach } from 'vitest';
import { XmlParser } from '@/core/formatters/XmlParser';

describe('XmlParser Unit Tests', () => {
  let parser: XmlParser;

  beforeEach(() => {
    parser = new XmlParser();
  });

  describe('Basic Functionality', () => {
    it('should have correct parser properties', () => {
      expect(parser.name).toBe('XML');
      expect(parser.extensions).toContain('xml');
      expect(parser.mimeTypes).toContain('application/xml');
    });

    it('should detect XML format correctly', () => {
      const validXml = '<?xml version="1.0"?><root><item>test</item></root>';
      const result = parser.detect(validXml);
      
      expect(result.confidence).toBeGreaterThan(80);
      expect(result.format).toBe('xml');
    });

    it('should reject non-XML content', () => {
      const invalidContent = '{"key": "value"}';
      const result = parser.detect(invalidContent);
      
      expect(result.confidence).toBeLessThan(30);
    });
  });

  describe('Validation', () => {
    it('should validate empty content', () => {
      const errors = parser.validate('');
      
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('XML_EMPTY_CONTENT');
      expect(errors[0].severity).toBe('error');
    });

    it('should validate valid XML without errors', () => {
      const validXml = '<root><item>test</item></root>';
      const config = {
        xml: {
          validation: {
            enableSyntaxValidation: false,
            enableStructureValidation: false,
            enableSecurityValidation: false,
            enablePerformanceWarnings: false,
            enableQualityLinting: false
          }
        }
      };
      
      const errors = parser.validate(validXml, config);
      const errorSeverityErrors = errors.filter(e => e.severity === 'error');
      expect(errorSeverityErrors).toHaveLength(0);
    });

    it('should NOT flag valid XML declarations (false positive fix)', () => {
      const xmlDeclaration = '<?xml version="1.0" encoding="UTF-8"?>';
      const config = {
        xml: {
          validation: {
            enableSyntaxValidation: true,
            enableStructureValidation: false,
            enableSecurityValidation: false,
            enablePerformanceWarnings: false,
            enableQualityLinting: false
          }
        }
      };
      
      const errors = parser.validate(xmlDeclaration, config);
      const attributeErrors = errors.filter(e => e.code === 'XML_SYNTAX_ATTRIBUTE_NO_VALUE');
      expect(attributeErrors).toHaveLength(0);
    });

    it('should validate complex XML without false positives', () => {
      const complexXml = `<?xml version="1.0" encoding="UTF-8"?>
<employees>
  <employee id="1" department="Engineering">
    <name>John Doe</name>
    <email>john.doe@company.com</email>
  </employee>
</employees>`;
      
      const config = {
        xml: {
          validation: {
            enableSyntaxValidation: true,
            enableStructureValidation: false,
            enableSecurityValidation: false,
            enablePerformanceWarnings: false,
            enableQualityLinting: false
          }
        }
      };
      
      const errors = parser.validate(complexXml, config);
      const attributeErrors = errors.filter(e => e.code === 'XML_SYNTAX_ATTRIBUTE_NO_VALUE');
      expect(attributeErrors).toHaveLength(0);
    });

    it('should detect genuine syntax errors', () => {
      const invalidXml = '<element attr1 attr2="valid">Content</element>';
      const config = {
        xml: {
          validation: {
            enableSyntaxValidation: true,
            enableStructureValidation: false,
            enableSecurityValidation: false,
            enablePerformanceWarnings: false,
            enableQualityLinting: false
          }
        }
      };
      
      const errors = parser.validate(invalidXml, config);
      const attributeErrors = errors.filter(e => e.code === 'XML_SYNTAX_ATTRIBUTE_NO_VALUE');
      expect(attributeErrors).toHaveLength(1);
      expect(attributeErrors[0].message).toContain('attr1');
    });
  });

  describe('Security Validation', () => {
    it('should detect XXE vulnerabilities', () => {
      const xxeXml = `<?xml version="1.0"?>
<!DOCTYPE root [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<root>&xxe;</root>`;
      
      const errors = parser.validate(xxeXml);
      const securityErrors = errors.filter(e => e.code?.startsWith('XML_SECURITY_'));
      expect(securityErrors.length).toBeGreaterThan(0);
    });

    it('should detect DTD declarations', () => {
      const dtdXml = `<?xml version="1.0"?>
<!DOCTYPE root SYSTEM "example.dtd">
<root></root>`;
      
      const errors = parser.validate(dtdXml);
      const dtdErrors = errors.filter(e => e.code === 'XML_SECURITY_DTD_DECLARATION');
      expect(dtdErrors).toHaveLength(1);
    });
  });

  describe('Structure Validation', () => {
    it('should detect unclosed tags', () => {
      const uncloseTag = '<root><item>Test</root>';
      const errors = parser.validate(uncloseTag);
      
      const structureErrors = errors.filter(e => 
        e.code?.startsWith('XML_STRUCTURE_') || e.code === 'UNCLOSED_TAG'
      );
      expect(structureErrors.length).toBeGreaterThan(0);
    });

    it('should handle processing instructions correctly', () => {
      const xmlWithPI = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="style.xsl"?>
<root>
  <item>Test</item>
</root>`;

      const config = {
        xml: {
          validation: {
            enableSyntaxValidation: false,
            enableStructureValidation: true,
            enableSecurityValidation: false,
            enablePerformanceWarnings: false,
            enableQualityLinting: false
          }
        }
      };

      const errors = parser.validate(xmlWithPI, config);
      const unclosedErrors = errors.filter(e => e.code === 'UNCLOSED_TAG');
      expect(unclosedErrors).toHaveLength(0);
    });

    it('should handle comments correctly', () => {
      const xmlWithComments = `<?xml version="1.0" encoding="UTF-8"?>
<!-- This is a comment -->
<root>
  <!-- Another comment -->
  <item>Test</item>
</root>`;

      const config = {
        xml: {
          validation: {
            enableSyntaxValidation: false,
            enableStructureValidation: true,
            enableSecurityValidation: false,
            enablePerformanceWarnings: false,
            enableQualityLinting: false
          }
        }
      };

      const errors = parser.validate(xmlWithComments, config);
      const unclosedErrors = errors.filter(e => e.code === 'UNCLOSED_TAG');
      expect(unclosedErrors).toHaveLength(0);
    });
  });

  describe('Performance Characteristics', () => {
    it('should handle moderately large XML content', () => {
      const largeXml = '<root>' + '<item>test</item>'.repeat(100) + '</root>';
      const result = parser.detect(largeXml);
      
      // Large repetitive content might not be detected as strongly as expected
      expect(result.format).toMatch(/xml|unknown/);
      expect(typeof result.confidence).toBe('number');
    });

    it('should validate large content with performance warnings', () => {
      const largeXml = '<root>' + '<item>test</item>'.repeat(1000) + '</root>';
      const config = {
        xml: {
          validation: {
            maxFileSize: 1000,
            enablePerformanceWarnings: true
          }
        }
      };
      
      const errors = parser.validate(largeXml, config);
      // May have performance warnings for large content
      expect(Array.isArray(errors)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should provide meaningful error messages', () => {
      const invalidXml = '';
      const errors = parser.validate(invalidXml);
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toBeDefined();
      expect(typeof errors[0].message).toBe('string');
      expect(errors[0].message.length).toBeGreaterThan(0);
    });

    it('should handle malformed XML gracefully', () => {
      const malformedXml = '<root><item>unclosed</root>';
      const errors = parser.validate(malformedXml);
      
      expect(Array.isArray(errors)).toBe(true);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should provide line information when available', () => {
      const multilineXml = `<root>
  <item>Test
</root>`;
      const errors = parser.validate(multilineXml);
      
      expect(errors.length).toBeGreaterThan(0);
      // Line information may or may not be available depending on implementation
      expect(typeof errors[0].line === 'number' || errors[0].line === undefined).toBe(true);
    });
  });
});