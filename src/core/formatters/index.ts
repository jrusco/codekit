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
import { JsonParser } from './JsonParser.ts';
import { CsvParser } from './CsvParser.ts';
import { XmlParser } from './XmlParser.ts';
import { formatRegistry } from './FormatRegistry.ts';
import { formatDetector } from './FormatDetector.ts';
import { performanceOptimizer } from './PerformanceOptimizer.ts';

/**
 * Initialize the formatting system with all available parsers
 * Similar to Spring Boot's ComponentScan and auto-configuration
 */
export function initializeFormatters(): void {
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