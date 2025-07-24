// Enterprise-grade XML parser with namespace support and DOM-like structure
import type { 
  FormatParser, 
  ParseResult, 
  ValidationError, 
  DetectionResult, 
  ParseMetadata,
  XmlDocument,
  XmlNode,
  XmlAttribute,
  XmlDeclaration,
  FormatParserConfig
} from '../../types/core.ts';

/**
 * Production-ready XML parser with comprehensive namespace support
 * Provides Java-like enterprise patterns with DOM-style tree structure
 */
export class XmlParser implements FormatParser<XmlDocument> {
  readonly name = 'XML';
  readonly extensions = ['xml', 'xsl', 'xslt', 'svg', 'xsd', 'wsdl'] as const;
  readonly mimeTypes = [
    'application/xml', 
    'text/xml', 
    'application/xhtml+xml',
    'image/svg+xml',
    'application/rss+xml',
    'application/atom+xml'
  ] as const;

  private readonly defaultConfig: Required<NonNullable<FormatParserConfig['xml']>> = {
    preserveWhitespace: false,
    validateStructure: true,
    resolveNamespaces: true,
    includeComments: false
  };

  // XML parsing state
  private content = '';
  private position = 0;
  private line = 1;
  private column = 1;
  private namespaces = new Map<string, string>();

