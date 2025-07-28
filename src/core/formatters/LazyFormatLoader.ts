// Lazy format loader for production bundle optimization
// Implements dynamic imports for better performance and smaller initial bundle

import type { FormatParser } from '../../types/core.js';
import { formatRegistry } from './FormatRegistry.js';

/**
 * Lazy loader for format parsers to optimize bundle size
 * Similar to Spring's lazy initialization patterns
 */
export class LazyFormatLoader {
  private static instance: LazyFormatLoader;
  private loadedParsers = new Map<string, Promise<FormatParser<any>>>();
  private parserFactories = new Map<string, () => Promise<FormatParser<any>>>();

  private constructor() {
    this.setupParserFactories();
  }

  static getInstance(): LazyFormatLoader {
    if (!LazyFormatLoader.instance) {
      LazyFormatLoader.instance = new LazyFormatLoader();
    }
    return LazyFormatLoader.instance;
  }

  /**
   * Setup parser factories with dynamic imports
   */
  private setupParserFactories(): void {
    // JSON Parser factory
    this.parserFactories.set('json', async () => {
      const { JsonParser } = await import('./JsonParser.js');
      return new JsonParser();
    });

    // CSV Parser factory
    this.parserFactories.set('csv', async () => {
      const { CsvParser } = await import('./CsvParser.js');
      return new CsvParser();
    });

    // XML Parser factory
    this.parserFactories.set('xml', async () => {
      const { XmlParser } = await import('./XmlParser.js');
      return new XmlParser();
    });
  }

  /**
   * Load parser on demand with caching
   */
  async loadParser(format: string): Promise<FormatParser<any> | null> {
    const normalizedFormat = format.toLowerCase();

    // Return already loaded parser
    if (this.loadedParsers.has(normalizedFormat)) {
      return await this.loadedParsers.get(normalizedFormat)!;
    }

    // Get parser factory
    const factory = this.parserFactories.get(normalizedFormat);
    if (!factory) {
      console.warn(`No parser factory found for format: ${format}`);
      return null;
    }

    // Create loading promise and cache it
    const loadingPromise = this.createParser(factory, normalizedFormat);
    this.loadedParsers.set(normalizedFormat, loadingPromise);

    return await loadingPromise;
  }

  /**
   * Create parser instance and register it
   */
  private async createParser(
    factory: () => Promise<FormatParser<any>>, 
    format: string
  ): Promise<FormatParser<any>> {
    try {
      console.debug(`Loading parser for format: ${format}`);
      const startTime = performance.now();
      
      const parser = await factory();
      
      // Register with format registry
      formatRegistry.register(parser);
      
      const loadTime = performance.now() - startTime;
      console.debug(`Parser ${format} loaded in ${loadTime.toFixed(2)}ms`);
      
      return parser;
    } catch (error) {
      console.error(`Failed to load parser for format ${format}:`, error);
      // Remove failed loading promise from cache
      this.loadedParsers.delete(format);
      throw error;
    }
  }

  /**
   * Preload commonly used parsers for better UX
   */
  async preloadCommonParsers(): Promise<void> {
    const commonFormats = ['json']; // Start with JSON as most common
    
    const preloadPromises = commonFormats.map(format => 
      this.loadParser(format).catch(error => {
        console.warn(`Failed to preload ${format} parser:`, error);
      })
    );

    await Promise.allSettled(preloadPromises);
    console.debug('Common parsers preloaded');
  }

  /**
   * Load parser based on format detection
   */
  async loadParserForContent(content: string): Promise<FormatParser<any> | null> {
    // Basic format detection to determine which parser to load
    const trimmed = content.trim();
    
    let format: string;
    
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      format = 'json';
    } else if (trimmed.startsWith('<') || trimmed.includes('<?xml')) {
      format = 'xml';
    } else if (trimmed.includes(',') || trimmed.includes('\t')) {
      format = 'csv';
    } else {
      // Default to JSON for unknown content
      format = 'json';
    }

    return await this.loadParser(format);
  }

  /**
   * Get loading statistics for monitoring
   */
  getLoadingStats(): {
    loadedParsers: string[];
    availableParsers: string[];
    cacheSize: number;
  } {
    return {
      loadedParsers: Array.from(this.loadedParsers.keys()),
      availableParsers: Array.from(this.parserFactories.keys()),
      cacheSize: this.loadedParsers.size
    };
  }

  /**
   * Clear parser cache (for testing or memory management)
   */
  clearCache(): void {
    this.loadedParsers.clear();
    console.debug('Parser cache cleared');
  }
}