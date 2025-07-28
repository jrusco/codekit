// Performance monitoring utilities - enterprise observability patterns

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  readonly startTime: number;
  readonly endTime: number;
  readonly duration: number;
  readonly memoryUsage?: number;
  readonly operation: string;
}

/**
 * Core Web Vitals metrics interface
 */
export interface WebVitalsMetrics {
  LCP?: number; // Largest Contentful Paint
  FID?: number; // First Input Delay
  CLS?: number; // Cumulative Layout Shift
  FCP?: number; // First Contentful Paint
  TTFB?: number; // Time to First Byte
}

/**
 * Memory leak detection metrics
 */
export interface MemoryLeakMetrics {
  readonly heapUsed: number;
  readonly heapTotal: number;
  readonly timestamp: number;
  readonly operation: string;
  readonly leakSuspected: boolean;
}

/**
 * Enhanced Performance monitor with Core Web Vitals and memory leak detection
 * Similar to Spring's @Timed annotation with enterprise observability
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private webVitalsMetrics: WebVitalsMetrics = {};
  private memoryLeakMetrics: MemoryLeakMetrics[] = [];
  private baselineMemory: number = 0;
  private memoryObserver?: PerformanceObserver;
  private webVitalsObserver?: PerformanceObserver;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeWebVitalsMonitoring();
      this.initializeMemoryLeakDetection();
      this.establishMemoryBaseline();
    }
  }

  /**
   * Start timing operation
   */
  startTiming(operation: string): () => PerformanceMetrics {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();

    return (): PerformanceMetrics => {
      const endTime = performance.now();
      const endMemory = this.getMemoryUsage();
      
      const metrics: PerformanceMetrics = {
        startTime,
        endTime,
        duration: endTime - startTime,
        memoryUsage: endMemory && startMemory ? endMemory - startMemory : undefined,
        operation
      };

      this.metrics.push(metrics);
      this.logMetrics(metrics);
      
      return metrics;
    };
  }

  /**
   * Decorator for measuring method performance
   */
  static measurePerformance<T extends any[], R>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<(...args: T) => R>
  ): void {
    const originalMethod = descriptor.value!;
    
    descriptor.value = function (this: any, ...args: T): R {
      const monitor = PerformanceMonitor.getInstance();
      const endTiming = monitor.startTiming(`${target.constructor.name}.${propertyKey}`);
      
      try {
        const result = originalMethod.apply(this, args);
        endTiming();
        return result;
      } catch (error) {
        endTiming();
        throw error;
      }
    } as any;
  }

  private getMemoryUsage(): number | undefined {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return undefined;
  }

  private logMetrics(metrics: PerformanceMetrics): void {
    if (metrics.duration > 100) { // Log slow operations
      console.warn(`Slow operation detected: ${metrics.operation} took ${metrics.duration.toFixed(2)}ms`);
    }
  }

  getMetrics(): readonly PerformanceMetrics[] {
    return [...this.metrics];
  }

  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Initialize Core Web Vitals monitoring
   */
  private initializeWebVitalsMonitoring(): void {
    try {
      // Monitor paint metrics (LCP, FCP)
      this.webVitalsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          switch (entry.entryType) {
            case 'largest-contentful-paint':
              this.webVitalsMetrics.LCP = entry.startTime;
              break;
            case 'first-contentful-paint':
            case 'paint':
              if (entry.name === 'first-contentful-paint') {
                this.webVitalsMetrics.FCP = entry.startTime;
              }
              break;
            case 'navigation':
              const navEntry = entry as PerformanceNavigationTiming;
              this.webVitalsMetrics.TTFB = navEntry.responseStart - navEntry.requestStart;
              break;
          }
        }
      });

      // Register observers for different metrics
      if ('PerformanceObserver' in window) {
        try {
          this.webVitalsObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        } catch (e) {
          console.debug('LCP observer not supported');
        }

        try {
          this.webVitalsObserver.observe({ entryTypes: ['paint'] });
        } catch (e) {
          console.debug('Paint observer not supported');
        }

        try {
          this.webVitalsObserver.observe({ entryTypes: ['navigation'] });
        } catch (e) {
          console.debug('Navigation observer not supported');
        }
      }

      // Monitor First Input Delay (FID)
      this.monitorFirstInputDelay();

      // Monitor Cumulative Layout Shift (CLS)
      this.monitorLayoutShift();

    } catch (error) {
      console.warn('Failed to initialize Web Vitals monitoring:', error);
    }
  }

  /**
   * Monitor First Input Delay
   */
  private monitorFirstInputDelay(): void {
    let firstInputProcessed = false;

    const processFirstInput = (event: Event) => {
      if (firstInputProcessed) return;
      firstInputProcessed = true;

      const startTime = performance.now();
      // Use requestIdleCallback to measure when the input is actually processed
      requestIdleCallback(() => {
        this.webVitalsMetrics.FID = performance.now() - startTime;
      });
    };

    // Listen for first user interactions
    ['click', 'keydown', 'touchstart'].forEach(eventType => {
      document.addEventListener(eventType, processFirstInput, { once: true, passive: true });
    });
  }

  /**
   * Monitor Cumulative Layout Shift
   */
  private monitorLayoutShift(): void {
    let cumulativeScore = 0;

    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
              cumulativeScore += (entry as any).value;
              this.webVitalsMetrics.CLS = cumulativeScore;
            }
          }
        });

        observer.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        console.debug('Layout shift observer not supported');
      }
    }
  }

  /**
   * Initialize memory leak detection
   */
  private initializeMemoryLeakDetection(): void {
    if (!this.isMemoryAPIAvailable()) {
      console.debug('Memory API not available for leak detection');
      return;
    }

    // Monitor memory every 30 seconds
    setInterval(() => {
      this.checkForMemoryLeaks('periodic-check');
    }, 30000);
  }

  /**
   * Establish memory baseline
   */
  private establishMemoryBaseline(): void {
    if (this.isMemoryAPIAvailable()) {
      // Wait for initial load to settle
      setTimeout(() => {
        this.baselineMemory = this.getCurrentMemoryUsage() || 0;
        console.debug(`Memory baseline established: ${this.baselineMemory} bytes`);
      }, 5000);
    }
  }

  /**
   * Check for potential memory leaks
   */
  checkForMemoryLeaks(operation: string): void {
    if (!this.isMemoryAPIAvailable()) return;

    const currentMemory = this.getCurrentMemoryUsage();
    if (!currentMemory) return;

    const memoryGrowth = currentMemory - this.baselineMemory;
    const growthPercentage = this.baselineMemory > 0 ? (memoryGrowth / this.baselineMemory) * 100 : 0;

    // Consider memory leak if growth > 200% of baseline
    const leakSuspected = growthPercentage > 200;

    const leakMetric: MemoryLeakMetrics = {
      heapUsed: currentMemory,
      heapTotal: (performance as any).memory.totalJSHeapSize,
      timestamp: Date.now(),
      operation,
      leakSuspected
    };

    this.memoryLeakMetrics.push(leakMetric);

    // Keep only last 100 memory measurements
    if (this.memoryLeakMetrics.length > 100) {
      this.memoryLeakMetrics.shift();
    }

    if (leakSuspected) {
      console.warn(`Potential memory leak detected during ${operation}:`, {
        current: `${(currentMemory / 1024 / 1024).toFixed(2)}MB`,
        baseline: `${(this.baselineMemory / 1024 / 1024).toFixed(2)}MB`,
        growth: `${growthPercentage.toFixed(1)}%`
      });
    }
  }

  /**
   * Get current memory usage
   */
  private getCurrentMemoryUsage(): number | undefined {
    if (this.isMemoryAPIAvailable()) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return undefined;
  }

  /**
   * Check if memory API is available
   */
  private isMemoryAPIAvailable(): boolean {
    return typeof window !== 'undefined' && 
           'performance' in window && 
           'memory' in performance;
  }

  /**
   * Get Core Web Vitals metrics
   */
  getWebVitalsMetrics(): WebVitalsMetrics {
    return { ...this.webVitalsMetrics };
  }

  /**
   * Get memory leak detection metrics
   */
  getMemoryLeakMetrics(): MemoryLeakMetrics[] {
    return [...this.memoryLeakMetrics];
  }

  /**
   * Get comprehensive performance report
   */
  getPerformanceReport(): {
    operationMetrics: PerformanceMetrics[];
    webVitals: WebVitalsMetrics;
    memoryLeaks: MemoryLeakMetrics[];
    summary: {
      totalOperations: number;
      averageOperationTime: number;
      slowOperations: number;
      memoryLeaksSuspected: number;
      webVitalsScore: string;
    };
  } {
    const slowOperations = this.metrics.filter(m => m.duration > 100).length;
    const averageTime = this.metrics.length > 0 
      ? this.metrics.reduce((sum, m) => sum + m.duration, 0) / this.metrics.length 
      : 0;
    
    const memoryLeaksSuspected = this.memoryLeakMetrics.filter(m => m.leakSuspected).length;
    
    // Calculate Web Vitals score (simplified)
    const webVitalsScore = this.calculateWebVitalsScore();

    return {
      operationMetrics: [...this.metrics],
      webVitals: { ...this.webVitalsMetrics },
      memoryLeaks: [...this.memoryLeakMetrics],
      summary: {
        totalOperations: this.metrics.length,
        averageOperationTime: averageTime,
        slowOperations,
        memoryLeaksSuspected,
        webVitalsScore
      }
    };
  }

  /**
   * Calculate simplified Web Vitals score
   */
  private calculateWebVitalsScore(): string {
    let score = 100;
    
    // LCP scoring (good: <2.5s, needs improvement: 2.5-4s, poor: >4s)
    if (this.webVitalsMetrics.LCP) {
      if (this.webVitalsMetrics.LCP > 4000) score -= 30;
      else if (this.webVitalsMetrics.LCP > 2500) score -= 15;
    }
    
    // FID scoring (good: <100ms, needs improvement: 100-300ms, poor: >300ms)
    if (this.webVitalsMetrics.FID) {
      if (this.webVitalsMetrics.FID > 300) score -= 25;
      else if (this.webVitalsMetrics.FID > 100) score -= 10;
    }
    
    // CLS scoring (good: <0.1, needs improvement: 0.1-0.25, poor: >0.25)
    if (this.webVitalsMetrics.CLS) {
      if (this.webVitalsMetrics.CLS > 0.25) score -= 25;
      else if (this.webVitalsMetrics.CLS > 0.1) score -= 10;
    }

    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Needs Improvement';
    return 'Poor';
  }

  /**
   * Cleanup observers (for testing or shutdown)
   */
  cleanup(): void {
    if (this.webVitalsObserver) {
      this.webVitalsObserver.disconnect();
    }
    if (this.memoryObserver) {
      this.memoryObserver.disconnect();
    }
  }
}