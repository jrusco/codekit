// Security Manager - enterprise input validation and sanitization using industry-standard libraries
// DOMPurify for HTML sanitization, validator.js for input validation
// Follows OWASP security guidelines with battle-tested libraries

import DOMPurify from 'dompurify';
import validator from 'validator';

/**
 * Security configuration interface
 */
export interface SecurityConfig {
  readonly enableXSSProtection: boolean;
  readonly enableCSVInjectionProtection: boolean;
  readonly enablePrototypePollutionProtection: boolean;
  readonly maxInputSize: number;
  readonly sanitizeErrorMessages: boolean;
  readonly dompurifyConfig: any; // DOMPurify.Config type
  readonly strictValidation: boolean;
}

/**
 * Security error types for proper error handling
 */
export class SecurityError extends Error {
  public readonly type: 'XSS' | 'CSV_INJECTION' | 'PROTOTYPE_POLLUTION' | 'INPUT_SIZE' | 'MALFORMED_INPUT';
  public readonly sanitizedMessage?: string;

  constructor(
    message: string,
    type: 'XSS' | 'CSV_INJECTION' | 'PROTOTYPE_POLLUTION' | 'INPUT_SIZE' | 'MALFORMED_INPUT',
    sanitizedMessage?: string
  ) {
    super(message);
    this.name = 'SecurityError';
    this.type = type;
    this.sanitizedMessage = sanitizedMessage;
  }
}

/**
 * User-friendly error interface for frontend display
 */
export interface UserFriendlyError {
  readonly message: string;
  readonly type: string;
  readonly suggestion?: string;
}

/**
 * Enterprise-grade security manager for input validation and sanitization
 * Follows OWASP security guidelines and enterprise security patterns
 */
export class SecurityManager {
  private static instance: SecurityManager;
  private readonly config: SecurityConfig;

