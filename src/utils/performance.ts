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
 * Performance monitor - similar to Spring's @Timed annotation
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
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
}