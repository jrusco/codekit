// Advanced JSON parser with superior error reporting - exceeds JSON.pub capabilities
import type { FormatParser, ParseResult, ValidationError, DetectionResult, ParseMetadata } from '../../types/core.ts';

/**
 * JSON validation rule configuration
 */
export interface JsonValidationConfig {
  readonly enableSchemaValidation: boolean;
  readonly enableBestPractices: boolean;
  readonly enablePerformanceLinting: boolean;
  readonly enableSecurityLinting: boolean;
  readonly maxNestingDepth: number;
  readonly maxPropertyNameLength: number;
  readonly maxArrayLength: number;
  readonly maxObjectProperties: number;
  readonly warnOnLargeNumbers: boolean;
  readonly strictPropertyNaming: boolean;
}

/**
 * Validation rule severity levels
 */
export type ValidationProfile = 'strict' | 'lenient' | 'custom';

/**
 * Default validation configurations
 */
const VALIDATION_PROFILES: Record<ValidationProfile, JsonValidationConfig> = {
  strict: {
    enableSchemaValidation: true,
    enableBestPractices: true,
    enablePerformanceLinting: true,
    enableSecurityLinting: true,
    maxNestingDepth: 10,
    maxPropertyNameLength: 50,
    maxArrayLength: 10000,
    maxObjectProperties: 1000,
    warnOnLargeNumbers: true,
    strictPropertyNaming: true
  },
  lenient: {
    enableSchemaValidation: false,
    enableBestPractices: false,
    enablePerformanceLinting: true,
    enableSecurityLinting: true,
    maxNestingDepth: 50,
    maxPropertyNameLength: 100,
    maxArrayLength: 100000,
    maxObjectProperties: 10000,
    warnOnLargeNumbers: false,
    strictPropertyNaming: false
  },
  custom: {
    enableSchemaValidation: true,
    enableBestPractices: true,
    enablePerformanceLinting: true,
    enableSecurityLinting: true,
    maxNestingDepth: 20,
    maxPropertyNameLength: 75,
    maxArrayLength: 50000,
    maxObjectProperties: 5000,
    warnOnLargeNumbers: true,
    strictPropertyNaming: false
  }
};

/**
 * Enterprise-grade JSON parser with detailed error reporting and performance optimization
 * Provides Java-like structured error handling with immutable results
 */
export class JsonParser implements FormatParser<any> {
  readonly name = 'JSON';
  readonly extensions = ['json'] as const;
  readonly mimeTypes = ['application/json', 'text/json'] as const;
  
  private config: JsonValidationConfig;
  
  constructor(profile: ValidationProfile = 'custom', customConfig?: Partial<JsonValidationConfig>) {
    // Ensure backward compatibility - if no parameters provided, use sensible defaults
    this.config = customConfig 
      ? { ...VALIDATION_PROFILES[profile], ...customConfig }
      : VALIDATION_PROFILES[profile];
  }
  
  /**
   * Update validation configuration
   */
  setValidationConfig(profile: ValidationProfile, customConfig?: Partial<JsonValidationConfig>): void {
    this.config = customConfig 
      ? { ...VALIDATION_PROFILES[profile], ...customConfig }
      : VALIDATION_PROFILES[profile];
  }
  
  /**
   * Get current validation configuration
   */
  getValidationConfig(): JsonValidationConfig {
    return { ...this.config };
  }

  /**
   * Detect JSON format with confidence scoring
   * Similar to Spring's content type detection
   */
  detect(content: string): DetectionResult {
    const trimmed = content.trim();
    const evidence: string[] = [];
    let confidence = 0;

    // Early empty check
    if (!trimmed) {
      return { format: 'unknown', confidence: 0, evidence: ['Empty content'] };
    }

    // Primary JSON indicators - like regex validation in Java
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      confidence += 40;
      evidence.push('Valid JSON wrapper structure');
    }

