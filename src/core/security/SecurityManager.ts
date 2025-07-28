// Security Manager - enterprise input validation and sanitization
// Similar to Spring Security's input validation patterns

/**
 * Security configuration interface
 */
export interface SecurityConfig {
  readonly enableXSSProtection: boolean;
  readonly enableCSVInjectionProtection: boolean;
  readonly enablePrototypePollutionProtection: boolean;
  readonly maxInputSize: number;
  readonly sanitizeErrorMessages: boolean;
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

    // Prototype Pollution Protection for JSON
    if (this.config.enablePrototypePollutionProtection && context === 'json') {
      this.validateJSONForPrototypePollution(sanitized);
    }

    return sanitized;
  }

  /**
   * XSS sanitization - neutralize dangerous script content
   */
  private sanitizeXSS(input: string, context: string): string {
    let sanitized = input;

    // For display contexts, escape rather than remove
    if (context === 'json' || context === 'xml') {
      // Escape HTML entities for safe display
      sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    } else {
      // For other contexts, comprehensively remove dangerous patterns
      // Apply in specific order - most specific patterns first
      const dangerousPatterns = [
        // Complete dangerous HTML elements first (most specific)
        { pattern: /<\s*script\b[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, replacement: '' },
        { pattern: /<\s*svg\b[^>]*>[\s\S]*?<\s*\/\s*svg\s*>/gi, replacement: '' },
        { pattern: /<\s*iframe\b[^>]*>[\s\S]*?<\s*\/\s*iframe\s*>/gi, replacement: '' },
        { pattern: /<\s*(object|embed)\b[^>]*>[\s\S]*?<\s*\/\s*(object|embed)\s*>/gi, replacement: '' },
        
        // Self-closing dangerous elements
        { pattern: /<\s*script\b[^>]*\/\s*>/gi, replacement: '' },
        { pattern: /<\s*svg\b[^>]*\/\s*>/gi, replacement: '' },
        { pattern: /<\s*iframe\b[^>]*\/\s*>/gi, replacement: '' },
        { pattern: /<\s*(object|embed)\b[^>]*\/\s*>/gi, replacement: '' },
        
        // Unclosed dangerous elements (any opening tag)
        { pattern: /<\s*script\b[^>]*>/gi, replacement: '' },
        { pattern: /<\s*svg\b[^>]*>/gi, replacement: '' },
        { pattern: /<\s*iframe\b[^>]*>/gi, replacement: '' },
        { pattern: /<\s*(object|embed)\b[^>]*>/gi, replacement: '' },
        
        // Event handlers - fixed duplicate character class  
        { pattern: /\s*on\w+\s*=\s*["'][^"']*["']/gi, replacement: '' },
        
        // Dangerous URL protocols
        { pattern: /javascript\s*:[^"'\s>]*/gi, replacement: '' },
        { pattern: /vbscript\s*:[^"'\s>]*/gi, replacement: '' },
        { pattern: /data\s*:\s*text\/html[^"'\s>]*/gi, replacement: '' },
        { pattern: /data\s*:\s*[^,]*base64[^"'\s>]*/gi, replacement: '' },
        
        // CSS expressions
        { pattern: /expression\s*\([^)]*\)/gi, replacement: '' },
        
        // Import statements
        { pattern: /@import\s+['"][^'"]*['"]/gi, replacement: '' }
      ];

      dangerousPatterns.forEach(({ pattern, replacement }) => {
        sanitized = sanitized.replace(pattern, replacement);
      });
      
      // Additional cleanup for remaining dangerous keywords
      const dangerousKeywords = [
        'alert', 'confirm', 'prompt', 'eval', 'Function',
        'setTimeout', 'setInterval', 'msgbox'
      ];
      
      dangerousKeywords.forEach(keyword => {
        const keywordPattern = new RegExp(`\\b${keyword}\\s*\\(`, 'gi');
        sanitized = sanitized.replace(keywordPattern, '');
      });
    }

    return sanitized;
  }

  /**
   * CSV injection protection - neutralize formula prefixes
   */
  private sanitizeCSVInjection(input: string): string {
    // CSV injection patterns: =, @, +, -, \t, \r (formula prefixes)
    const lines = input.split('\n');
    
    return lines.map(line => {
      const cells = line.split(',');
      return cells.map(cell => {
        const trimmed = cell.trim().replace(/^["']|["']$/g, ''); // Remove quotes
        
        // Check for formula injection
        if (/^[=@+\-\t\r]/.test(trimmed)) {
          // Prefix with single quote to neutralize formula
          return `"'${trimmed}"`;
        }
        
        return cell;
      }).join(',');
    }).join('\n');
  }

  /**
   * Prototype pollution validation for JSON input
   */
  private validateJSONForPrototypePollution(input: string): void {
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    
    // Check for dangerous keys in the raw string (case insensitive)
    const lowerInput = input.toLowerCase();
    for (const key of dangerousKeys) {
      // Check for both quoted and unquoted versions
      const quotedPattern = `"${key}"`;
      const unquotedPattern = `\\b${key}\\b`;
      
      if (lowerInput.includes(quotedPattern) || new RegExp(unquotedPattern, 'i').test(input)) {
        throw new SecurityError(
          'Potential prototype pollution detected in JSON input',
          'PROTOTYPE_POLLUTION',
          'Avoid using __proto__, constructor, or prototype keys in your JSON data'
        );
      }
    }
  }

  /**
   * Sanitize error messages to prevent information disclosure
   */
  sanitizeErrorMessage(error: Error): UserFriendlyError {
    if (!this.config.sanitizeErrorMessages) {
      return {
        message: error.message,
        type: error.name
      };
    }

    let sanitizedMessage = error.message;

    // Remove file paths (Windows and Unix)
    sanitizedMessage = sanitizedMessage.replace(/[A-Z]:\\\w+[\\\w\s]*\\\w+\.\w+/g, '[FILE_PATH]');
    sanitizedMessage = sanitizedMessage.replace(/\/[\w\s\/]*\/\w+\.\w+/g, '[FILE_PATH]');

    // Remove stack trace indicators
    sanitizedMessage = sanitizedMessage.replace(/\s+at\s+\w+\./g, ' ');
    sanitizedMessage = sanitizedMessage.replace(/\s+at\s+Object\./g, ' ');

    // Remove sensitive keywords
    const sensitivePatterns = [
      /password|secret|key|token|auth|credential/gi,
      /localhost|127\.0\.0\.1|192\.168\./g,
      /admin|root|system/gi
    ];

    sensitivePatterns.forEach(pattern => {
      sanitizedMessage = sanitizedMessage.replace(pattern, '[REDACTED]');
    });

    // Provide user-friendly suggestions based on error type
    let suggestion: string | undefined;
    
    if (error instanceof SecurityError) {
      suggestion = error.sanitizedMessage;
    } else if (sanitizedMessage.includes('JSON')) {
      suggestion = 'Please check your JSON syntax for missing commas, brackets, or quotes';
    } else if (sanitizedMessage.includes('CSV')) {
      suggestion = 'Please verify your CSV format has consistent columns and proper escaping';
    } else if (sanitizedMessage.includes('XML')) {
      suggestion = 'Please ensure your XML has properly closed tags and valid structure';
    }

    return {
      message: sanitizedMessage.substring(0, 200), // Limit message length
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