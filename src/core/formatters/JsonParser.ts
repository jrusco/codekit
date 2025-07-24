// Advanced JSON parser with superior error reporting - exceeds JSON.pub capabilities
import type { FormatParser, ParseResult, ValidationError, DetectionResult, ParseMetadata } from '../../types/core.ts';

/**
 * Enterprise-grade JSON parser with detailed error reporting and performance optimization
 * Provides Java-like structured error handling with immutable results
 */
export class JsonParser implements FormatParser<any> {
  readonly name = 'JSON';
  readonly extensions = ['json'] as const;
  readonly mimeTypes = ['application/json', 'text/json'] as const;

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
      
      if (validationErrors.length > 0) {
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
        errors: [],
        metadata
      };

    } catch (error) {
      const errors = this.extractErrorDetails(error, content);
      return this.createFailedResult(errors, startTime, fileSize);
    }
  }

  /**
   * Validate JSON structure without parsing
   * Similar to Bean Validation in Spring
   */
  validate(content: string): ValidationError[] {
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

    // Bracket/brace matching
    const bracketErrors = this.validateBrackets(trimmed);
    errors.push(...bracketErrors);

    // Quote validation
    const quoteErrors = this.validateQuotes(trimmed);
    errors.push(...quoteErrors);

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
}