  /**
   * Detect XML format with comprehensive structure analysis
   */
  detect(content: string): DetectionResult {
    const trimmed = content.trim();
    const evidence: string[] = [];
    let confidence = 0;

    if (!trimmed) {
      return { format: 'unknown', confidence: 0, evidence: ['Empty content'] };
    }

    // Primary XML indicators
    if (trimmed.startsWith('<?xml')) {
      confidence += 50;
      evidence.push('Contains XML declaration');
    }

    // XML-like tag structure
    const tagPattern = /<[^<>]+>/g;
    const tags = trimmed.match(tagPattern) || [];
    
    if (tags.length > 0) {
      confidence += Math.min(30, tags.length * 3);
      evidence.push(`Contains ${tags.length} XML-like tags`);
      
      // Check for well-formed tag pairs
      const wellFormedScore = this.analyzeTagStructure(trimmed);
      if (wellFormedScore > 0.5) {
        confidence += 20;
        evidence.push(`Well-formed tag structure (${Math.round(wellFormedScore * 100)}% matched)`);
      }
    }

    // Check for XML namespaces
    if (/xmlns[^=]*=/.test(trimmed)) {
      confidence += 15;
      evidence.push('Contains XML namespaces');
    }

    // Check for XML-specific patterns
    if (/<\?[^>]+\?>/.test(trimmed)) {
      confidence += 10;
      evidence.push('Contains processing instructions');
    }

    if (/<!\[CDATA\[/.test(trimmed)) {
      confidence += 10;
      evidence.push('Contains CDATA sections');
    }

    if (/<!--.*-->/.test(trimmed)) {
      confidence += 5;
      evidence.push('Contains XML comments');
    }

    // Negative indicators
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      confidence -= 30;
      evidence.push('Appears to be JSON');
    }

    // Check for common non-XML patterns
    if (/^[^<]*,\s*[^<]/.test(trimmed.split('\n')[0])) {
      confidence -= 20;
      evidence.push('First line appears to be CSV');
    }

    return {
      format: confidence > 50 ? 'xml' : 'unknown',
      confidence: Math.max(0, Math.min(100, confidence)),
      evidence
    };
  }

  /**
   * Parse XML content with comprehensive error handling and namespace resolution
   */
  parse(content: string, config?: FormatParserConfig): ParseResult<XmlDocument> {
    const startTime = performance.now();
    const fileSize = new Blob([content]).size;
    
    try {
      const xmlConfig = { ...this.defaultConfig, ...config?.xml };
      
      // Initialize parsing state
      this.content = content;
      this.position = 0;
      this.line = 1;
      this.column = 1;
      this.namespaces.clear();
      
      // Add default XML namespace
      this.namespaces.set('xml', 'http://www.w3.org/XML/1998/namespace');
      
      const validationErrors = this.validate(content);
      
      if (validationErrors.length > 0 && validationErrors.some(e => e.severity === 'error')) {
        return this.createFailedResult(validationErrors, startTime, fileSize);
      }

      const parseResult = this.parseDocument(xmlConfig);
      const parseTime = performance.now() - startTime;
      
      const metadata: ParseMetadata = {
        parseTime,
        fileSize,
        format: 'xml',
        confidence: 100
      };

      return {
        isValid: true,
        data: parseResult,
        errors: validationErrors, // Include warnings
        metadata
      };

    } catch (error) {
      const errors = this.extractErrorDetails(error);
      return this.createFailedResult(errors, startTime, fileSize);
    }
  }

  /**
   * Validate XML structure and syntax
   */
  validate(content: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const trimmed = content.trim();

    if (!trimmed) {
      errors.push({
        message: 'Content is empty',
        code: 'EMPTY_CONTENT',
        severity: 'error'
      });
      return errors;
    }

    // Basic XML structure validation
    const detection = this.detect(content);
    if (detection.confidence < 30) {
      errors.push({
        message: 'Content does not appear to be valid XML format',
        code: 'INVALID_XML_FORMAT',
        severity: 'error'
      });
    }

    // Check for well-formed XML
    const structureErrors = this.validateXmlStructure(content);
    errors.push(...structureErrors);

    return errors;
  }

  /**
   * Parse complete XML document
   */
  private parseDocument(config: Required<NonNullable<FormatParserConfig['xml']>>): XmlDocument {
    let declaration: XmlDeclaration | undefined;
    const processingInstructions: XmlNode[] = [];
    const comments: XmlNode[] = [];
    
    this.skipWhitespace();
    
    // Parse XML declaration
    if (this.peekString('<?xml')) {
      declaration = this.parseDeclaration();
      this.skipWhitespace();
    }
    
    // Parse processing instructions and comments before root
    while (this.position < this.content.length && !this.peekString('<', true)) {
      if (this.peekString('<?')) {
        processingInstructions.push(this.parseProcessingInstruction());
      } else if (this.peekString('<!--')) {
        const comment = this.parseComment();
        if (config.includeComments) {
          comments.push(comment);
        }
      } else {
        break;
      }
      this.skipWhitespace();
    }
    
    // Parse root element
    if (this.position >= this.content.length) {
      throw new Error('No root element found');
    }
    
    const root = this.parseElement(config);
    
    // Parse any trailing processing instructions or comments
    this.skipWhitespace();
    while (this.position < this.content.length) {
      if (this.peekString('<?')) {
        processingInstructions.push(this.parseProcessingInstruction());
      } else if (this.peekString('<!--')) {
        const comment = this.parseComment();
        if (config.includeComments) {
          comments.push(comment);
        }
      } else if (!this.isWhitespace(this.currentChar())) {
        throw new Error(`Unexpected content after root element: ${this.currentChar()}`);
      } else {
        this.advance();
      }
    }

    return {
      declaration,
      root,
      namespaces: new Map(this.namespaces),
      processingInstructions,
      comments
    };
  }

  /**
   * Parse XML declaration
   */
  private parseDeclaration(): XmlDeclaration {
    this.consume('<?xml');
    this.skipWhitespace();
    
    const attributes = this.parseAttributes();
    this.skipWhitespace();
    this.consume('?>');
    
    const version = attributes.find(attr => attr.name === 'version')?.value || '1.0';
    const encoding = attributes.find(attr => attr.name === 'encoding')?.value;
    const standaloneAttr = attributes.find(attr => attr.name === 'standalone')?.value;
    const standalone = standaloneAttr ? standaloneAttr === 'yes' : undefined;
    
    return { version, encoding, standalone };
  }

  /**
   * Parse XML element with full namespace support
   */
  private parseElement(config: Required<NonNullable<FormatParserConfig['xml']>>, parent?: XmlNode): XmlNode {
    
    this.consume('<');
    
    // Parse element name (with possible namespace prefix)
    const name = this.parseName();
    const { localName, prefix, namespace } = this.resolveNamespace(name);
    
    this.skipWhitespace();
    
    // Parse attributes
    const attributes = this.parseAttributes();
    
    // Process namespace declarations in attributes
    const localNamespaces = new Map(this.namespaces);
    for (const attr of attributes) {
      if (attr.name === 'xmlns' || attr.name.startsWith('xmlns:')) {
        const nsPrefix = attr.name === 'xmlns' ? '' : attr.name.substring(6);
        this.namespaces.set(nsPrefix, attr.value);
      }
    }
    
    this.skipWhitespace();
    
    // Check for self-closing tag
    if (this.peekString('/>')) {
      this.consume('/>');
      
      return {
        type: 'element',
        name: localName,
        prefix,
        namespace,
        attributes,
        children: [],
        parent
      };
    }
    
    this.consume('>');
    
    // Parse element content
    const children: XmlNode[] = [];
    let textContent = '';
    
    while (this.position < this.content.length) {
      if (this.peekString('</')) {
        // End tag found
        break;
      } else if (this.peekString('<![CDATA[')) {
        // CDATA section
        const cdata = this.parseCDATA();
        children.push(cdata);
      } else if (this.peekString('<!--')) {
        // Comment
        const comment = this.parseComment();
        if (config.includeComments) {
          children.push(comment);
        }
      } else if (this.peekString('<?')) {
        // Processing instruction
        children.push(this.parseProcessingInstruction());
      } else if (this.peekString('<')) {
        // Child element
        if (textContent.trim() || config.preserveWhitespace) {
          // Add accumulated text as text node
          children.push({
            type: 'text',
            name: '#text',
            value: textContent,
            attributes: [],
            children: [],
            parent: undefined // Will be set after creation
          });
        }
        textContent = '';
        
        const childElement = this.parseElement(config);
        children.push(childElement);
      } else {
        // Text content
        textContent += this.currentChar();
        this.advance();
      }
    }
    
    // Add any remaining text content
    if (textContent.trim() || config.preserveWhitespace) {
      children.push({
        type: 'text',
        name: '#text',
        value: textContent,
        attributes: [],
        children: [],
        parent: undefined
      });
    }
    
    // Parse end tag
    this.consume('</');
    const endName = this.parseName();
    if (endName !== name) {
      throw new Error(`Mismatched end tag: expected </${name}> but found </${endName}>`);
    }
    this.skipWhitespace();
    this.consume('>');
    
    // Create element node
    const element: XmlNode = {
      type: 'element',
      name: localName,
      prefix,
      namespace,
      attributes,
      children,
      parent
    };
    
    // Set parent references
    children.forEach(child => {
      (child as any).parent = element;
    });
    
    // Restore namespace context
    this.namespaces = localNamespaces;
    
    return element;
  }

  /**
   * Parse XML attributes
   */
  private parseAttributes(): XmlAttribute[] {
    const attributes: XmlAttribute[] = [];
    
    while (this.position < this.content.length && !this.peekString('>') && !this.peekString('/>')) {
      this.skipWhitespace();
      
      if (this.peekString('>') || this.peekString('/>')) {
        break;
      }
      
      // Parse attribute name
      const name = this.parseName();
      const { localName, prefix, namespace } = this.resolveNamespace(name);
      
      this.skipWhitespace();
      this.consume('=');
      this.skipWhitespace();
      
      // Parse attribute value
      const quote = this.currentChar();
      if (quote !== '"' && quote !== "'") {
        throw new Error(`Expected quote character for attribute value, found: ${quote}`);
      }
      
      this.advance(); // Skip opening quote
      let value = '';
      
      while (this.position < this.content.length && this.currentChar() !== quote) {
        if (this.currentChar() === '&') {
          value += this.parseEntityReference();
        } else {
          value += this.currentChar();
          this.advance();
        }
      }
      
      this.consume(quote);
      
      attributes.push({
        name: localName,
        value,
        prefix,
        namespace
      });
    }
    
    return attributes;
  }

  /**
   * Parse CDATA section
   */
  private parseCDATA(): XmlNode {
    this.consume('<![CDATA[');
    let value = '';
    
    while (this.position < this.content.length && !this.peekString(']]>')) {
      value += this.currentChar();
      this.advance();
    }
    
    this.consume(']]>');
    
    return {
      type: 'cdata',
      name: '#cdata',
      value,
      attributes: [],
      children: [],
      parent: undefined
    };
  }

  /**
   * Parse XML comment
   */
  private parseComment(): XmlNode {
    this.consume('<!--');
    let value = '';
    
    while (this.position < this.content.length && !this.peekString('-->')) {
      value += this.currentChar();
      this.advance();
    }
    
    this.consume('-->');
    
    return {
      type: 'comment',
      name: '#comment',
      value,
      attributes: [],
      children: [],
      parent: undefined
    };
  }

  /**
   * Parse processing instruction
   */
  private parseProcessingInstruction(): XmlNode {
    this.consume('<?');
    
    const name = this.parseName();
    this.skipWhitespace();
    
    let value = '';
    while (this.position < this.content.length && !this.peekString('?>')) {
      value += this.currentChar();
      this.advance();
    }
    
    this.consume('?>');
    
    return {
      type: 'processing-instruction',
      name,
      value: value.trim(),
      attributes: [],
      children: [],
      parent: undefined
    };
  }

  /**
   * Parse entity reference
   */
  private parseEntityReference(): string {
    this.consume('&');
    let entity = '';
    
    while (this.position < this.content.length && this.currentChar() !== ';') {
      entity += this.currentChar();
      this.advance();
    }
    
    this.consume(';');
    
    // Resolve built-in entities
    const entities: { [key: string]: string } = {
      'lt': '<',
      'gt': '>',
      'amp': '&',
      'quot': '"',
      'apos': "'"
    };
    
    if (entity in entities) {
      return entities[entity];
    }
    
    // Handle numeric character references
    if (entity.startsWith('#')) {
      const code = entity.startsWith('#x') 
        ? parseInt(entity.substring(2), 16)
        : parseInt(entity.substring(1), 10);
      
      if (!isNaN(code)) {
        return String.fromCharCode(code);
      }
    }
    
    // Return as-is if unrecognized (could be custom entity)
    return `&${entity};`;
  }

  /**
   * Resolve namespace for element or attribute name
   */
  private resolveNamespace(name: string): { localName: string; prefix?: string; namespace?: string } {
    const colonIndex = name.indexOf(':');
    
    if (colonIndex === -1) {
      // No prefix, use default namespace
      const namespace = this.namespaces.get('');
      return { localName: name, namespace };
    }
    
    const prefix = name.substring(0, colonIndex);
    const localName = name.substring(colonIndex + 1);
    const namespace = this.namespaces.get(prefix);
    
    return { localName, prefix, namespace };
  }

  // Utility parsing methods

  private parseName(): string {
    let name = '';
    
    if (!this.isNameStartChar(this.currentChar())) {
      throw new Error(`Invalid name start character: ${this.currentChar()}`);
    }
    
    while (this.position < this.content.length && this.isNameChar(this.currentChar())) {
      name += this.currentChar();
      this.advance();
    }
    
    return name;
  }

  private isNameStartChar(char: string): boolean {
    return /[a-zA-Z_:]/.test(char);
  }

  private isNameChar(char: string): boolean {
    return /[a-zA-Z0-9._:-]/.test(char);
  }

  private skipWhitespace(): void {
    while (this.position < this.content.length && this.isWhitespace(this.currentChar())) {
      this.advance();
    }
  }

  private isWhitespace(char: string): boolean {
    return /[\s\t\n\r]/.test(char);
  }

  private currentChar(): string {
    return this.position < this.content.length ? this.content[this.position] : '';
  }

  private peekString(str: string, elementOnly = false): boolean {
    if (elementOnly && str === '<') {
      // For element detection, ensure it's not a comment or PI
      return this.content.substring(this.position, this.position + str.length) === str &&
             !this.content.substring(this.position, this.position + 4).match(/^<!--/) &&
             !this.content.substring(this.position, this.position + 2).match(/^<\?/);
    }
    
    return this.content.substring(this.position, this.position + str.length) === str;
  }

  private consume(expected: string): void {
    if (!this.peekString(expected)) {
      throw new Error(`Expected '${expected}' at line ${this.line}, column ${this.column}, but found '${this.currentChar()}'`);
    }
    
    for (let i = 0; i < expected.length; i++) {
      this.advance();
    }
  }

  private advance(): void {
    if (this.position < this.content.length) {
      if (this.content[this.position] === '\n') {
        this.line++;
        this.column = 1;
      } else {
        this.column++;
      }
      this.position++;
    }
  }

  // Analysis and validation methods

  private analyzeTagStructure(content: string): number {
    const openTags: string[] = [];
    const tagPattern = /<\/?([^>\s]+)[^>]*>/g;
    let match;
    let totalTags = 0;
    let matchedTags = 0;
    
    while ((match = tagPattern.exec(content)) !== null) {
      const tagName = match[1];
      totalTags++;
      
      if (match[0].startsWith('</')) {
        // Closing tag
        const lastOpen = openTags.pop();
        if (lastOpen === tagName) {
          matchedTags += 2; // Count both opening and closing
        }
      } else if (!match[0].endsWith('/>')) {
        // Opening tag (not self-closing)
        openTags.push(tagName);
      } else {
        // Self-closing tag
        matchedTags++;
      }
    }
    
    return totalTags > 0 ? matchedTags / totalTags : 0;
  }

  private validateXmlStructure(content: string): ValidationError[] {
    const errors: ValidationError[] = [];
    
    try {
      // Quick structural validation
      let openTags: Array<{ name: string; line: number }> = [];
      const lines = content.split('\n');
      
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        const tagPattern = /<\/?([^>\s\/]+)[^>]*\/?>/g;
        let match;
        
        while ((match = tagPattern.exec(line)) !== null) {
          const tagName = match[1];
          const fullMatch = match[0];
          
          if (fullMatch.startsWith('</')) {
            // Closing tag
            if (openTags.length === 0) {
              errors.push({
                message: `Unexpected closing tag: </${tagName}>`,
                line: lineIndex + 1,
                column: match.index + 1,
                code: 'UNEXPECTED_CLOSING_TAG',
                severity: 'error'
              });
            } else {
              const lastOpen = openTags.pop()!;
              if (lastOpen.name !== tagName) {
                errors.push({
                  message: `Mismatched closing tag: expected </${lastOpen.name}> but found </${tagName}>`,
                  line: lineIndex + 1,
                  column: match.index + 1,
                  code: 'MISMATCHED_CLOSING_TAG',
                  severity: 'error'
                });
              }
            }
          } else if (!fullMatch.endsWith('/>')) {
            // Opening tag (not self-closing)
            openTags.push({ name: tagName, line: lineIndex + 1 });
          }
        }
      }
      
      // Check for unclosed tags
      for (const openTag of openTags) {
        errors.push({
          message: `Unclosed tag: <${openTag.name}>`,
          line: openTag.line,
          code: 'UNCLOSED_TAG',
          severity: 'error'
        });
      }
      
    } catch (error) {
      errors.push({
        message: `Structure validation failed: ${error instanceof Error ? error.message : String(error)}`,
        code: 'STRUCTURE_VALIDATION_ERROR',
        severity: 'error'
      });
    }
    
    return errors;
  }

  private extractErrorDetails(error: any): ValidationError[] {
    const message = error instanceof Error ? error.message : String(error);
    
    return [{
      message,
      line: this.line,
      column: this.column,
      code: 'XML_PARSE_ERROR',
      severity: 'error'
    }];
  }

  private createFailedResult(errors: ValidationError[], startTime: number, fileSize: number): ParseResult<XmlDocument> {
    const parseTime = performance.now() - startTime;
    const metadata: ParseMetadata = {
      parseTime,
      fileSize,
      format: 'xml',
      confidence: 0
    };

    return {
      isValid: false,
      data: null,
      errors,
      metadata
    };
  }
}