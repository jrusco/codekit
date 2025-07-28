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
  FormatParserConfig,
  XmlValidationConfig,
  XmlValidationProfile
} from '../../types/core.ts';
import { SecurityManager, SecurityError } from '../security/SecurityManager.js';

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

  private readonly validationProfiles: Record<XmlValidationProfile, XmlValidationConfig> = {
    strict: {
      enableSyntaxValidation: true,
      enableStructureValidation: true,
      enableSecurityValidation: true,
      enablePerformanceWarnings: true,
      enableQualityLinting: true,
      maxFileSize: 1024 * 1024, // 1MB
      maxNestingDepth: 20,
      maxAttributeCount: 50,
      maxEntityExpansions: 100,
      checkXxeRisks: true,
      validateNamespaces: true,
      requireXmlDeclaration: true,
      warnOnMissingNamespaces: true,
      checkNamingConventions: true,
      validateDtdDeclarations: true,
      maxTextContentLength: 10000
    },
    lenient: {
      enableSyntaxValidation: true,
      enableStructureValidation: false,
      enableSecurityValidation: false,
      enablePerformanceWarnings: false,
      enableQualityLinting: false,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxNestingDepth: 100,
      maxAttributeCount: 200,
      maxEntityExpansions: 1000,
      checkXxeRisks: false,
      validateNamespaces: false,
      requireXmlDeclaration: false,
      warnOnMissingNamespaces: false,
      checkNamingConventions: false,
      validateDtdDeclarations: false,
      maxTextContentLength: 100000
    },
    'security-focused': {
      enableSyntaxValidation: true,
      enableStructureValidation: true,
      enableSecurityValidation: true,
      enablePerformanceWarnings: false,
      enableQualityLinting: false,
      maxFileSize: 512 * 1024, // 512KB
      maxNestingDepth: 10,
      maxAttributeCount: 20,
      maxEntityExpansions: 10,
      checkXxeRisks: true,
      validateNamespaces: true,
      requireXmlDeclaration: true,
      warnOnMissingNamespaces: false,
      checkNamingConventions: false,
      validateDtdDeclarations: true,
      maxTextContentLength: 5000
    },
    'performance-focused': {
      enableSyntaxValidation: true,
      enableStructureValidation: false,
      enableSecurityValidation: false,
      enablePerformanceWarnings: true,
      enableQualityLinting: false,
      maxFileSize: 5 * 1024 * 1024, // 5MB
      maxNestingDepth: 50,
      maxAttributeCount: 100,
      maxEntityExpansions: 500,
      checkXxeRisks: false,
      validateNamespaces: false,
      requireXmlDeclaration: false,
      warnOnMissingNamespaces: false,
      checkNamingConventions: false,
      validateDtdDeclarations: false,
      maxTextContentLength: 50000
    },
    custom: {
      enableSyntaxValidation: true,
      enableStructureValidation: true,
      enableSecurityValidation: true,
      enablePerformanceWarnings: true,
      enableQualityLinting: true,
      maxFileSize: 2 * 1024 * 1024, // 2MB
      maxNestingDepth: 30,
      maxAttributeCount: 75,
      maxEntityExpansions: 200,
      checkXxeRisks: true,
      validateNamespaces: true,
      requireXmlDeclaration: false,
      warnOnMissingNamespaces: true,
      checkNamingConventions: true,
      validateDtdDeclarations: true,
      maxTextContentLength: 20000
    }
  };

  private readonly defaultConfig: Required<NonNullable<FormatParserConfig['xml']>> = {
    preserveWhitespace: false,
    validateStructure: true,
    resolveNamespaces: true,
    includeComments: false,
    validation: this.getDefaultValidationConfig()
  };

  /**
   * Get default validation configuration (custom profile)
   */
  private getDefaultValidationConfig(): XmlValidationConfig {
    return this.validationProfiles.custom;
  }

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
    const securityManager = SecurityManager.getInstance();
    
    try {
      // Security validation - sanitize input before processing
      const sanitizedContent = securityManager.sanitizeInput(content, 'xml');
      
      if (sanitizedContent !== content) {
        console.warn('XML input was sanitized for security reasons');
      }
      
      content = sanitizedContent;
    } catch (securityError) {
      if (securityError instanceof SecurityError) {
        const userFriendlyError = securityManager.sanitizeErrorMessage(securityError);
        return {
          isValid: false,
          data: { 
            declaration: undefined, 
            root: { type: 'element', name: 'error', value: undefined, attributes: [], children: [], namespace: undefined, prefix: undefined }, 
            processingInstructions: [], 
            comments: [],
            namespaces: new Map()
          },
          errors: [{
            message: userFriendlyError.message,
            line: 1,
            column: 1,
            code: 'SECURITY_ERROR',
            severity: 'error' as const,
            type: 'security'
          }],
          metadata: {
            parseTime: performance.now() - startTime,
            fileSize: new Blob([content]).size,
            format: 'xml',
            confidence: 0
          }
        };
      }
      throw securityError;
    }
    
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
      
      const validationErrors = this.validate(content, config);
      
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
   * Comprehensive XML validation with configurable rules
   * Enterprise-grade validation following security and performance best practices
   */
  validate(content: string, config?: FormatParserConfig): ValidationError[] {
    const errors: ValidationError[] = [];
    const trimmed = content.trim();
    
    // Get validation configuration
    const xmlConfig = { ...this.defaultConfig, ...config?.xml };
    const validationConfig = { ...this.getDefaultValidationConfig(), ...xmlConfig.validation };

    // 1. Basic content validation
    if (!trimmed) {
      errors.push({
        message: 'Content is empty',
        code: 'XML_EMPTY_CONTENT',
        severity: 'error'
      });
      return errors;
    }

    // 2. Performance validation
    if (validationConfig.enablePerformanceWarnings) {
      errors.push(...this.validatePerformance(content, validationConfig));
    }

    // 3. Format detection validation
    const detection = this.detect(content);
    if (detection.confidence < 30) {
      errors.push({
        message: 'Content does not appear to be valid XML format',
        code: 'XML_INVALID_FORMAT',
        severity: 'error'
      });
    }

    // 4. Security validation
    if (validationConfig.enableSecurityValidation) {
      errors.push(...this.validateSecurity(content, validationConfig));
    }

    // 5. Syntax validation
    if (validationConfig.enableSyntaxValidation) {
      errors.push(...this.validateSyntax(content, validationConfig));
    }

    // 6. Structure validation
    if (validationConfig.enableStructureValidation) {
      errors.push(...this.validateStructure(content, validationConfig));
    }

    // 7. Quality linting
    if (validationConfig.enableQualityLinting) {
      errors.push(...this.validateQuality(content, validationConfig));
    }

    return errors;
  }

  /**
   * Validate XML performance characteristics
   */
  private validatePerformance(content: string, config: XmlValidationConfig): ValidationError[] {
    const errors: ValidationError[] = [];
    const fileSize = new Blob([content]).size;

    // File size validation
    if (fileSize > config.maxFileSize) {
      errors.push({
        message: `File size ${Math.round(fileSize / 1024)}KB exceeds maximum allowed size ${Math.round(config.maxFileSize / 1024)}KB`,
        code: 'XML_PERFORMANCE_FILE_SIZE',
        severity: 'warning'
      });
    }

    // Line count validation
    const lineCount = content.split('\n').length;
    if (lineCount > 10000) {
      errors.push({
        message: `File contains ${lineCount} lines, which may impact performance`,
        code: 'XML_PERFORMANCE_LINE_COUNT',
        severity: 'info'
      });
    }

    return errors;
  }

  /**
   * Validate XML security risks (XXE, DTD, etc.)
   */
  private validateSecurity(content: string, config: XmlValidationConfig): ValidationError[] {
    const errors: ValidationError[] = [];

    if (config.checkXxeRisks) {
      // Check for external entity declarations
      if (/<!ENTITY\s+\w+\s+SYSTEM/.test(content)) {
        errors.push({
          message: 'External entity declaration detected - potential XXE vulnerability',
          code: 'XML_SECURITY_XXE_RISK',
          severity: 'error'
        });
      }

      // Check for parameter entity declarations
      if (/<!ENTITY\s+%/.test(content)) {
        errors.push({
          message: 'Parameter entity declaration detected - potential XXE vulnerability',
          code: 'XML_SECURITY_PARAMETER_ENTITY',
          severity: 'error'
        });
      }
    }

    if (config.validateDtdDeclarations) {
      // Check for DTD declarations
      if (/<!DOCTYPE/.test(content)) {
        errors.push({
          message: 'DTD declaration found - consider removing for security',
          code: 'XML_SECURITY_DTD_DECLARATION',
          severity: 'warning'
        });
      }
    }

    // Check for excessive entity references
    const entityRefs = (content.match(/&\w+;/g) || []).length;
    if (entityRefs > config.maxEntityExpansions) {
      errors.push({
        message: `Found ${entityRefs} entity references, exceeds limit of ${config.maxEntityExpansions}`,
        code: 'XML_SECURITY_EXCESSIVE_ENTITIES',
        severity: 'warning'
      });
    }

    return errors;
  }

  /**
   * Validate XML syntax
   */
  private validateSyntax(content: string, _config: XmlValidationConfig): ValidationError[] {
    const errors: ValidationError[] = [];
    const lines = content.split('\n');

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const lineNumber = lineIndex + 1;

      // Check for unclosed quotes in attributes
      const quotes = line.match(/["']/g) || [];
      if (quotes.length % 2 !== 0) {
        const lastQuoteIndex = line.lastIndexOf(quotes[quotes.length - 1]);
        errors.push({
          message: 'Unclosed quote in attribute value',
          line: lineNumber,
          column: lastQuoteIndex + 1,
          code: 'XML_SYNTAX_UNCLOSED_QUOTE',
          severity: 'error'
        });
      }

      // Enhanced attribute validation using proper XML parsing
      const attributeErrors = this.validateLineAttributes(line, lineNumber);
      errors.push(...attributeErrors);

      // Check for malformed comments
      if (line.includes('<!-') && !line.includes('<!--')) {
        errors.push({
          message: 'Malformed comment syntax',
          line: lineNumber,
          code: 'XML_SYNTAX_MALFORMED_COMMENT',
          severity: 'error'
        });
      }
    }

    return errors;
  }

  /**
   * Validate XML attributes on a single line with proper XML parsing
   * Avoids false positives by correctly handling processing instructions and multi-attribute elements
   */
  private validateLineAttributes(line: string, lineNumber: number): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Extract XML tags from the line, excluding comments and CDATA
    const tagPattern = /<[^!?][^>]*>/g;
    let match;
    
    while ((match = tagPattern.exec(line)) !== null) {
      const tag = match[0];
      const tagStartColumn = match.index + 1;
      
      // Skip closing tags and self-closing tags without attributes
      if (tag.startsWith('</') || tag === '</>') {
        continue;
      }
      
      // Extract tag content (everything between < and >)
      const tagContent = tag.slice(1, -1);
      
      // Skip if it's a self-closing tag with just the tag name
      if (tagContent.endsWith('/') && !tagContent.includes(' ')) {
        continue;
      }
      
      // Parse the tag to find the element name and attributes
      const spaceIndex = tagContent.search(/\s/);
      if (spaceIndex === -1) {
        // No attributes, skip
        continue;
      }
      
      // Extract the attributes portion
      const attributesPortion = tagContent.substring(spaceIndex + 1);
      const attributeErrors = this.validateElementAttributes(attributesPortion, lineNumber, tagStartColumn + spaceIndex + 1);
      errors.push(...attributeErrors);
    }
    
    return errors;
  }

  /**
   * Validate attributes within an XML element
   * Uses a mini-parser approach similar to the main parseAttributes method
   */
  private validateElementAttributes(attributesText: string, lineNumber: number, startColumn: number): ValidationError[] {
    const errors: ValidationError[] = [];
    let position = 0;
    let column = startColumn;
    
    const advance = () => {
      if (position < attributesText.length) {
        if (attributesText[position] === '\n') {
          column = 1;
        } else {
          column++;
        }
        position++;
      }
    };
    
    const skipWhitespace = () => {
      while (position < attributesText.length && /\s/.test(attributesText[position])) {
        advance();
      }
    };
    
    const isNameChar = (char: string) => /[a-zA-Z0-9._:-]/.test(char);
    const isNameStartChar = (char: string) => /[a-zA-Z_:]/.test(char);
    
    // Remove trailing slash if it's a self-closing tag
    const cleanAttributesText = attributesText.replace(/\s*\/\s*$/, '').trim();
    
    position = 0;
    column = startColumn;
    
    while (position < cleanAttributesText.length) {
      skipWhitespace();
      
      if (position >= cleanAttributesText.length) {
        break;
      }
      
      // Parse attribute name
      const nameStartCol = column;
      
      if (!isNameStartChar(cleanAttributesText[position])) {
        errors.push({
          message: 'Invalid attribute name start character',
          line: lineNumber,
          column: column,
          code: 'XML_SYNTAX_INVALID_ATTRIBUTE_NAME',
          severity: 'error'
        });
        break;
      }
      
      // Read attribute name
      let attributeName = '';
      while (position < cleanAttributesText.length && isNameChar(cleanAttributesText[position])) {
        attributeName += cleanAttributesText[position];
        advance();
      }
      
      skipWhitespace();
      
      // Check for equals sign
      if (position >= cleanAttributesText.length || cleanAttributesText[position] !== '=') {
        errors.push({
          message: `Attribute '${attributeName}' without value detected`,
          line: lineNumber,
          column: nameStartCol,
          code: 'XML_SYNTAX_ATTRIBUTE_NO_VALUE',
          severity: 'error'
        });
        break;
      }
      
      advance(); // Skip '='
      skipWhitespace();
      
      // Check for quote
      if (position >= cleanAttributesText.length) {
        errors.push({
          message: `Attribute '${attributeName}' missing value`,
          line: lineNumber,
          column: column,
          code: 'XML_SYNTAX_ATTRIBUTE_MISSING_VALUE',
          severity: 'error'
        });
        break;
      }
      
      const quote = cleanAttributesText[position];
      if (quote !== '"' && quote !== "'") {
        errors.push({
          message: `Attribute '${attributeName}' value must be quoted`,
          line: lineNumber,
          column: column,
          code: 'XML_SYNTAX_ATTRIBUTE_UNQUOTED',
          severity: 'error'
        });
        break;
      }
      
      advance(); // Skip opening quote
      
      // Find closing quote
      let foundClosingQuote = false;
      while (position < cleanAttributesText.length) {
        if (cleanAttributesText[position] === quote) {
          foundClosingQuote = true;
          advance(); // Skip closing quote
          break;
        }
        advance();
      }
      
      if (!foundClosingQuote) {
        errors.push({
          message: `Attribute '${attributeName}' has unclosed quote`,
          line: lineNumber,
          column: column,
          code: 'XML_SYNTAX_ATTRIBUTE_UNCLOSED_QUOTE',
          severity: 'error'
        });
        break;
      }
    }
    
    return errors;
  }

  /**
   * Validate XML structure (enhanced version of existing method)
   */
  private validateStructure(content: string, config: XmlValidationConfig): ValidationError[] {
    const errors: ValidationError[] = [];

    // Use existing structure validation as base
    const baseErrors = this.validateXmlStructure(content);
    errors.push(...baseErrors);

    // Additional structure validation
    if (config.requireXmlDeclaration && !content.trim().startsWith('<?xml')) {
      errors.push({
        message: 'Missing XML declaration',
        line: 1,
        column: 1,
        code: 'XML_STRUCTURE_MISSING_DECLARATION',
        severity: 'warning'
      });
    }

    // Check nesting depth
    const nestingDepth = this.calculateNestingDepth(content);
    if (nestingDepth > config.maxNestingDepth) {
      errors.push({
        message: `Nesting depth ${nestingDepth} exceeds maximum allowed depth ${config.maxNestingDepth}`,
        code: 'XML_STRUCTURE_EXCESSIVE_NESTING',
        severity: 'warning'
      });
    }

    // Validate namespaces if enabled
    if (config.validateNamespaces) {
      errors.push(...this.validateNamespaces(content, config));
    }

    return errors;
  }

  /**
   * Validate XML quality and best practices
   */
  private validateQuality(content: string, config: XmlValidationConfig): ValidationError[] {
    const errors: ValidationError[] = [];

    if (config.checkNamingConventions) {
      // Check element naming conventions
      const elementNames = content.match(/<([a-zA-Z][^>\s\/]*)/g) || [];
      for (const match of elementNames) {
        const elementName = match.substring(1);
        if (!/^[a-z][a-zA-Z0-9-]*$/.test(elementName) && !/^[A-Z][a-zA-Z0-9]*$/.test(elementName)) {
          errors.push({
            message: `Element name '${elementName}' doesn't follow naming conventions (camelCase or kebab-case)`,
            code: 'XML_QUALITY_NAMING_CONVENTION',
            severity: 'info'
          });
        }
      }
    }

    // Check for empty elements that could be self-closing
    const emptyElements = content.match(/<(\w+)[^>]*><\/\1>/g) || [];
    if (emptyElements.length > 0) {
      errors.push({
        message: `Found ${emptyElements.length} empty elements that could be self-closing`,
        code: 'XML_QUALITY_EMPTY_ELEMENTS',
        severity: 'info'
      });
    }

    // Check for excessive attributes
    const elementsWithManyAttrs = content.match(/<\w+(?:\s+\w+="[^"]*"){10,}[^>]*>/g) || [];
    if (elementsWithManyAttrs.length > 0) {
      errors.push({
        message: `Found elements with many attributes - consider nested elements`,
        code: 'XML_QUALITY_EXCESSIVE_ATTRIBUTES',
        severity: 'info'
      });
    }

    return errors;
  }

  /**
   * Calculate maximum nesting depth in XML
   */
  private calculateNestingDepth(content: string): number {
    let maxDepth = 0;
    let currentDepth = 0;
    const tagPattern = /<\/?([^>\s\/]+)[^>]*>/g;
    let match;

    while ((match = tagPattern.exec(content)) !== null) {
      const fullMatch = match[0];

      if (fullMatch.startsWith('</')) {
        // Closing tag
        currentDepth = Math.max(0, currentDepth - 1);
      } else if (!fullMatch.endsWith('/>')) {
        // Opening tag (not self-closing)
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      }
    }

    return maxDepth;
  }

  /**
   * Validate XML namespaces
   */
  private validateNamespaces(content: string, config: XmlValidationConfig): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check for undefined namespace prefixes
    const prefixPattern = /<(\w+):(\w+)/g;
    const definedNamespaces = new Set<string>();
    const usedPrefixes = new Set<string>();

    // Find namespace declarations
    const nsDeclarations = content.match(/xmlns:(\w+)="[^"]*"/g) || [];
    for (const decl of nsDeclarations) {
      const prefix = decl.match(/xmlns:(\w+)=/)?.[1];
      if (prefix) {
        definedNamespaces.add(prefix);
      }
    }

    // Find used prefixes
    let match;
    while ((match = prefixPattern.exec(content)) !== null) {
      const prefix = match[1];
      usedPrefixes.add(prefix);
    }

    // Check for undefined prefixes
    for (const prefix of usedPrefixes) {
      if (!definedNamespaces.has(prefix) && prefix !== 'xml') {
        errors.push({
          message: `Undefined namespace prefix: ${prefix}`,
          code: 'XML_STRUCTURE_UNDEFINED_PREFIX',
          severity: 'error'
        });
      }
    }

    // Warn about missing namespaces if configured
    if (config.warnOnMissingNamespaces && definedNamespaces.size === 0 && usedPrefixes.size === 0) {
      errors.push({
        message: 'No namespaces declared - consider using namespaces for better XML structure',
        code: 'XML_QUALITY_NO_NAMESPACES',
        severity: 'info'
      });
    }

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
        // Updated regex to exclude processing instructions (?), comments (!), and other XML constructs
        const tagPattern = /<\/?([^!?][^>\s\/]*)[^>]*\/?>/g;
        let match;
        
        while ((match = tagPattern.exec(line)) !== null) {
          const tagName = match[1];
          const fullMatch = match[0];
          
          // Skip processing instructions explicitly
          if (fullMatch.startsWith('<?') && fullMatch.endsWith('?>')) {
            continue; // Skip processing instructions like <?xml ... ?>
          }
          
          // Skip comments
          if (fullMatch.startsWith('<!--') && fullMatch.endsWith('-->')) {
            continue; // Skip XML comments
          }
          
          // Skip CDATA sections
          if (fullMatch.startsWith('<![CDATA[') && fullMatch.endsWith(']]>')) {
            continue; // Skip CDATA sections
          }
          
          // Skip DOCTYPE declarations
          if (fullMatch.startsWith('<!DOCTYPE')) {
            continue; // Skip DOCTYPE declarations
          }
          
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