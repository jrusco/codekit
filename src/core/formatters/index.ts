// Central exports and initialization for the formatting system
// Similar to Spring Boot's auto-configuration

// Core components
export { FormatRegistry, formatRegistry } from './FormatRegistry.ts';
export { FormatDetector, formatDetector } from './FormatDetector.ts';
export { PerformanceOptimizer, performanceOptimizer } from './PerformanceOptimizer.ts';

// Parsers
export { JsonParser } from './JsonParser.ts';

// Types (re-export for convenience)
export type { FormatParser, ParseResult, ValidationError, DetectionResult } from '../../types/core.ts';

// Import required for initialization
import { JsonParser } from './JsonParser.ts';
import { formatRegistry } from './FormatRegistry.ts';
import { formatDetector } from './FormatDetector.ts';
import { performanceOptimizer } from './PerformanceOptimizer.ts';

/**
 * Initialize the formatting system with default parsers
 * Similar to Spring Boot's ComponentScan and auto-configuration
 */
export function initializeFormatters(): void {
  // Register JSON parser
  const jsonParser = new JsonParser();
  formatRegistry.register(jsonParser);
  
  console.debug('Formatting system initialized with parsers:', formatRegistry.getRegisteredFormats());
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