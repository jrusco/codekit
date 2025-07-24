// Performance optimization engine for large dataset processing
import type { ParseResult } from '../../types/core.ts';

/**
 * Performance optimization service for handling large datasets efficiently
 * Similar to Java's concurrent processing and memory management patterns
 */
export class PerformanceOptimizer {
  private readonly chunkSize = 1024 * 1024; // 1MB chunks
  private readonly memoryThreshold = 50 * 1024 * 1024; // 50MB threshold
  private readonly maxWorkers = navigator.hardwareConcurrency || 4;
  private readonly workerPool: Worker[] = [];

  /**
   * Initialize web worker pool for concurrent processing
   * Similar to Java's ThreadPoolExecutor
   */
  constructor() {
    this.initializeWorkerPool();
  }

  /**
   * Optimize parsing for large content with memory-efficient chunking
   */
  async optimizedParse<T>(
    content: string,
    parser: (chunk: string) => ParseResult<T>,
    options: {
      useWorkers?: boolean;
      chunkSize?: number;
      memoryLimit?: number;
    } = {}
  ): Promise<ParseResult<T>> {
    const {
      useWorkers = true,
      chunkSize = this.chunkSize,
      memoryLimit = this.memoryThreshold
    } = options;

    const contentSize = new Blob([content]).size;
    
    // Direct parsing for small content
    if (contentSize < chunkSize) {
      return parser(content);
    }

    // Memory-efficient parsing for large content
    if (contentSize > memoryLimit) {
      return this.memoryEfficientParse(content, parser, chunkSize);
    }

    // Worker-based parsing for medium-large content
    if (useWorkers && this.workerPool.length > 0) {
      return this.workerBasedParse(content, parser);
    }

    // Fallback to chunked parsing
    return this.chunkedParse(content, parser, chunkSize);
  }

  /**
   * Memory-efficient parsing with streaming approach
   * Similar to Java's streaming API for large datasets
   */
  private async memoryEfficientParse<T>(
    content: string,
    parser: (chunk: string) => ParseResult<T>,
    chunkSize: number
  ): Promise<ParseResult<T>> {
    const startTime = performance.now();
    const contentLength = content.length;
    let position = 0;
    const results: ParseResult<T>[] = [];

    try {
      while (position < contentLength) {
        // Extract chunk
        const chunk = content.substring(position, position + chunkSize);
        
        // Parse chunk
        const result = parser(chunk);
        results.push(result);

        // Memory cleanup hint
        if (position % (chunkSize * 5) === 0) {
          await this.yieldToEventLoop();
          this.triggerGarbageCollection();
        }

        position += chunkSize;
      }

      // Merge results
      return this.mergeResults(results, performance.now() - startTime, new Blob([content]).size);

    } catch (error) {
      return this.createErrorResult(error, performance.now() - startTime, new Blob([content]).size);
    }
  }

  /**
   * Worker-based parsing for concurrent processing
   */
  private async workerBasedParse<T>(
    content: string,
    parser: (chunk: string) => ParseResult<T>
  ): Promise<ParseResult<T>> {
    // For now, fallback to chunked parsing since we need to serialize the parser function
    // In a real implementation, we'd have worker scripts with built-in parsers
    return this.chunkedParse(content, parser, this.chunkSize);
  }

  /**
   * Chunked parsing with progress tracking
   */
  private async chunkedParse<T>(
    content: string,
    parser: (chunk: string) => ParseResult<T>,
    chunkSize: number
  ): Promise<ParseResult<T>> {
    const startTime = performance.now();
    const chunks = this.splitIntoChunks(content, chunkSize);
    const results: ParseResult<T>[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const result = parser(chunk);
      results.push(result);

      // Yield to event loop periodically to maintain responsiveness
      if (i % 10 === 0) {
        await this.yieldToEventLoop();
      }
    }

    return this.mergeResults(results, performance.now() - startTime, new Blob([content]).size);
  }

  /**
   * Split content into processing chunks intelligently
   * Attempts to split at logical boundaries (newlines, braces, etc.)
   */
  private splitIntoChunks(content: string, chunkSize: number): string[] {
    if (content.length <= chunkSize) {
      return [content];
    }

    const chunks: string[] = [];
    let position = 0;

    while (position < content.length) {
      let endPosition = Math.min(position + chunkSize, content.length);
      
      // Try to find a logical break point near the chunk boundary
      if (endPosition < content.length) {
        const searchStart = Math.max(endPosition - 100, position);
        const searchEnd = Math.min(endPosition + 100, content.length);
        const segment = content.substring(searchStart, searchEnd);
        
        // Look for natural break points
        const breakPoints = ['\n', '}', ']', ','];
        let bestBreak = -1;
        
        for (const breakPoint of breakPoints) {
          const index = segment.lastIndexOf(breakPoint);
          if (index > bestBreak) {
            bestBreak = index;
          }
        }
        
        if (bestBreak !== -1) {
          endPosition = searchStart + bestBreak + 1;
        }
      }

      chunks.push(content.substring(position, endPosition));
      position = endPosition;
    }

    return chunks;
  }