  private constructor(config: Partial<SecurityConfig> = {}) {
    this.config = {
      enableXSSProtection: true,
      enableCSVInjectionProtection: true,
      enablePrototypePollutionProtection: true,
      maxInputSize: 10 * 1024 * 1024, // 10MB limit
      sanitizeErrorMessages: true,
      dompurifyConfig: {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'code', 'pre'],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: false,
        IN_PLACE: false
      },
      strictValidation: true,
      ...config
    };
  }

  static getInstance(config?: Partial<SecurityConfig>): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager(config);
    }
    return SecurityManager.instance;
  }

  /**
   * Comprehensive input sanitization following OWASP guidelines
   */
  sanitizeInput(input: string, context: 'json' | 'csv' | 'xml' | 'general' = 'general'): string {
    if (!input) return input;

    // Input size validation
    if (input.length > this.config.maxInputSize) {
      throw new SecurityError(
        `Input size exceeds maximum allowed size of ${this.config.maxInputSize} bytes`,
        'INPUT_SIZE',
        'Please reduce the size of your input data'
      );
    }

    let sanitized = input;

    // XSS Protection - remove/encode dangerous script elements
    if (this.config.enableXSSProtection) {
      sanitized = this.sanitizeXSS(sanitized, context);
    }

    // CSV Injection Protection
    if (this.config.enableCSVInjectionProtection && context === 'csv') {
      sanitized = this.sanitizeCSVInjection(sanitized);
    }

    // Prototype Pollution Protection for JSON context only
    if (this.config.enablePrototypePollutionProtection && context === 'json') {
      this.validateJSONForPrototypePollution(input); // Use original input, not sanitized
    }

    return sanitized;
  }

  /**
   * XSS sanitization using industry-standard DOMPurify library
   * Provides comprehensive protection against XSS attacks
   */
  private sanitizeXSS(input: string, context: string): string {
    if (!input) return input;

    // For display contexts, escape rather than sanitize
    if (context === 'json' || context === 'xml') {
      // Use validator.js for safe HTML entity escaping
      return validator.escape(input);
    }

    // For other contexts, use DOMPurify with context-specific configuration
    let config = { ...this.config.dompurifyConfig };
    
    if (context === 'general') {
      // Ultra-strict mode for general input
      config = {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true,
        IN_PLACE: false,
        SANITIZE_DOM: true,
        SANITIZE_NAMED_PROPS: true,
        WHOLE_DOCUMENT: false,
        RETURN_DOM: false,
        RETURN_DOM_FRAGMENT: false,
        RETURN_TRUSTED_TYPE: false,
        FORBID_ATTR: ['src', 'href', 'action', 'formaction', 'background', 'poster'],
        FORBID_TAGS: ['script', 'object', 'embed', 'link', 'style', 'img', 'video', 'audio']
      };
    }

    try {
      // Pre-process to remove dangerous URLs and functions that DOMPurify might miss in text content
      let preprocessed = input;
      if (context === 'general') {
        preprocessed = input
          .replace(/vbscript\s*:/gi, 'removed-vbscript:')
          .replace(/javascript\s*:/gi, 'removed-javascript:')
          .replace(/data\s*:\s*text\/html/gi, 'removed-data-html')
          .replace(/msgbox\s*\(/gi, 'removed-msgbox(')
          .replace(/alert\s*\(/gi, 'removed-alert(')
          .replace(/eval\s*\(/gi, 'removed-eval(');
      }
      
      const sanitized = String(DOMPurify.sanitize(preprocessed, config));
      
      // Additional validation for potential bypasses
      if (this.config.strictValidation) {
        return this.validateSanitizedOutput(sanitized);
      }
      
      return sanitized;
    } catch (error) {
      // Fallback to escaped content if DOMPurify fails
      console.warn('DOMPurify sanitization failed, falling back to escaping:', error);
      return validator.escape(input);
    }
  }

  /**
   * Additional validation for sanitized output to ensure no bypasses
   */
  private validateSanitizedOutput(sanitized: string): string {
    // Only check for critical bypasses that DOMPurify might miss
    const criticalPatterns = [
      /javascript\s*:\s*[^"\s]/gi, // Only flag executable javascript: URLs
      /data\s*:\s*text\/html.*<script/gi, // Data URLs with scripts
      /on\w+\s*=\s*["'][^"']*alert/gi // Event handlers with dangerous content
    ];

    for (const pattern of criticalPatterns) {
      if (pattern.test(sanitized)) {
        throw new SecurityError(
          'Potential XSS bypass detected in sanitized output',
          'XSS',
          'Input contains patterns that could not be safely sanitized'
        );
      }
    }

    return sanitized;
  }

  /**
   * CSV injection protection using validator.js and enhanced detection
   * Prevents formula injection attacks in CSV files
   */
  private sanitizeCSVInjection(input: string): string {
    if (!input) return input;

    const lines = input.split('\n');
    
    return lines.map(line => {
      const cells = line.split(',');
      return cells.map(cell => {
        // Use validator.js to properly escape the cell content
        const unquoted = cell.trim().replace(/^["']|["']$/g, '');
        
        // Enhanced formula injection detection
        const dangerousPatterns = [
          /^[=@+\-]/,           // Traditional formula prefixes
          /^\t/,                // Tab prefix injection
          /^\r/,                // Carriage return injection
          /^cmd\|/i,            // Command execution patterns
          /^powershell/i,       // PowerShell execution
          /^=.*\+.*cmd/i,       // Complex formula with command execution
          /^@SUM.*cmd/i         // SUM function with command injection
        ];

        // Check if cell contains dangerous patterns
        const isDangerous = dangerousPatterns.some(pattern => pattern.test(unquoted));
        
        if (isDangerous) {
          // Use validator.js escape + prefix with single quote for additional safety
          const escaped = validator.escape(unquoted);
          return `"'${escaped}"`;
        }
        
        // For safe content, still escape special characters
        if (this.config.strictValidation && /[<>&"']/.test(unquoted)) {
          return `"${validator.escape(unquoted)}"`;
        }
        
        return cell;
      }).join(',');
    }).join('\n');
  }

  /**
   * Enhanced prototype pollution validation for JSON input using validator.js
   * Protects against prototype pollution attacks in JSON parsing
   */
  private validateJSONForPrototypePollution(input: string): void {
    if (!input) return;

    // Only validate JSON format if input looks like JSON (starts with { or [)
    const looksLikeJSON = input.trim().startsWith('{') || input.trim().startsWith('[');
    if (looksLikeJSON && !validator.isJSON(input)) {
      if (this.config.strictValidation) {
        throw new SecurityError(
          'Invalid JSON format detected',
          'MALFORMED_INPUT',
          'Input must be valid JSON format'
        );
      }
    }

    const dangerousPatterns = [
      // Enhanced detection patterns for prototype pollution
      /"__proto__"\s*:/gi,
      /"constructor"\s*:/gi, 
      /"prototype"\s*:/gi,
      /\["__proto__"\]/gi,
      /\["constructor"\]/gi,
      /\["prototype"\]/gi,
      /\.__proto__\s*=/gi,
      /\.constructor\s*=/gi,
      /\.prototype\s*=/gi
    ];
    
    // Check for dangerous patterns using regex (more comprehensive)
    for (const pattern of dangerousPatterns) {
      if (pattern.test(input)) {
        throw new SecurityError(
          'Potential prototype pollution detected in JSON input',
          'PROTOTYPE_POLLUTION',
          'Avoid using __proto__, constructor, or prototype keys in your JSON data'
        );
      }
    }

    // Additional check for nested prototype pollution attempts
    try {
      // Safe JSON parsing attempt to detect structural issues
      const parsed = JSON.parse(input);
      if (this.hasPrototypePollutionKeys(parsed)) {
        throw new SecurityError(
          'Prototype pollution keys detected in parsed JSON structure',
          'PROTOTYPE_POLLUTION',
          'JSON object contains dangerous prototype properties'
        );
      }
    } catch (parseError) {
      // If JSON parsing fails, the input validation above should have caught it
      // Only throw if strict validation is enabled
      if (this.config.strictValidation && validator.isJSON(input)) {
        throw new SecurityError(
          'JSON parsing failed during security validation',
          'MALFORMED_INPUT',
          'Unable to safely parse JSON for security validation'
        );
      }
    }
  }

  /**
   * Recursively check for prototype pollution keys in parsed object
   */
  private hasPrototypePollutionKeys(obj: any, depth = 0): boolean {
    // Prevent deep recursion attacks
    if (depth > 10) return false;
    
    if (obj === null || typeof obj !== 'object') return false;
    
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    
    // Check direct properties
    for (const key of dangerousKeys) {
      if (obj.hasOwnProperty(key)) {
        return true;
      }
    }
    
    // Recursively check nested objects
    for (const key in obj) {
      if (obj.hasOwnProperty(key) && typeof obj[key] === 'object') {
        if (this.hasPrototypePollutionKeys(obj[key], depth + 1)) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Sanitize error messages using validator.js to prevent information disclosure
   * Removes sensitive information while providing helpful user guidance
   */
  sanitizeErrorMessage(error: Error): UserFriendlyError {
    if (!this.config.sanitizeErrorMessages) {
      return {
        message: error.message,
        type: error.name
      };
    }

    let sanitizedMessage = error.message;

    // Use validator.js to escape any HTML in error messages
    sanitizedMessage = validator.escape(sanitizedMessage);

    // Remove file paths (Windows and Unix) - enhanced patterns
    const filePathPatterns = [
      /[A-Z]:\\[\w\s\\]*\.\w+/gi,        // Windows paths
      /\/[\w\s\/]*\/[\w.-]+\.\w+/g,     // Unix paths
      /file:\/\/\/[^\s]*/gi,                // File URLs
      /https?:\/\/[^\s]*/gi                  // HTTP URLs (potential data leaks)
    ];

    filePathPatterns.forEach(pattern => {
      sanitizedMessage = sanitizedMessage.replace(pattern, '[PATH_REDACTED]');
    });

    // Remove stack trace indicators and debugging info
    const debugPatterns = [
      /\s+at\s+[\w.$<>]+/g,              // Stack trace 'at' lines
      /\s+at\s+Object\.[\w$]+/g,        // Object method calls
      /line\s+\d+/gi,                    // Line numbers
      /column\s+\d+/gi,                  // Column numbers
      /\[object\s+\w+\]/gi             // Object type references
    ];

    debugPatterns.forEach(pattern => {
      sanitizedMessage = sanitizedMessage.replace(pattern, '');
    });

    // Remove sensitive information patterns
    const sensitivePatterns = [
      // Credentials and tokens
      { pattern: /password[\s=:][^\s]*/gi, replacement: 'password=[REDACTED]' },
      { pattern: /secret[\s=:][^\s]*/gi, replacement: 'secret=[REDACTED]' },
      { pattern: /key[\s=:][^\s]*/gi, replacement: 'key=[REDACTED]' },
      { pattern: /token[\s=:][^\s]*/gi, replacement: 'token=[REDACTED]' },
      { pattern: /auth[\s=:][^\s]*/gi, replacement: 'auth=[REDACTED]' },
      { pattern: /credential[\s=:][^\s]*/gi, replacement: 'credential=[REDACTED]' },
      
      // Network information
      { pattern: /localhost|127\.0\.0\.1/gi, replacement: '[LOCALHOST]' },
      { pattern: /192\.168\.[0-9.]+/gi, replacement: '[PRIVATE_IP]' },
      { pattern: /10\.[0-9.]+/gi, replacement: '[PRIVATE_IP]' },
      
      // System information
      { pattern: /admin|root|system/gi, replacement: '[SYSTEM_USER]' },
      { pattern: /C:\\Users\\[^\\s]*/gi, replacement: '[USER_DIR]' },
      { pattern: /\/home\/[^\s\/]*/gi, replacement: '[USER_DIR]' }
    ];

    sensitivePatterns.forEach(({ pattern, replacement }) => {
      sanitizedMessage = sanitizedMessage.replace(pattern, replacement);
    });

    // Generate contextual suggestions
    let suggestion: string | undefined;
    
    if (error instanceof SecurityError) {
      suggestion = error.sanitizedMessage;
    } else {
      // Use validator to check error context and provide appropriate suggestions
      const lowerMessage = sanitizedMessage.toLowerCase();
      
      if (lowerMessage.includes('json')) {
        suggestion = 'Please check your JSON syntax for missing commas, brackets, or quotes';
      } else if (lowerMessage.includes('csv')) {
        suggestion = 'Please verify your CSV format has consistent columns and proper escaping';
      } else if (lowerMessage.includes('xml')) {
        suggestion = 'Please ensure your XML has properly closed tags and valid structure';
      } else if (lowerMessage.includes('size') || lowerMessage.includes('limit')) {
        suggestion = 'Input data exceeds maximum allowed size. Please reduce the file size';
      } else if (lowerMessage.includes('format') || lowerMessage.includes('parse')) {
        suggestion = 'Data format is invalid. Please check the file structure and encoding';
      }
    }

    return {
      message: validator.isLength(sanitizedMessage, { max: 200 }) 
        ? sanitizedMessage 
        : sanitizedMessage.substring(0, 200) + '...',
      type: error.name,
      suggestion
    };
  }

  /**
   * Validate Content Security Policy compliance
   */
  validateCSP(): boolean {
    // Check if CSP headers are properly configured
    const metaTags = document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]');
    const hasCSPMeta = metaTags.length > 0;

    if (hasCSPMeta) {
      const cspContent = metaTags[0].getAttribute('content') || '';
      
      // Validate CSP has required directives
      const requiredDirectives = ['script-src', 'style-src'];
      const hasRequiredDirectives = requiredDirectives.every(directive => 
        cspContent.includes(directive)
      );

      // Check for unsafe directives
      const hasUnsafeDirectives = cspContent.includes('unsafe-inline') || 
                                  cspContent.includes('unsafe-eval');

      return hasRequiredDirectives && !hasUnsafeDirectives;
    }

    return false;
  }

  /**
   * Get security configuration for debugging/monitoring
   */
  getSecurityConfig(): Readonly<SecurityConfig> {
    return { ...this.config };
  }

  /**
   * Update security configuration (for testing or runtime adjustments)
   */
  updateConfig(newConfig: Partial<SecurityConfig>): void {
    Object.assign(this.config as any, newConfig);
  }
}