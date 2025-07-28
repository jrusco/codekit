// Central exports and initialization for the formatting system
// Similar to Spring Boot's auto-configuration

// Core components
export { FormatRegistry, formatRegistry } from './FormatRegistry.ts';
export { FormatDetector, formatDetector } from './FormatDetector.ts';
export { PerformanceOptimizer, performanceOptimizer } from './PerformanceOptimizer.ts';

// Parsers
export { JsonParser } from './JsonParser.ts';
export { CsvParser } from './CsvParser.ts';
export { XmlParser } from './XmlParser.ts';

// Types (re-export for convenience)
export type { 
  FormatParser, 
  ParseResult, 
  ValidationError, 
  DetectionResult,
  CsvData,
  CsvRow,
  CsvColumn,
  CsvMetadata,
  XmlDocument,
  XmlNode,
  XmlAttribute,
  FormatParserConfig
} from '../../types/core.ts';

// Import required for initialization
import { formatRegistry } from './FormatRegistry.ts';
import { formatDetector } from './FormatDetector.ts';
import { performanceOptimizer } from './PerformanceOptimizer.ts';
import { LazyFormatLoader } from './LazyFormatLoader.ts';

/**
 * Initialize the formatting system with lazy loading for production optimization
 * Similar to Spring Boot's ComponentScan and auto-configuration
 */
export function initializeFormatters(): void {
  const isProduction = import.meta.env.PROD;
  
  if (isProduction) {
    // Use lazy loading in production for better performance
    const lazyLoader = LazyFormatLoader.getInstance();
    
    // Preload only the most common parser (JSON) for better UX
    lazyLoader.preloadCommonParsers().then(() => {
      console.debug('Lazy format loading initialized - parsers will load on demand');
    }).catch(error => {
      console.error('Failed to preload common parsers:', error);
    });
    
  } else {
    // Load all parsers immediately in development for better DX
    initializeAllParsers();
  }
}

/**
 * Initialize all parsers immediately (development mode)
 */
async function initializeAllParsers(): Promise<void> {
  try {
    // Dynamic imports for code splitting even in development
    const [
      { JsonParser },
      { CsvParser },
      { XmlParser }
    ] = await Promise.all([
      import('./JsonParser.ts'),
      import('./CsvParser.ts'),
      import('./XmlParser.ts')
    ]);

    // Register all format parsers
    const jsonParser = new JsonParser();
    const csvParser = new CsvParser();
    const xmlParser = new XmlParser();
    
    formatRegistry.register(jsonParser);
    formatRegistry.register(csvParser);
    formatRegistry.register(xmlParser);
    
    const registeredFormats = formatRegistry.getRegisteredFormats();
    console.debug('Multi-format system initialized with parsers:', registeredFormats);
    
    // Log parser statistics for monitoring
    const stats = formatRegistry.getStats();
    console.debug('Format registry stats:', {
      parsers: stats.registeredParsers,
      extensions: stats.supportedExtensions,
      mimeTypes: stats.supportedMimeTypes
    });
  } catch (error) {
    console.error('Failed to initialize formatters:', error);
    throw error;
  }
}

/**
 * Get system statistics for monitoring
 * Similar to Spring Actuator endpoints
 */
export function getFormatterStats() {
  return {
    registry: formatRegistry.getStats(),
    detector: formatDetector.getCacheStats(),
    performance: performanceOptimizer.getPerformanceMetrics()
  };
}