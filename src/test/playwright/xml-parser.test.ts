import { test, expect } from '@playwright/test';

// Comprehensive XML Parser Testing Suite
// Enterprise-grade test coverage with DOM-like structure validation
test.describe('XmlParser - Comprehensive Testing', () => {
  let XmlParser: any;
  
  test.beforeAll(async ({ page }) => {
    await page.goto('/');
    
    await page.waitForFunction(() => {
      return typeof window !== 'undefined';
    });
    
    XmlParser = await page.evaluate(() => {
      return new Promise(async (resolve) => {
        try {
          const module = await import('/src/core/formatters/XmlParser.ts');
          resolve(module.XmlParser);
        } catch (error) {
          console.error('Failed to import XmlParser:', error);
          resolve(null);
        }
      });
    });
  });

  test.describe('Happy Path Tests - Basic XML Parsing', () => {
    test('should parse simple XML document', async ({ page }) => {
      const result = await page.evaluate((XmlParserClass) => {
        const parser = new XmlParserClass();
        const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<root>
  <name>John</name>
  <age>25</age>
  <city>New York</city>
</root>`;
        return parser.parse(xmlContent);
      }, XmlParser);

      expect(result.isValid).toBe(true);
      expect(result.data.declaration.version).toBe('1.0');
      expect(result.data.declaration.encoding).toBe('UTF-8');
      expect(result.data.root.name).toBe('root');
      expect(result.data.root.children).toHaveLength(3);
      expect(result.data.root.children[0].name).toBe('name');
      expect(result.data.root.children[0].children[0].value).toContain('John');
    });

    test('should parse XML with attributes', async ({ page }) => {
      const result = await page.evaluate((XmlParserClass) => {
        const parser = new XmlParserClass();
        const xmlContent = `<user id="123" active="true" role="admin">
  <name first="John" last="Doe">John Doe</name>
  <email verified="false">john@example.com</email>
</user>`;
        return parser.parse(xmlContent);
      }, XmlParser);

      expect(result.isValid).toBe(true);
      expect(result.data.root.attributes).toHaveLength(3);
      expect(result.data.root.attributes[0].name).toBe('id');
      expect(result.data.root.attributes[0].value).toBe('123');
      expect(result.data.root.attributes[1].name).toBe('active');
      expect(result.data.root.attributes[1].value).toBe('true');
      
      const nameElement = result.data.root.children[0];
      expect(nameElement.attributes).toHaveLength(2);
      expect(nameElement.attributes[0].name).toBe('first');
      expect(nameElement.attributes[0].value).toBe('John');
    });

    test('should handle self-closing tags', async ({ page }) => {
      const result = await page.evaluate((XmlParserClass) => {
        const parser = new XmlParserClass();
        const xmlContent = `<document>
  <meta name="author" content="John Doe"/>
  <meta name="date" content="2023-01-15"/>
  <br/>
  <img src="image.jpg" alt="Test Image"/>
</document>`;
        return parser.parse(xmlContent);
      }, XmlParser);

      expect(result.isValid).toBe(true);
      expect(result.data.root.children).toHaveLength(4);
      expect(result.data.root.children[0].children).toHaveLength(0); // Self-closing
      expect(result.data.root.children[0].attributes[0].name).toBe('name');
      expect(result.data.root.children[0].attributes[1].name).toBe('content');
    });

    test('should parse nested XML structures', async ({ page }) => {
      const result = await page.evaluate((XmlParserClass) => {
        const parser = new XmlParserClass();
        const xmlContent = `<company>
  <department name="Engineering">
    <employees>
      <employee id="1">
        <name>Alice</name>
        <position>Senior Developer</position>
        <skills>
          <skill level="expert">JavaScript</skill>
          <skill level="intermediate">Python</skill>
        </skills>
      </employee>
      <employee id="2">
        <name>Bob</name>
        <position>Junior Developer</position>
      </employee>
    </employees>
  </department>
</company>`;
        return parser.parse(xmlContent);
      }, XmlParser);

      expect(result.isValid).toBe(true);
      const department = result.data.root.children[0];
      expect(department.name).toBe('department');
      expect(department.attributes[0].value).toBe('Engineering');
      
      const employees = department.children[0];
      expect(employees.children).toHaveLength(2); // Two employees
      
      const firstEmployee = employees.children[0];
      expect(firstEmployee.attributes[0].value).toBe('1');
      expect(firstEmployee.children[2].name).toBe('skills'); // Skills element
      expect(firstEmployee.children[2].children).toHaveLength(2); // Two skills
    });

    test('should handle XML namespaces', async ({ page }) => {
      const result = await page.evaluate((XmlParserClass) => {
        const parser = new XmlParserClass();
        const xmlContent = `<?xml version="1.0"?>
<root xmlns:app="http://example.com/app" xmlns:data="http://example.com/data">
  <app:config>
    <app:setting name="debug">true</app:setting>
  </app:config>
  <data:records>
    <data:record id="1">Test</data:record>
  </data:records>
</root>`;
        return parser.parse(xmlContent);
      }, XmlParser);

      expect(result.isValid).toBe(true);
      expect(result.data.namespaces.get('app')).toBe('http://example.com/app');
      expect(result.data.namespaces.get('data')).toBe('http://example.com/data');
      
      const configElement = result.data.root.children[0];
      expect(configElement.name).toBe('config');
      expect(configElement.prefix).toBe('app');
      expect(configElement.namespace).toBe('http://example.com/app');
    });
  });

  test.describe('Format Detection Tests', () => {
    test('should detect XML format with high confidence', async ({ page }) => {
      const result = await page.evaluate((XmlParserClass) => {
        const parser = new XmlParserClass();
        return parser.detect('<?xml version="1.0"?><root><item>test</item></root>');
      }, XmlParser);

      expect(result.format).toBe('xml');
      expect(result.confidence).toBeGreaterThan(80);
      expect(result.evidence.some(e => e.includes('XML declaration'))).toBe(true);
    });

    test('should detect XML without declaration', async ({ page }) => {
      const result = await page.evaluate((XmlParserClass) => {
        const parser = new XmlParserClass();
        return parser.detect('<books><book id="1">Title</book></books>');
      }, XmlParser);

      expect(result.format).toBe('xml');
      expect(result.confidence).toBeGreaterThan(50);
      expect(result.evidence.some(e => e.includes('XML-like tags'))).toBe(true);
    });

    test('should detect XML-specific constructs', async ({ page }) => {
      const testCases = [
        { 
          content: '<?xml version="1.0"?><root/>', 
          evidence: 'XML declaration' 
        },
        { 
          content: '<root xmlns="http://example.com"><item/></root>', 
          evidence: 'XML namespaces' 
        },
        { 
          content: '<root><!-- comment --><item/></root>', 
          evidence: 'XML comments' 
        },
        { 
          content: '<root><![CDATA[Some data]]></root>', 
          evidence: 'CDATA sections' 
        },
        { 
          content: '<?xml version="1.0"?><?pi target?><root/>', 
          evidence: 'processing instructions' 
        },
      ];

      for (const testCase of testCases) {
        const result = await page.evaluate(({ XmlParserClass, content }) => {
          const parser = new XmlParserClass();
          return parser.detect(content);
        }, { XmlParserClass: XmlParser, content: testCase.content });

        expect(result.format).toBe('xml');
        expect(result.evidence.some(e => e.toLowerCase().includes(testCase.evidence.toLowerCase()))).toBe(true);
      }
    });

    test('should reject non-XML content', async ({ page }) => {
      const testCases = [
        '{"json": "object"}',
        'Name,Age,City\nJohn,25,NYC',
        'plain text content',
        'HTML but not <div>valid</div> XML',
      ];

      for (const content of testCases) {
        const result = await page.evaluate(({ XmlParserClass, testContent }) => {
          const parser = new XmlParserClass();
          return parser.detect(testContent);
        }, { XmlParserClass: XmlParser, testContent: content });

        expect(result.confidence).toBeLessThan(50);
      }
    });
  });

  test.describe('Advanced XML Features', () => {
    test('should parse CDATA sections correctly', async ({ page }) => {
      const result = await page.evaluate((XmlParserClass) => {
        const parser = new XmlParserClass();
        const xmlContent = `<document>
  <code><![CDATA[
    function test() {
      return "<xml>not parsed</xml>";
    }
  ]]></code>
  <description><![CDATA[Contains <, >, & and "quotes"]]></description>
</document>`;
        return parser.parse(xmlContent);
      }, XmlParser);

      expect(result.isValid).toBe(true);
      const codeElement = result.data.root.children[0];
      expect(codeElement.children[0].type).toBe('cdata');
      expect(codeElement.children[0].value).toContain('function test()');
      expect(codeElement.children[0].value).toContain('<xml>not parsed</xml>');
    });

    test('should parse XML comments when configured', async ({ page }) => {
      const result = await page.evaluate((XmlParserClass) => {
        const parser = new XmlParserClass();
        const xmlContent = `<!-- Document header -->
<root>
  <!-- This is a comment -->
  <item>value</item>
  <!-- Another comment -->
</root>
<!-- Document footer -->`;
        const config = { xml: { includeComments: true } };
        return parser.parse(xmlContent, config);
      }, XmlParser);

      expect(result.isValid).toBe(true);
      expect(result.data.comments).toHaveLength(2); // Header and footer comments
      expect(result.data.root.children.some(child => child.type === 'comment')).toBe(true);
    });

    test('should parse processing instructions', async ({ page }) => {
      const result = await page.evaluate((XmlParserClass) => {
        const parser = new XmlParserClass();
        const xmlContent = `<?xml version="1.0"?>
<?xml-stylesheet type="text/xsl" href="style.xsl"?>
<?custom-pi some data?>
<root>
  <?processing-instruction data="value"?>
  <item>content</item>
</root>
<?end-pi?>`;
        return parser.parse(xmlContent);
      }, XmlParser);

      expect(result.isValid).toBe(true);
      expect(result.data.processingInstructions.length).toBeGreaterThan(0);
      expect(result.data.processingInstructions[0].name).toBe('xml-stylesheet');
      expect(result.data.processingInstructions[0].value).toContain('type="text/xsl"');
    });

    test('should handle entity references', async ({ page }) => {
      const result = await page.evaluate((XmlParserClass) => {
        const parser = new XmlParserClass();
        const xmlContent = `<document>
  <text>Tom &amp; Jerry show &lt;script&gt; &quot;quoted&quot; &#39;text&#39;</text>
  <special>Unicode: &#8364; &#x20AC;</special>
</document>`;
        return parser.parse(xmlContent);
      }, XmlParser);

      expect(result.isValid).toBe(true);
      const textContent = result.data.root.children[0].children[0].value;
      expect(textContent).toContain('Tom & Jerry');
      expect(textContent).toContain('<script>');
      expect(textContent).toContain('"quoted"');
      expect(textContent).toContain("'text'");
      
      const specialContent = result.data.root.children[1].children[0].value;
      expect(specialContent).toContain('€'); // Unicode euro symbol
    });

    test('should preserve or trim whitespace based on configuration', async ({ page }) => {
      const xmlContent = `<root>
  <item>  spaced content  </item>
  <empty>   </empty>
</root>`;

      // Test with whitespace preservation
      const result1 = await page.evaluate(({ XmlParserClass, content }) => {
        const parser = new XmlParserClass();
        const config = { xml: { preserveWhitespace: true } };
        return parser.parse(content, config);
      }, { XmlParserClass: XmlParser, content: xmlContent });

      expect(result1.isValid).toBe(true);
      const item1 = result1.data.root.children.find((child: any) => child.name === 'item');
      expect(item1.children[0].value).toBe('  spaced content  ');

      // Test without whitespace preservation (default)
      const result2 = await page.evaluate(({ XmlParserClass, content }) => {
        const parser = new XmlParserClass();
        return parser.parse(content);
      }, { XmlParserClass: XmlParser, content: xmlContent });

      expect(result2.isValid).toBe(true);
      const item2 = result2.data.root.children.find((child: any) => child.name === 'item');
      expect(item2.children[0].value.trim()).toBe('spaced content');
    });
  });

  test.describe('Error Handling and Validation', () => {
    test('should handle empty content gracefully', async ({ page }) => {
      const result = await page.evaluate((XmlParserClass) => {
        const parser = new XmlParserClass();
        return parser.parse('');
      }, XmlParser);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('EMPTY_CONTENT');
    });

    test('should detect unclosed tags', async ({ page }) => {
      const result = await page.evaluate((XmlParserClass) => {
        const parser = new XmlParserClass();
        return parser.validate('<root><item>content</root>'); // Missing </item>
      }, XmlParser);

      expect(result.some(error => error.code === 'UNCLOSED_TAG')).toBe(true);
    });

    test('should detect mismatched closing tags', async ({ page }) => {
      const result = await page.evaluate((XmlParserClass) => {
        const parser = new XmlParserClass();
        return parser.validate('<root><item>content</other></root>');
      }, XmlParser);

      expect(result.some(error => error.code === 'MISMATCHED_CLOSING_TAG')).toBe(true);
    });

    test('should detect unexpected closing tags', async ({ page }) => {
      const result = await page.evaluate((XmlParserClass) => {
        const parser = new XmlParserClass();
        return parser.validate('<root></item></root>'); // No opening <item>
      }, XmlParser);

      expect(result.some(error => error.code === 'UNEXPECTED_CLOSING_TAG')).toBe(true);
    });

    test('should provide line and column information for errors', async ({ page }) => {
      const result = await page.evaluate((XmlParserClass) => {
        const parser = new XmlParserClass();
        const xmlContent = `<root>
  <item>content
  <other>more content</other>
</root>`; // Missing </item> on line 2
        return parser.validate(xmlContent);
      }, XmlParser);

      expect(result.length).toBeGreaterThan(0);
      const error = result.find(e => e.code === 'UNCLOSED_TAG');
      expect(error.line).toBe(2); // Error on line 2
    });

    test('should handle malformed XML gracefully', async ({ page }) => {
      const testCases = [
        '<root><item attr="unclosed string></item></root>',
        '<root><item>content with & unescaped</item></root>',
        '<root><123invalid>content</123invalid></root>', // Invalid tag name
        '<root><item att r="spaced attribute">content</item></root>',
      ];

      for (const xmlContent of testCases) {
        const result = await page.evaluate(({ XmlParserClass, content }) => {
          const parser = new XmlParserClass();
          return parser.parse(content);
        }, { XmlParserClass: XmlParser, content: xmlContent });

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Performance and Large Document Tests', () => {
    test('should handle large XML documents efficiently', async ({ page }) => {
      const result = await page.evaluate((XmlParserClass) => {
        const parser = new XmlParserClass();
        
        // Generate large XML document
        let xmlContent = '<?xml version="1.0"?><root>';
        for (let i = 1; i <= 1000; i++) {
          xmlContent += `<item id="${i}">
            <name>Item ${i}</name>
            <value>${Math.random() * 1000}</value>
            <active>${i % 2 === 0}</active>
          </item>`;
        }
        xmlContent += '</root>';
        
        const startTime = performance.now();
        const parseResult = parser.parse(xmlContent);
        const endTime = performance.now();
        
        return {
          ...parseResult,
          testMetrics: {
            parseTime: endTime - startTime,
            inputSize: xmlContent.length,
            nodeCount: parseResult.data?.root?.children?.length || 0
          }
        };
      }, XmlParser);

      expect(result.isValid).toBe(true);
      expect(result.testMetrics.nodeCount).toBe(1000);
      expect(result.testMetrics.parseTime).toBeLessThan(3000); // Should parse within 3 seconds
      expect(result.data.root.children[999].attributes[0].value).toBe('1000');
    });

    test('should handle deeply nested XML structures', async ({ page }) => {
      const result = await page.evaluate((XmlParserClass) => {
        const parser = new XmlParserClass();
        
        // Create deeply nested structure
        let xmlContent = '<root>';
        for (let i = 0; i < 50; i++) {
          xmlContent += `<level${i}>`;
        }
        xmlContent += '<deepest>content</deepest>';
        for (let i = 49; i >= 0; i--) {
          xmlContent += `</level${i}>`;
        }
        xmlContent += '</root>';
        
        return parser.parse(xmlContent);
      }, XmlParser);

      expect(result.isValid).toBe(true);
      
      // Navigate to deepest level
      let current = result.data.root;
      for (let i = 0; i < 50; i++) {
        expect(current.name).toBe(i === 0 ? 'root' : `level${i - 1}`);
        current = current.children[0];
      }
      expect(current.name).toBe('deepest');
      expect(current.children[0].value).toContain('content');
    });
  });

  test.describe('Unicode and International Support', () => {
    test('should handle Unicode content correctly', async ({ page }) => {
      const result = await page.evaluate((XmlParserClass) => {
        const parser = new XmlParserClass();
        const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<document>
  <chinese>你好世界</chinese>
  <arabic>مرحبا بالعالم</arabic>
  <emoji>🌍🚀✨</emoji>
  <mixed>Hello 世界 🌟</mixed>
</document>`;
        return parser.parse(xmlContent);
      }, XmlParser);

      expect(result.isValid).toBe(true);
      const children = result.data.root.children;
      expect(children[0].children[0].value).toContain('你好世界');
      expect(children[1].children[0].value).toContain('مرحبا بالعالم');
      expect(children[2].children[0].value).toContain('🌍🚀✨');
      expect(children[3].children[0].value).toContain('Hello 世界 🌟');
    });

    test('should handle different encoding declarations', async ({ page }) => {
      const testCases = [
        { encoding: 'UTF-8', expected: 'UTF-8' },
        { encoding: 'utf-8', expected: 'utf-8' },
        { encoding: 'ISO-8859-1', expected: 'ISO-8859-1' },
      ];

      for (const testCase of testCases) {
        const result = await page.evaluate(({ XmlParserClass, encoding }) => {
          const parser = new XmlParserClass();
          const xmlContent = `<?xml version="1.0" encoding="${encoding}"?><root>test</root>`;
          return parser.parse(xmlContent);
        }, { XmlParserClass: XmlParser, encoding: testCase.encoding });

        expect(result.isValid).toBe(true);
        expect(result.data.declaration.encoding).toBe(testCase.expected);
      }
    });
  });

  test.describe('Validation Method Tests', () => {
    test('should validate well-formed XML without errors', async ({ page }) => {
      const result = await page.evaluate((XmlParserClass) => {
        const parser = new XmlParserClass();
        return parser.validate('<?xml version="1.0"?><root><item>content</item></root>');
      }, XmlParser);

      expect(result).toHaveLength(0);
    });

    test('should detect structural issues comprehensively', async ({ page }) => {
      const testCases = [
        { 
          input: '<root><item>unclosed</root>', 
          expectedCode: 'UNCLOSED_TAG',
          description: 'unclosed tag' 
        },
        { 
          input: '<root><item>content</other></root>', 
          expectedCode: 'MISMATCHED_CLOSING_TAG',
          description: 'mismatched closing tags' 
        },
        { 
          input: '<root></item></root>', 
          expectedCode: 'UNEXPECTED_CLOSING_TAG',
          description: 'unexpected closing tag' 
        },
      ];

      for (const testCase of testCases) {
        const result = await page.evaluate(({ XmlParserClass, input }) => {
          const parser = new XmlParserClass();
          return parser.validate(input);
        }, { XmlParserClass: XmlParser, input: testCase.input });

        expect(result.some(error => error.code === testCase.expectedCode)).toBe(true);
      }
    });

    test('should provide helpful error context', async ({ page }) => {
      const result = await page.evaluate((XmlParserClass) => {
        const parser = new XmlParserClass();
        const xmlContent = `<root>
  <item id="1">
    <name>Test</name>
  </other>
</root>`;
        return parser.validate(xmlContent);
      }, XmlParser);

      expect(result.length).toBeGreaterThan(0);
      const error = result[0];
      expect(error.line).toBeGreaterThan(0);
      expect(error.column).toBeGreaterThan(0);
      expect(error.message).toContain('item');
      expect(error.message).toContain('other');
    });
  });

  test.describe('Configuration and Customization', () => {
    test('should respect namespace resolution configuration', async ({ page }) => {
      const xmlContent = `<root xmlns:app="http://example.com">
  <app:config>
    <app:setting>value</app:setting>
  </app:config>
</root>`;

      // Test with namespace resolution enabled (default)
      const result1 = await page.evaluate(({ XmlParserClass, content }) => {
        const parser = new XmlParserClass();
        const config = { xml: { resolveNamespaces: true } };
        return parser.parse(content, config);
      }, { XmlParserClass: XmlParser, content: xmlContent });

      expect(result1.data.root.children[0].namespace).toBe('http://example.com');

      // Test with namespace resolution disabled
      const result2 = await page.evaluate(({ XmlParserClass, content }) => {
        const parser = new XmlParserClass();
        const config = { xml: { resolveNamespaces: false } };
        return parser.parse(content, config);
      }, { XmlParserClass: XmlParser, content: xmlContent });

      expect(result2.isValid).toBe(true);
    });

    test('should respect structure validation configuration', async ({ page }) => {
      const invalidXml = '<root><item>unclosed</root>';

      // Test with validation enabled (default)
      const result1 = await page.evaluate(({ XmlParserClass, xml }) => {
        const parser = new XmlParserClass();
        const config = { xml: { validateStructure: true } };
        return parser.parse(xml, config);
      }, { XmlParserClass: XmlParser, xml: invalidXml });

      expect(result1.isValid).toBe(false);

      // Test with validation disabled (would still fail at parse level)
      const result2 = await page.evaluate(({ XmlParserClass, xml }) => {
        const parser = new XmlParserClass();
        const config = { xml: { validateStructure: false } };
        return parser.parse(xml, config);
      }, { XmlParserClass: XmlParser, xml: invalidXml });

      expect(result2.isValid).toBe(false); // Still fails due to parse error
    });

    test('should handle comment inclusion configuration', async ({ page }) => {
      const xmlContent = `<root>
  <!-- This is a comment -->
  <item>content</item>
  <!-- Another comment -->
</root>`;

      // Test with comments included
      const result1 = await page.evaluate(({ XmlParserClass, content }) => {
        const parser = new XmlParserClass();
        const config = { xml: { includeComments: true } };
        return parser.parse(content, config);
      }, { XmlParserClass: XmlParser, content: xmlContent });

      expect(result1.data.root.children.some((child: any) => child.type === 'comment')).toBe(true);

      // Test with comments excluded (default)
      const result2 = await page.evaluate(({ XmlParserClass, content }) => {
        const parser = new XmlParserClass();
        const config = { xml: { includeComments: false } };
        return parser.parse(content, config);
      }, { XmlParserClass: XmlParser, content: xmlContent });

      expect(result2.data.root.children.every((child: any) => child.type !== 'comment')).toBe(true);
    });
  });

  test.describe('DOM-like Tree Structure', () => {
    test('should maintain proper parent-child relationships', async ({ page }) => {
      const result = await page.evaluate((XmlParserClass) => {
        const parser = new XmlParserClass();
        const xmlContent = `<root>
  <parent>
    <child id="1">Content 1</child>
    <child id="2">Content 2</child>
  </parent>
</root>`;
        return parser.parse(xmlContent);
      }, XmlParser);

      expect(result.isValid).toBe(true);
      const parent = result.data.root.children[0];
      const firstChild = parent.children[0];
      const secondChild = parent.children[1];

      expect(firstChild.parent).toBeDefined();
      expect(firstChild.parent.name).toBe('parent');
      expect(secondChild.parent).toBeDefined();
      expect(secondChild.parent.name).toBe('parent');
    });

    test('should provide accurate node type information', async ({ page }) => {
      const result = await page.evaluate((XmlParserClass) => {
        const parser = new XmlParserClass();
        const xmlContent = `<root>
  <!-- Comment -->
  <element>Text content</element>
  <![CDATA[CDATA content]]>
  <?pi Processing instruction?>
</root>`;
        const config = { xml: { includeComments: true } };
        return parser.parse(xmlContent, config);
      }, XmlParser);

      expect(result.isValid).toBe(true);
      const children = result.data.root.children;
      
      expect(children.some((child: any) => child.type === 'comment')).toBe(true);
      expect(children.some((child: any) => child.type === 'element')).toBe(true);
      expect(children.some((child: any) => child.type === 'cdata')).toBe(true);
      expect(children.some((child: any) => child.type === 'processing-instruction')).toBe(true);
    });
  });
});