    // Secondary validation - key-value patterns
    if (/"[^"]*"\s*:\s*/.test(trimmed)) {
      confidence += 30;
      evidence.push('Contains key-value pairs');
    }

    // String value patterns
    if (/"[^"]*"/.test(trimmed)) {
      confidence += 15;
      evidence.push('Contains quoted strings');
    }

    // JSON-specific syntax
    if (trimmed.includes('null') || trimmed.includes('true') || trimmed.includes('false')) {
      confidence += 10;
      evidence.push('Contains JSON literals');
    }

    // Negative indicators - like validation constraints
    if (/^\s*</.test(trimmed)) {
      confidence -= 50;
      evidence.push('Appears to be XML/HTML');
    }

    return {
      format: confidence > 50 ? 'json' : 'unknown',
      confidence: Math.max(0, Math.min(100, confidence)),
      evidence
    };
  }

  /**
   * Parse JSON with comprehensive error reporting
   * Returns immutable result similar to Java Optional pattern
   */
  parse(content: string): ParseResult<any> {
    const startTime = performance.now();
    const fileSize = new Blob([content]).size;
    
    try {
      // Pre-validation for better error messages
      const validationErrors = this.validate(content);
      
      // Only block parsing on actual syntax errors, not warnings/info
      const blockingErrors = validationErrors.filter(error => error.severity === 'error');
      
      if (blockingErrors.length > 0) {
        return this.createFailedResult(validationErrors, startTime, fileSize);
      }

      // Attempt parsing with enhanced error context
      const data = this.parseWithContext(content);
      
      const parseTime = performance.now() - startTime;
      const metadata: ParseMetadata = {
        parseTime,
        fileSize,
        format: 'json',
        confidence: 100
      };

      return {
        isValid: true,
        data,
        errors: validationErrors, // Include non-blocking warnings/info in result
        metadata
      };

    } catch (error) {
      const errors = this.extractErrorDetails(error, content);
      return this.createFailedResult(errors, startTime, fileSize);
    }
  }

  /**
   * Validate JSON structure without parsing
   * Enhanced with comprehensive linting rules
   * Similar to Bean Validation in Spring
   */
  validate(content: string): ValidationError[] {
    const startTime = performance.now();
    const errors: ValidationError[] = [];
    const trimmed = content.trim();

    // Empty content validation
    if (!trimmed) {
      errors.push({
        message: 'Content is empty',
        code: 'EMPTY_CONTENT',
        severity: 'error'
      });
      return errors;
    }

    // Basic structure validation
    if (!this.hasValidStructure(trimmed)) {
      errors.push({
        message: 'Invalid JSON structure - must start with { or [',
        line: 1,
        column: 1,
        code: 'INVALID_STRUCTURE',
        severity: 'error'
      });
    }

    // Core syntax validation
    const bracketErrors = this.validateBrackets(trimmed);
    errors.push(...bracketErrors);

    const quoteErrors = this.validateQuotes(trimmed);
    errors.push(...quoteErrors);

    // Advanced linting rules (only if basic syntax is valid)
    if (errors.filter(e => e.severity === 'error').length === 0) {
      // Performance linting
      if (this.config.enablePerformanceLinting) {
        const performanceErrors = this.validatePerformance(content);
        errors.push(...performanceErrors);
      }

      // Security linting
      if (this.config.enableSecurityLinting) {
        const securityErrors = this.validateSecurity(trimmed);
        errors.push(...securityErrors);
      }

      // Best practices validation (requires parsing)
      if (this.config.enableBestPractices) {
        try {
          const data = JSON.parse(trimmed);
          const bestPracticeErrors = this.validateBestPractices(data, trimmed);
          errors.push(...bestPracticeErrors);
        } catch {
          // Skip best practices if parsing fails
        }
      }
    }

    // Add performance metadata
    const validationTime = performance.now() - startTime;
    if (validationTime > 100) { // Warn if validation takes longer than 100ms
      errors.push({
        message: `Validation took ${validationTime.toFixed(1)}ms - consider simplifying the JSON structure`,
        code: 'SLOW_VALIDATION',
        severity: 'info'
      });
    }

    return errors;
  }

  /**
   * Enhanced JSON parsing with better error context
   * Similar to Jackson's ObjectMapper with custom error handling
   */
  private parseWithContext(content: string): any {
    try {
      return JSON.parse(content);
    } catch (error) {
      // Try to provide more context for common errors
      throw this.enhanceParseError(error);
    }
  }

  /**
   * Extract detailed error information from parsing exceptions
   * Java-style exception handling with structured error details
   */
  private extractErrorDetails(error: any, content: string): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (error instanceof SyntaxError) {
      const position = this.findErrorPosition(error.message, content);
      
      errors.push({
        message: this.humanizeErrorMessage(error.message),
        line: position.line,
        column: position.column,
        code: 'SYNTAX_ERROR',
        severity: 'error'
      });
    } else {
      errors.push({
        message: error.message || 'Unknown parsing error',
        code: 'PARSE_ERROR',
        severity: 'error'
      });
    }

    return errors;
  }

  /**
   * Create failed parse result with metadata
   * Immutable result pattern similar to Java Result/Either types
   */
  private createFailedResult(errors: ValidationError[], startTime: number, fileSize: number): ParseResult<any> {
    const parseTime = performance.now() - startTime;
    const metadata: ParseMetadata = {
      parseTime,
      fileSize,
      format: 'json',
      confidence: 0
    };

    return {
      isValid: false,
      data: null,
      errors,
      metadata
    };
  }

  /**
   * Validate basic JSON structure
   */
  private hasValidStructure(content: string): boolean {
    const firstChar = content.charAt(0);
    const lastChar = content.charAt(content.length - 1);
    
    return (firstChar === '{' && lastChar === '}') ||
           (firstChar === '[' && lastChar === ']');
  }

  /**
   * Validate bracket and brace matching
   * Similar to compiler lexical analysis
   */
  private validateBrackets(content: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const stack: Array<{char: string, line: number, column: number}> = [];
    const lines = content.split('\n');
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      
      for (let charIndex = 0; charIndex < line.length; charIndex++) {
        const char = line[charIndex];
        const position = { line: lineIndex + 1, column: charIndex + 1 };
        
        if (char === '{' || char === '[') {
          stack.push({ char, ...position });
        } else if (char === '}' || char === ']') {
          if (stack.length === 0) {
            errors.push({
              message: `Unexpected closing ${char === '}' ? 'brace' : 'bracket'}`,
              line: position.line,
              column: position.column,
              code: 'UNMATCHED_CLOSING',
              severity: 'error'
            });
          } else {
            const last = stack.pop()!;
            const isMatch = (last.char === '{' && char === '}') ||
                           (last.char === '[' && char === ']');
            
            if (!isMatch) {
              errors.push({
                message: `Mismatched brackets: expected ${last.char === '{' ? '}' : ']'} but found ${char}`,
                line: position.line,
                column: position.column,
                code: 'MISMATCHED_BRACKETS',
                severity: 'error'
              });
            }
          }
        }
      }
    }
    
    // Check for unclosed brackets
    for (const unclosed of stack) {
      errors.push({
        message: `Unclosed ${unclosed.char === '{' ? 'brace' : 'bracket'}`,
        line: unclosed.line,
        column: unclosed.column,
        code: 'UNCLOSED_BRACKET',
        severity: 'error'
      });
    }
    
    return errors;
  }

  /**
   * Validate quote matching and escaping
   */
  private validateQuotes(content: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const lines = content.split('\n');
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      let inString = false;
      let escaped = false;
      
      for (let charIndex = 0; charIndex < line.length; charIndex++) {
        const char = line[charIndex];
        
        if (char === '"' && !escaped) {
          inString = !inString;
        } else if (char === '\\' && inString) {
          escaped = !escaped;
          continue;
        }
        
        escaped = false;
      }
      
      if (inString) {
        errors.push({
          message: 'Unterminated string literal',
          line: lineIndex + 1,
          column: line.length,
          code: 'UNTERMINATED_STRING',
          severity: 'error'
        });
      }
    }
    
    return errors;
  }

  /**
   * Find error position from JSON.parse error message
   */
  private findErrorPosition(errorMessage: string, content: string): { line: number; column: number } {
    // Try to extract position from error message
    const positionMatch = errorMessage.match(/position (\d+)/i);
    
    if (positionMatch) {
      const position = parseInt(positionMatch[1], 10);
      return this.getLineColumnFromPosition(content, position);
    }
    
    return { line: 1, column: 1 };
  }

  /**
   * Convert character position to line/column
   */
  private getLineColumnFromPosition(content: string, position: number): { line: number; column: number } {
    const beforeError = content.substring(0, position);
    const lines = beforeError.split('\n');
    
    return {
      line: lines.length,
      column: lines[lines.length - 1].length + 1
    };
  }

  /**
   * Convert technical error messages to user-friendly format
   */
  private humanizeErrorMessage(message: string): string {
    const patterns = [
      { pattern: /unexpected token/i, replacement: 'Unexpected character found' },
      { pattern: /unexpected end of (json )?input/i, replacement: 'Incomplete JSON - missing closing bracket or brace' },
      { pattern: /expected.*but found/i, replacement: 'Invalid syntax - check for missing commas or quotes' }
    ];

    for (const { pattern, replacement } of patterns) {
      if (pattern.test(message)) {
        return replacement;
      }
    }

    return message;
  }

  /**
   * Enhance parse errors with additional context
   */
  private enhanceParseError(error: any): Error {
    if (error instanceof SyntaxError) {
      const enhanced = new SyntaxError(error.message);
      (enhanced as any).originalError = error;
      return enhanced;
    }
    
    return error;
  }

  /**
   * Validate performance characteristics of JSON content
   */
  private validatePerformance(content: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const fileSize = new Blob([content]).size;
    
    // File size warnings
    if (fileSize > 5 * 1024 * 1024) { // 5MB
      errors.push({
        message: `Large file detected (${(fileSize / 1024 / 1024).toFixed(1)}MB) - may impact performance`,
        code: 'LARGE_FILE',
        severity: 'warning'
      });
    } else if (fileSize > 1024 * 1024) { // 1MB
      errors.push({
        message: `Medium file size (${(fileSize / 1024 / 1024).toFixed(1)}MB) - monitor performance`,
        code: 'MEDIUM_FILE',
        severity: 'info'
      });
    }
    
    // Line count warnings for very long files
    const lineCount = content.split('\n').length;
    if (lineCount > 50000) {
      errors.push({
        message: `High line count (${lineCount.toLocaleString()}) - consider data compression`,
        code: 'HIGH_LINE_COUNT',
        severity: 'warning'
      });
    }
    
    return errors;
  }

  /**
   * Validate security aspects of JSON content
   */
  private validateSecurity(content: string): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Deep nesting detection (potential DoS attack)
    const maxDepth = this.calculateNestingDepth(content);
    if (maxDepth > this.config.maxNestingDepth) {
      errors.push({
        message: `Excessive nesting depth (${maxDepth}) exceeds limit (${this.config.maxNestingDepth}) - potential security risk`,
        code: 'EXCESSIVE_NESTING',
        severity: maxDepth > 100 ? 'error' : 'warning'
      });
    }
    
    // Detect potential prototype pollution patterns
    if (content.includes('"__proto__"') || content.includes('"constructor"')) {
      errors.push({
        message: 'Potentially dangerous property names detected - review for prototype pollution',
        code: 'DANGEROUS_PROPERTIES',
        severity: 'warning'
      });
    }
    
    // Detect very long strings that might indicate malicious content
    const longStringPattern = /'([^'\\n]|\\.){10000,}'/g;
    if (longStringPattern.test(content)) {
      errors.push({
        message: 'Extremely long string values detected - potential memory exhaustion risk',
        code: 'LONG_STRINGS',
        severity: 'warning'
      });
    }
    
    return errors;
  }

  /**
   * Validate best practices for JSON structure
   */
  private validateBestPractices(data: any, originalContent: string): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Validate structure recursively
    this.validateDataStructure(data, errors, [], 0);
    
    // Check for duplicate keys in original content
    const duplicateKeyErrors = this.findDuplicateKeys(originalContent);
    errors.push(...duplicateKeyErrors);
    
    // Property naming conventions
    if (this.config.strictPropertyNaming) {
      const namingErrors = this.validatePropertyNaming(data, errors, []);
      errors.push(...namingErrors);
    }
    
    return errors;
  }

  /**
   * Recursively validate data structure against best practices
   */
  private validateDataStructure(data: any, errors: ValidationError[], path: string[], depth: number): void {
    if (depth > this.config.maxNestingDepth) {
      return; // Already caught by security validation
    }
    
    if (Array.isArray(data)) {
      if (data.length > this.config.maxArrayLength) {
        errors.push({
          message: `Array at ${path.join('.')} has ${data.length} elements, exceeding recommended limit of ${this.config.maxArrayLength}`,
          code: 'LARGE_ARRAY',
          severity: 'warning'
        });
      }
      
      data.forEach((item, index) => {
        this.validateDataStructure(item, errors, [...path, `[${index}]`], depth + 1);
      });
    } else if (data && typeof data === 'object') {
      const keys = Object.keys(data);
      
      if (keys.length > this.config.maxObjectProperties) {
        errors.push({
          message: `Object at ${path.join('.') || 'root'} has ${keys.length} properties, exceeding recommended limit of ${this.config.maxObjectProperties}`,
          code: 'LARGE_OBJECT',
          severity: 'warning'
        });
      }
      
      keys.forEach(key => {
        if (key.length > this.config.maxPropertyNameLength) {
          errors.push({
            message: `Property name '${key}' exceeds recommended length of ${this.config.maxPropertyNameLength} characters`,
            code: 'LONG_PROPERTY_NAME',
            severity: 'info'
          });
        }
        
        this.validateDataStructure(data[key], errors, [...path, key], depth + 1);
      });
    } else if (typeof data === 'number') {
      if (this.config.warnOnLargeNumbers && (data > Number.MAX_SAFE_INTEGER || data < Number.MIN_SAFE_INTEGER)) {
        errors.push({
          message: `Number ${data} at ${path.join('.')} exceeds JavaScript's safe integer range`,
          code: 'UNSAFE_NUMBER',
          severity: 'warning'
        });
      }
    }
  }

  /**
   * Validate property naming conventions
   */
  private validatePropertyNaming(data: any, errors: ValidationError[], path: string[]): ValidationError[] {
    const namingErrors: ValidationError[] = [];
    
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      Object.keys(data).forEach(key => {
        // Check for camelCase convention
        if (!/^[a-z][a-zA-Z0-9]*$/.test(key) && key !== '_id' && key !== '__v') {
          namingErrors.push({
            message: `Property '${key}' at ${path.join('.') || 'root'} doesn't follow camelCase convention`,
            code: 'NAMING_CONVENTION',
            severity: 'info'
          });
        }
        
        // Check for reserved words
        const reservedWords = ['constructor', 'prototype', '__proto__', 'toString', 'valueOf'];
        if (reservedWords.includes(key)) {
          namingErrors.push({
            message: `Property name '${key}' is a reserved word and should be avoided`,
            code: 'RESERVED_WORD',
            severity: 'warning'
          });
        }
        
        // Recursively check nested objects
        this.validatePropertyNaming(data[key], namingErrors, [...path, key]);
      });
    } else if (Array.isArray(data)) {
      data.forEach((item, index) => {
        this.validatePropertyNaming(item, namingErrors, [...path, `[${index}]`]);
      });
    }
    
    return namingErrors;
  }

  /**
   * Calculate maximum nesting depth of JSON structure
   */
  private calculateNestingDepth(content: string): number {
    let maxDepth = 0;
    let currentDepth = 0;
    let inString = false;
    let escaped = false;
    
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === '\\') {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }
      } else {
        if (char === '"') {
          inString = true;
        } else if (char === '{' || char === '[') {
          currentDepth++;
          maxDepth = Math.max(maxDepth, currentDepth);
        } else if (char === '}' || char === ']') {
          currentDepth--;
        }
      }
    }
    
    return maxDepth;
  }

  /**
   * Find duplicate keys in JSON content
   */
  private findDuplicateKeys(content: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const lines = content.split('\n');
    
    // Simple duplicate detection - would need more sophisticated parsing for complex cases
    const keyPattern = /"([^"]+)"\s*:/g;
    const keysByLine: Map<string, number[]> = new Map();
    
    lines.forEach((line, lineIndex) => {
      let match;
      while ((match = keyPattern.exec(line)) !== null) {
        const key = match[1];
        if (!keysByLine.has(key)) {
          keysByLine.set(key, []);
        }
        keysByLine.get(key)!.push(lineIndex + 1);
      }
    });
    
    keysByLine.forEach((lineNumbers, key) => {
      if (lineNumbers.length > 1) {
        errors.push({
          message: `Duplicate key '${key}' found on lines ${lineNumbers.join(', ')}`,
          line: lineNumbers[1], // Point to second occurrence
          code: 'DUPLICATE_KEY',
          severity: 'warning'
        });
      }
    });
    
    return errors;
  }
}