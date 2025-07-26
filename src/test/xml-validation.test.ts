import { describe, it, expect } from 'vitest';
import { XmlParser } from '../core/formatters/XmlParser';

describe('XML Parser Validation', () => {
  const parser = new XmlParser();

  describe('Basic Validation', () => {
    it('should validate empty content', () => {
      const errors = parser.validate('');
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('XML_EMPTY_CONTENT');
      expect(errors[0].severity).toBe('error');
    });

    it('should validate valid XML without errors', () => {
      const validXml = `<?xml version="1.0" encoding="UTF-8"?>
<root xmlns="http://example.com">
  <item id="1">Hello</item>
  <item id="2">World</item>
</root>`;
      
      // Use minimal config to avoid all optional validations
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

  describe('Syntax Validation', () => {
    it('should detect unclosed quotes', () => {
      const invalidQuoteXml = `<root id="unclosed>Test</root>`;
      
      const errors = parser.validate(invalidQuoteXml);
      const syntaxErrors = errors.filter(e => e.code?.startsWith('XML_SYNTAX_'));
      expect(syntaxErrors.length).toBeGreaterThan(0);
    });

    it('should detect malformed comments', () => {
      const malformedComment = `<root><!- Invalid comment --></root>`;
      
      const errors = parser.validate(malformedComment);
      const commentErrors = errors.filter(e => e.code === 'XML_SYNTAX_MALFORMED_COMMENT');
      expect(commentErrors).toHaveLength(1);
    });

    it('should NOT flag XML declarations as attribute errors (false positive fix)', () => {
      const xmlDeclaration = `<?xml version="1.0" encoding="UTF-8"?>`;
      
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

    it('should NOT flag elements with multiple valid attributes (false positive fix)', () => {
      const multiAttributeXml = `<employee id="1" department="Engineering">Test</employee>`;
      
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
      
      const errors = parser.validate(multiAttributeXml, config);
      const attributeErrors = errors.filter(e => e.code === 'XML_SYNTAX_ATTRIBUTE_NO_VALUE');
      expect(attributeErrors).toHaveLength(0);
    });

    it('should NOT flag valid XML from screenshot scenario', () => {
      const screenshotXml = `<?xml version="1.0" encoding="UTF-8"?>
<employees>
  <employee id="1" department="Engineering">
    <name>John Doe</name>
    <email>john.doe@company.com</email>
    <age>28</age>
  </employee>
  <employee id="2" department="Marketing">
    <name>Jane Smith</name>
    <email>jane.smith@company.com</email>
    <age>32</age>
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
      
      const errors = parser.validate(screenshotXml, config);
      const attributeErrors = errors.filter(e => e.code === 'XML_SYNTAX_ATTRIBUTE_NO_VALUE');
      expect(attributeErrors).toHaveLength(0);
    });

    it('should STILL detect genuine attribute syntax errors', () => {
      const invalidAttributeXml = `<element attr1 attr2="valid">Content</element>`;
      
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
      
      const errors = parser.validate(invalidAttributeXml, config);
      const attributeErrors = errors.filter(e => e.code === 'XML_SYNTAX_ATTRIBUTE_NO_VALUE');
      expect(attributeErrors).toHaveLength(1);
      expect(attributeErrors[0].message).toContain('attr1');
    });

    it('should detect unquoted attribute values', () => {
      const unquotedAttributeXml = `<element attr=value>Content</element>`;
      
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
      
      const errors = parser.validate(unquotedAttributeXml, config);
      const unquotedErrors = errors.filter(e => e.code === 'XML_SYNTAX_ATTRIBUTE_UNQUOTED');
      expect(unquotedErrors).toHaveLength(1);
    });

    it('should handle self-closing tags with attributes correctly', () => {
      const selfClosingXml = `<input type="text" name="username" />`;
      
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
      
      const errors = parser.validate(selfClosingXml, config);
      const attributeErrors = errors.filter(e => e.code === 'XML_SYNTAX_ATTRIBUTE_NO_VALUE');
      expect(attributeErrors).toHaveLength(0);
    });

    it('should handle namespaced attributes correctly', () => {
      const namespacedXml = `<element xmlns:ns="http://example.com" ns:attr="value">Content</element>`;
      
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
      
      const errors = parser.validate(namespacedXml, config);
      const attributeErrors = errors.filter(e => e.code === 'XML_SYNTAX_ATTRIBUTE_NO_VALUE');
      expect(attributeErrors).toHaveLength(0);
    });
  });

  describe('Structure Validation', () => {
    it('should detect unclosed tags', () => {
      const uncloseTag = `<root><item>Test</root>`;
      
      const errors = parser.validate(uncloseTag);
      const structureErrors = errors.filter(e => e.code?.startsWith('XML_STRUCTURE_') || e.code === 'UNCLOSED_TAG');
      expect(structureErrors.length).toBeGreaterThan(0);
    });

    it('should detect missing XML declaration when required', () => {
      const noDeclaration = `<root><item>Test</item></root>`;
      
      const config = {
        xml: {
          validation: {
            requireXmlDeclaration: true
          }
        }
      };
      
      const errors = parser.validate(noDeclaration, config);
      const declarationErrors = errors.filter(e => e.code === 'XML_STRUCTURE_MISSING_DECLARATION');
      expect(declarationErrors).toHaveLength(1);
    });

    it('should NOT flag XML processing instructions as unclosed tags', () => {
      const xmlWithDeclaration = `<?xml version="1.0" encoding="UTF-8"?>
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

      const errors = parser.validate(xmlWithDeclaration, config);
      const unclosedErrors = errors.filter(e => e.code === 'UNCLOSED_TAG');
      expect(unclosedErrors).toHaveLength(0);
    });

    it('should handle multiple processing instructions correctly', () => {
      const xmlWithMultiplePI = `<?xml version="1.0" encoding="UTF-8"?>
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

      const errors = parser.validate(xmlWithMultiplePI, config);
      const unclosedErrors = errors.filter(e => e.code === 'UNCLOSED_TAG');
      expect(unclosedErrors).toHaveLength(0);
    });

    it('should handle XML comments in structure validation', () => {
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

    it('should handle DOCTYPE declarations correctly', () => {
      const xmlWithDoctype = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE root SYSTEM "example.dtd">
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

      const errors = parser.validate(xmlWithDoctype, config);
      const unclosedErrors = errors.filter(e => e.code === 'UNCLOSED_TAG');
      expect(unclosedErrors).toHaveLength(0);
    });

    it('should handle CDATA sections correctly', () => {
      const xmlWithCdata = `<?xml version="1.0" encoding="UTF-8"?>
<root>
  <content><![CDATA[Some <b>bold</b> text]]></content>
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

      const errors = parser.validate(xmlWithCdata, config);
      const unclosedErrors = errors.filter(e => e.code === 'UNCLOSED_TAG');
      expect(unclosedErrors).toHaveLength(0);
    });

    it('should fix the exact screenshot scenario - no structure errors', () => {
      const screenshotXml = `<?xml version="1.0" encoding="UTF-8"?>
<employees>
  <employee id="1" department="Engineering">
    <name>John Doe</name>
    <email>john.doe@company.com</email>
    <age>28</age>
  </employee>
  <employee id="2" department="Marketing">
    <name>Jane Smith</name>
    <email>jane.smith@company.com</email>
    <age>32</age>
  </employee>
</employees>`;

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

      const errors = parser.validate(screenshotXml, config);
      const structureErrors = errors.filter(e => 
        e.code === 'UNCLOSED_TAG' || 
        e.code === 'MISMATCHED_CLOSING_TAG' || 
        e.code === 'UNEXPECTED_CLOSING_TAG'
      );
      expect(structureErrors).toHaveLength(0);
    });
  });

  describe('Performance Validation', () => {
    it('should warn about large files', () => {
      const largeContent = '<root>' + 'a'.repeat(10000) + '</root>';
      
      const config = {
        xml: {
          validation: {
            maxFileSize: 1000,
            enablePerformanceWarnings: true
          }
        }
      };
      
      const errors = parser.validate(largeContent, config);
      const perfErrors = errors.filter(e => e.code?.startsWith('XML_PERFORMANCE_'));
      expect(perfErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Quality Validation', () => {
    it('should suggest improvements for empty elements', () => {
      const emptyElements = `<root><empty></empty><another></another></root>`;
      
      const config = {
        xml: {
          validation: {
            enableQualityLinting: true
          }
        }
      };
      
      const errors = parser.validate(emptyElements, config);
      const qualityErrors = errors.filter(e => e.code === 'XML_QUALITY_EMPTY_ELEMENTS');
      expect(qualityErrors).toHaveLength(1);
    });

    it('should check naming conventions', () => {
      const badNaming = `<root><BAD_NAME>Test</BAD_NAME><bad__name>Test</bad__name></root>`;
      
      const config = {
        xml: {
          validation: {
            enableQualityLinting: true,
            checkNamingConventions: true
          }
        }
      };
      
      const errors = parser.validate(badNaming, config);
      const namingErrors = errors.filter(e => e.code === 'XML_QUALITY_NAMING_CONVENTION');
      expect(namingErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Validation Profiles', () => {
    it('should use strict profile correctly', () => {
      const xml = `<root><item>Test</item></root>`;
      
      const strictConfig = {
        xml: {
          validation: {
            enableSyntaxValidation: true,
            enableStructureValidation: true,
            enableSecurityValidation: true,
            enablePerformanceWarnings: true,
            enableQualityLinting: true,
            requireXmlDeclaration: true
          }
        }
      };
      
      const errors = parser.validate(xml, strictConfig);
      const declarationErrors = errors.filter(e => e.code === 'XML_STRUCTURE_MISSING_DECLARATION');
      expect(declarationErrors).toHaveLength(1);
    });

    it('should use lenient profile correctly', () => {
      const xml = `<root><item>Test</item></root>`;
      
      const lenientConfig = {
        xml: {
          validation: {
            enableSyntaxValidation: true,
            enableStructureValidation: false,
            enableSecurityValidation: false,
            enablePerformanceWarnings: false,
            enableQualityLinting: false,
            requireXmlDeclaration: false
          }
        }
      };
      
      const errors = parser.validate(xml, lenientConfig);
      const nonSyntaxErrors = errors.filter(e => !e.code?.startsWith('XML_SYNTAX_') && e.code !== 'XML_INVALID_FORMAT');
      expect(nonSyntaxErrors).toHaveLength(0);
    });
  });
});