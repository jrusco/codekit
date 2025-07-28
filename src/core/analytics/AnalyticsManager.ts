// Analytics Manager for SimpleAnalytics.com integration
// Privacy-first analytics with GDPR compliance

export interface AnalyticsEvent {
  readonly name: string;
  readonly properties?: Record<string, any>;
  readonly timestamp?: number;
}

export interface AnalyticsConfig {
  readonly enabled: boolean;
  readonly hostname: string;
  readonly privacyMode: boolean;
  readonly collectIP: boolean;
  readonly respectDNT: boolean; // Respect Do Not Track
}

/**
 * Privacy-first analytics manager using SimpleAnalytics.com
 * Follows GDPR principles and enterprise privacy standards
 */
export class AnalyticsManager {
  private static instance: AnalyticsManager;
  private config: AnalyticsConfig;
  private isInitialized = false;
  private eventQueue: AnalyticsEvent[] = [];

  private constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = {
      enabled: !this.isDevelopment() && !this.shouldRespectDNT(),
      hostname: 'codekit-parser.com', // Replace with actual hostname
      privacyMode: true,
      collectIP: false,
      respectDNT: true,
      ...config
    };
  }

  static getInstance(config?: Partial<AnalyticsConfig>): AnalyticsManager {
    if (!AnalyticsManager.instance) {
      AnalyticsManager.instance = new AnalyticsManager(config);
    }
    return AnalyticsManager.instance;
  }

  /**
   * Initialize SimpleAnalytics tracking
   */
  async initialize(): Promise<void> {
    if (this.isInitialized || !this.config.enabled) {
      return;
    }

    try {
      // Load SimpleAnalytics script
      await this.loadSimpleAnalyticsScript();
      
      // Configure SimpleAnalytics
      this.configureSimpleAnalytics();
      
      // Process queued events
      this.processEventQueue();
      
      this.isInitialized = true;
      console.debug('Analytics initialized successfully');
      
    } catch (error) {
      console.warn('Failed to initialize analytics:', error);
    }
  }

  /**
   * Load SimpleAnalytics script
   */
  private loadSimpleAnalyticsScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        resolve();
        return;
      }

      // Check if script is already loaded
      if (document.querySelector('script[src*="simpleanalytics"]')) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.async = true;
      script.defer = true;
      script.src = 'https://scripts.simpleanalyticscdn.com/latest.js';
      script.crossOrigin = 'anonymous';
      
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load SimpleAnalytics script'));
      
      // Add to head
      document.head.appendChild(script);
      
      // Add noscript fallback
      const noscript = document.createElement('noscript');
      const img = document.createElement('img');
      img.src = 'https://queue.simpleanalyticscdn.com/noscript.gif';
      img.alt = '';
      img.referrerPolicy = 'no-referrer-when-downgrade';
      noscript.appendChild(img);
      document.head.appendChild(noscript);
    });
  }

  /**
   * Configure SimpleAnalytics
   */
  private configureSimpleAnalytics(): void {
    if (typeof window === 'undefined') return;

    // Set global configuration
    (window as any).sa_event = (window as any).sa_event || this.createEventFunction();
    
    // Configure privacy settings
    if (this.config.privacyMode) {
      (window as any).sa_config = {
        collect_dnt: false, // Respect DNT
        hash_mode: true,    // Use hash routing for SPAs
        auto_collect: true  // Automatically collect page views
      };
    }
  }

  /**
   * Create event function for SimpleAnalytics
   */
  private createEventFunction() {
    return (eventName: string, properties?: Record<string, any>) => {
      if (!this.config.enabled) return;
      
      // Send to SimpleAnalytics
      if (typeof window !== 'undefined' && (window as any).sa_event) {
        try {
          (window as any).sa_event(eventName, properties);
        } catch (error) {
          console.warn('Failed to send analytics event:', error);
        }
      }
    };
  }

  /**
   * Track custom event
   */
  trackEvent(name: string, properties?: Record<string, any>): void {
    const event: AnalyticsEvent = {
      name,
      properties: this.sanitizeProperties(properties),
      timestamp: Date.now()
    };

    if (this.isInitialized && this.config.enabled) {
      this.sendEvent(event);
    } else {
      // Queue event for later processing
      this.eventQueue.push(event);
    }
  }

  /**
   * Track page view
   */
  trackPageView(path?: string): void {
    if (!this.config.enabled) return;

    const properties = {
      path: path || (typeof window !== 'undefined' ? window.location.pathname : '/'),
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      timestamp: Date.now()
    };

    this.trackEvent('pageview', properties);
  }

  /**
   * Track parser usage
   */
  trackParserUsage(format: string, fileSize: number, parseTime: number, success: boolean): void {
    this.trackEvent('parser_usage', {
      format,
      file_size_kb: Math.round(fileSize / 1024),
      parse_time_ms: Math.round(parseTime),
      success,
      performance_tier: this.getPerformanceTier(parseTime)
    });
  }

  /**
   * Track error occurrence
   */
  trackError(errorType: string, errorMessage: string, context?: string): void {
    // Sanitize error message to avoid sending sensitive data
    const sanitizedMessage = this.sanitizeErrorMessage(errorMessage);
    
    this.trackEvent('error_occurred', {
      error_type: errorType,
      error_message: sanitizedMessage,
      context: context || 'unknown',
      timestamp: Date.now()
    });
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(feature: string, action: string, properties?: Record<string, any>): void {
    this.trackEvent('feature_usage', {
      feature,
      action,
      ...this.sanitizeProperties(properties)
    });
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metrics: {
    LCP?: number;
    FID?: number;
    CLS?: number;
    bundleSize?: number;
    memoryUsage?: number;
  }): void {
    this.trackEvent('performance_metrics', {
      lcp: metrics.LCP ? Math.round(metrics.LCP) : undefined,
      fid: metrics.FID ? Math.round(metrics.FID) : undefined,
      cls: metrics.CLS ? Math.round(metrics.CLS * 1000) / 1000 : undefined,
      bundle_size_kb: metrics.bundleSize ? Math.round(metrics.bundleSize / 1024) : undefined,
      memory_usage_mb: metrics.memoryUsage ? Math.round(metrics.memoryUsage / 1024 / 1024) : undefined
    });
  }

  /**
   * Send event to analytics service
   */
  private sendEvent(event: AnalyticsEvent): void {
    if (typeof window !== 'undefined' && (window as any).sa_event) {
      try {
        (window as any).sa_event(event.name, event.properties);
      } catch (error) {
        console.warn('Failed to send analytics event:', error);
      }
    }
  }

  /**
   * Process queued events
   */
  private processEventQueue(): void {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      if (event) {
        this.sendEvent(event);
      }
    }
  }

  /**
   * Sanitize properties to remove sensitive data
   */
  private sanitizeProperties(properties?: Record<string, any>): Record<string, any> | undefined {
    if (!properties) return undefined;

    const sanitized: Record<string, any> = {};
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credential'];

    for (const [key, value] of Object.entries(properties)) {
      const lowerKey = key.toLowerCase();
      
      // Skip sensitive keys
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        continue;
      }

      // Sanitize values
      if (typeof value === 'string') {
        sanitized[key] = value.length > 100 ? value.substring(0, 100) + '...' : value;
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (value !== null && value !== undefined) {
        sanitized[key] = String(value);
      }
    }

    return sanitized;
  }

  /**
   * Sanitize error messages
   */
  private sanitizeErrorMessage(message: string): string {
    // Remove file paths and sensitive information
    return message
      .replace(/[A-Z]:\\\w+[\\\w\s]*\\\w+\.\w+/g, '[FILE_PATH]')
      .replace(/\/[\w\s\/]*\/\w+\.\w+/g, '[FILE_PATH]')
      .replace(/password|secret|key|token|auth|credential/gi, '[REDACTED]')
      .substring(0, 200); // Limit length
  }

  /**
   * Get performance tier based on parse time
   */
  private getPerformanceTier(parseTime: number): string {
    if (parseTime < 100) return 'fast';
    if (parseTime < 500) return 'medium';
    if (parseTime < 2000) return 'slow';
    return 'very_slow';
  }

  /**
   * Check if in development mode
   */
  private isDevelopment(): boolean {
    return typeof window !== 'undefined' && 
           (window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1' ||
            window.location.hostname.includes('dev'));
  }

  /**
   * Check if user has Do Not Track enabled
   */
  private shouldRespectDNT(): boolean {
    if (!this.config.respectDNT) return false;
    
    return typeof navigator !== 'undefined' && 
           (navigator.doNotTrack === '1' || 
            navigator.doNotTrack === 'yes' ||
            (navigator as any).msDoNotTrack === '1');
  }

  /**
   * Get analytics configuration
   */
  getConfig(): Readonly<AnalyticsConfig> {
    return { ...this.config };
  }

  /**
   * Update analytics configuration
   */
  updateConfig(newConfig: Partial<AnalyticsConfig>): void {
    Object.assign(this.config, newConfig);
    
    // Reinitialize if needed
    if (this.isInitialized && this.config.enabled) {
      this.initialize();
    }
  }

  /**
   * Disable analytics (for privacy compliance)
   */
  disable(): void {
    this.config = { ...this.config, enabled: false };
    this.eventQueue = [];
    console.debug('Analytics disabled');
  }

  /**
   * Get analytics statistics
   */
  getStats(): {
    isInitialized: boolean;
    isEnabled: boolean;
    queuedEvents: number;
    isDevelopment: boolean;
    respectsDNT: boolean;
  } {
    return {
      isInitialized: this.isInitialized,
      isEnabled: this.config.enabled,
      queuedEvents: this.eventQueue.length,
      isDevelopment: this.isDevelopment(),
      respectsDNT: this.shouldRespectDNT()
    };
  }
}