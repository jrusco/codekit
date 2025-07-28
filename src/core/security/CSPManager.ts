// Content Security Policy Manager - production security headers
// Enterprise CSP configuration following OWASP guidelines

/**
 * CSP directive configuration interface
 */
export interface CSPDirectives {
  readonly 'default-src': string[];
  readonly 'script-src': string[];
  readonly 'style-src': string[];
  readonly 'img-src': string[];
  readonly 'connect-src': string[];
  readonly 'font-src': string[];
  readonly 'object-src': string[];
  readonly 'media-src': string[];
  readonly 'frame-src': string[];
  readonly 'worker-src': string[];
  readonly 'manifest-src': string[];
  readonly 'base-uri': string[];
  readonly 'form-action': string[];
  readonly 'frame-ancestors': string[];
  readonly 'report-uri'?: string[];
}

/**
 * CSP configuration for different environments
 */
export interface CSPConfig {
  readonly development: Partial<CSPDirectives>;
  readonly production: Partial<CSPDirectives>;
  readonly testing: Partial<CSPDirectives>;
}

/**
 * Content Security Policy Manager for enterprise security
 * Provides strict CSP configuration for production deployment
 */
export class CSPManager {
  private static instance: CSPManager;
  
  private readonly cspConfig: CSPConfig = {
    development: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-eval'"], // Allow eval for HMR
      'style-src': ["'self'", "'unsafe-inline'"], // Allow inline styles for development
      'img-src': ["'self'", 'data:', 'blob:'],
      'connect-src': ["'self'", 'ws:', 'wss:', 'http://localhost:*', 'https://localhost:*'],
      'font-src': ["'self'", 'data:'],
      'object-src': ["'none'"],
      'media-src': ["'self'"],
      'frame-src': ["'none'"],
      'worker-src': ["'self'"],
      'manifest-src': ["'self'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"]
    },
    production: {
      'default-src': ["'self'"],
      'script-src': ["'self'"], // Strict - no unsafe-eval or unsafe-inline
      'style-src': ["'self'", "'unsafe-inline'"], // Allow inline styles for dynamic theming
      'img-src': ["'self'", 'data:'],
      'connect-src': ["'self'", 'https://queue.simpleanalyticscdn.com', 'https://simpleanalytics.com'],
      'font-src': ["'self'"],
      'object-src': ["'none'"],
      'media-src': ["'none'"],
      'frame-src': ["'none'"],
      'worker-src': ["'self'"],
      'manifest-src': ["'self'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'report-uri': ['/csp-report'] // CSP violation reporting
    },
    testing: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'"], // Allow inline scripts for testing
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'blob:'],
      'connect-src': ["'self'", 'data:'],
      'font-src': ["'self'", 'data:'],
      'object-src': ["'none'"],
      'media-src': ["'self'"],
      'frame-src': ["'none'"],
      'worker-src': ["'self'"],
      'manifest-src': ["'self'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"]
    }
  };

  static getInstance(): CSPManager {
    if (!CSPManager.instance) {
      CSPManager.instance = new CSPManager();
    }
    return CSPManager.instance;
  }

  /**
   * Generate CSP header string for given environment
   */
  generateCSPHeader(environment: keyof CSPConfig = 'production'): string {
    const directives = this.cspConfig[environment];
    
    return Object.entries(directives)
      .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
      .join('; ');
  }

  /**
   * Generate CSP meta tag for HTML
   */
  generateCSPMetaTag(environment: keyof CSPConfig = 'production'): string {
    const cspHeader = this.generateCSPHeader(environment);
    return `<meta http-equiv="Content-Security-Policy" content="${cspHeader}">`;
  }

  /**
   * Inject CSP meta tag into document head
   */
  injectCSPMetaTag(environment: keyof CSPConfig = 'production'): void {
    // Remove existing CSP meta tags
    const existingTags = document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]');
    existingTags.forEach(tag => tag.remove());

    // Create new CSP meta tag
    const metaTag = document.createElement('meta');
    metaTag.setAttribute('http-equiv', 'Content-Security-Policy');
    metaTag.setAttribute('content', this.generateCSPHeader(environment));
    
    document.head.appendChild(metaTag);
  }

  /**
   * Validate current CSP configuration
   */
  validateCSP(): {
    isValid: boolean;
    violations: string[];
    recommendations: string[];
  } {
    const violations: string[] = [];
    const recommendations: string[] = [];
    
    const currentEnvironment = this.detectEnvironment();
    const directives = this.cspConfig[currentEnvironment];

    // Check for unsafe directives in production
    if (currentEnvironment === 'production') {
      if (directives['script-src']?.includes("'unsafe-eval'")) {
        violations.push("Production CSP contains 'unsafe-eval' in script-src");
      }
      
      if (directives['script-src']?.includes("'unsafe-inline'")) {
        violations.push("Production CSP contains 'unsafe-inline' in script-src");
      }
    }

    // Check for missing essential directives
    const essentialDirectives = ['default-src', 'script-src', 'style-src', 'object-src'];
    essentialDirectives.forEach(directive => {
      if (!directives[directive as keyof CSPDirectives]) {
        violations.push(`Missing essential directive: ${directive}`);
      }
    });

    // Recommendations
    if (!directives['report-uri']) {
      recommendations.push('Consider adding report-uri directive for CSP violation reporting');
    }

    if (directives['style-src']?.includes("'unsafe-inline'")) {
      recommendations.push('Consider using nonces or hashes instead of unsafe-inline for styles');
    }

    return {
      isValid: violations.length === 0,
      violations,
      recommendations
    };
  }

  /**
   * Detect current environment
   */
  private detectEnvironment(): keyof CSPConfig {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('dev')) {
        return 'development';
      }
      
      if (hostname.includes('test') || hostname.includes('staging')) {
        return 'testing';
      }
    }
    
    // Default to production for security
    return 'production';
  }

  /**
   * Handle CSP violations (for reporting)
   */
  handleCSPViolation(violationReport: any): void {
    console.warn('CSP Violation detected:', violationReport);
    
    // In production, report to monitoring service
    if (this.detectEnvironment() === 'production') {
      // Report to analytics or monitoring service
      this.reportSecurityViolation({
        type: 'csp_violation',
        directive: violationReport['violated-directive'],
        blockedUri: violationReport['blocked-uri'],
        sourceFile: violationReport['source-file'],
        lineNumber: violationReport['line-number'],
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Report security violations to monitoring service
   */
  private reportSecurityViolation(violation: any): void {
    // This would integrate with your monitoring/analytics service
    if (typeof window !== 'undefined' && 'sa_event' in window) {
      (window as any).sa_event('security_violation', violation);
    }
  }

  /**
   * Get CSP configuration for debugging
   */
  getCSPConfig(): Readonly<CSPConfig> {
    return JSON.parse(JSON.stringify(this.cspConfig));
  }

  /**
   * Add custom directive to CSP configuration
   */
  addCustomDirective(
    environment: keyof CSPConfig,
    directive: string,
    sources: string[]
  ): void {
    const config = this.cspConfig[environment] as any;
    config[directive] = sources;
  }
}

// Initialize CSP violation reporting
if (typeof window !== 'undefined') {
  document.addEventListener('securitypolicyviolation', (e) => {
    const cspManager = CSPManager.getInstance();
    cspManager.handleCSPViolation({
      'violated-directive': e.violatedDirective,
      'blocked-uri': e.blockedURI,
      'source-file': e.sourceFile,
      'line-number': e.lineNumber,
      'column-number': e.columnNumber
    });
  });
}