  /**
   * Merge multiple parse results into a single result
   * Aggregates errors and metadata appropriately
   */
  private mergeResults<T>(
    results: ParseResult<T>[],
    totalParseTime: number,
    totalFileSize: number
  ): ParseResult<T> {
    if (results.length === 0) {
      return this.createErrorResult(
        new Error('No results to merge'),
        totalParseTime,
        totalFileSize
      );
    }

    // Check if any chunk failed
    const hasErrors = results.some(r => !r.isValid);
    
    if (hasErrors) {
      // Collect all errors
      const allErrors = results.flatMap(r => r.errors);
      
      return {
        isValid: false,
        data: null,
        errors: allErrors,
        metadata: {
          parseTime: totalParseTime,
          fileSize: totalFileSize,
          format: results[0]?.metadata.format || 'unknown',
          confidence: 0
        }
      };
    }

    // Merge successful results
    const mergedData = this.mergeData(results.map(r => r.data));
    const avgConfidence = results.reduce((sum, r) => sum + r.metadata.confidence, 0) / results.length;

    return {
      isValid: true,
      data: mergedData,
      errors: [],
      metadata: {
        parseTime: totalParseTime,
        fileSize: totalFileSize,
        format: results[0].metadata.format,
        confidence: avgConfidence
      }
    };
  }

  /**
   * Merge parsed data from multiple chunks
   * Strategy depends on data type (arrays concatenate, objects merge, etc.)
   */
  private mergeData<T>(dataChunks: (T | null)[]): T | null {
    const validChunks = dataChunks.filter(chunk => chunk !== null) as T[];
    
    if (validChunks.length === 0) {
      return null;
    }

    if (validChunks.length === 1) {
      return validChunks[0];
    }

    // Try to intelligently merge based on data type
    const firstChunk = validChunks[0];
    
    if (Array.isArray(firstChunk)) {
      // Concatenate arrays
      let result = firstChunk as unknown[];
      for (let i = 1; i < validChunks.length; i++) {
        const chunk = validChunks[i];
        if (Array.isArray(chunk)) {
          result = result.concat(chunk);
        }
      }
      return result as T;
    }

    if (typeof firstChunk === 'object' && firstChunk !== null) {
      // Merge objects
      let result = firstChunk as Record<string, unknown>;
      for (let i = 1; i < validChunks.length; i++) {
        const chunk = validChunks[i];
        if (typeof chunk === 'object' && chunk !== null) {
          result = { ...result, ...(chunk as Record<string, unknown>) };
        }
      }
      return result as T;
    }

    // For primitive types, return the first valid chunk
    return firstChunk;
  }

  /**
   * Create error result with metadata
   */
  private createErrorResult<T>(
    error: any,
    parseTime: number,
    fileSize: number
  ): ParseResult<T> {
    return {
      isValid: false,
      data: null,
      errors: [{
        message: error.message || 'Performance optimization error',
        code: 'OPTIMIZATION_ERROR',
        severity: 'error'
      }],
      metadata: {
        parseTime,
        fileSize,
        format: 'unknown',
        confidence: 0
      }
    };
  }

  /**
   * Yield control to event loop for responsiveness
   * Similar to Java's Thread.yield()
   */
  private async yieldToEventLoop(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  /**
   * Trigger garbage collection hint
   * Similar to Java's System.gc() suggestion
   */
  private triggerGarbageCollection(): void {
    // Modern browsers handle GC automatically, but we can hint
    // by clearing any local references and temporary variables
    
    // Force a minor GC opportunity by creating and releasing pressure
    if (typeof (globalThis as any).gc === 'function') {
      (globalThis as any).gc();
    }
  }

  /**
   * Initialize worker pool for concurrent processing
   */
  private initializeWorkerPool(): void {
    // In a full implementation, we'd create actual web workers here
    // For now, we'll use the main thread with chunking
    console.debug(`Performance optimizer initialized with ${this.maxWorkers} logical workers`);
  }

  /**
   * Monitor memory usage and performance metrics
   * Similar to Java's memory management monitoring
   */
  getPerformanceMetrics(): {
    memoryUsage?: number;
    availableWorkers: number;
    chunkSize: number;
    memoryThreshold: number;
  } {
    const metrics = {
      availableWorkers: this.maxWorkers,
      chunkSize: this.chunkSize,
      memoryThreshold: this.memoryThreshold
    };

    // Add memory info if available (Chrome DevTools)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      (metrics as any).memoryUsage = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      };
    }

    return metrics;
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    // Cleanup worker pool if we had actual workers
    this.workerPool.forEach(worker => worker.terminate());
    this.workerPool.length = 0;
  }
}

// Singleton instance for application use
export const performanceOptimizer = new PerformanceOptimizer();