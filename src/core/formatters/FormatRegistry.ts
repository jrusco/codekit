// Multi-format parser registry - similar to Spring's ApplicationContext pattern
import type { FormatParser, DetectionResult, ParseResult } from '../../types/core.ts';

/**
 * Central registry for format parsers with dependency injection pattern
 * Provides service discovery and format detection similar to Spring Boot auto-configuration
 */
export class FormatRegistry {
  private readonly parsers = new Map<string, FormatParser>();
  private readonly extensionMap = new Map<string, string>();
  private readonly mimeTypeMap = new Map<string, string>();

  /**
   * Register a format parser - similar to Spring's @Component registration
   */
  register(parser: FormatParser): void {
    const formatKey = parser.name.toLowerCase();
    
    // Prevent duplicate registrations
    if (this.parsers.has(formatKey)) {
      throw new Error(`Parser for format '${parser.name}' is already registered`);
    }

    this.parsers.set(formatKey, parser);

    // Build extension mapping for fast lookup
    for (const ext of parser.extensions) {
      this.extensionMap.set(ext.toLowerCase(), formatKey);
    }

    // Build MIME type mapping
    for (const mimeType of parser.mimeTypes) {
      this.mimeTypeMap.set(mimeType.toLowerCase(), formatKey);
    }
  }

  /**
   * Unregister a parser - useful for testing and dynamic configuration
   */
  unregister(formatName: string): boolean {
    const formatKey = formatName.toLowerCase();
    const parser = this.parsers.get(formatKey);
    
    if (!parser) {
      return false;
    }

    // Clean up mappings
    for (const ext of parser.extensions) {
      this.extensionMap.delete(ext.toLowerCase());
    }
    
    for (const mimeType of parser.mimeTypes) {
      this.mimeTypeMap.delete(mimeType.toLowerCase());
    }

    return this.parsers.delete(formatKey);
  }

  /**
   * Get parser by format name
   */
  getParser(formatName: string): FormatParser | null {
    return this.parsers.get(formatName.toLowerCase()) || null;
  }

  /**
   * Get parser by file extension
   */
  getParserByExtension(extension: string): FormatParser | null {
    const formatName = this.extensionMap.get(extension.toLowerCase());
    return formatName ? this.getParser(formatName) : null;
  }

  /**
   * Get parser by MIME type
   */
  getParserByMimeType(mimeType: string): FormatParser | null {
    const formatName = this.mimeTypeMap.get(mimeType.toLowerCase());
    return formatName ? this.getParser(formatName) : null;
  }

  /**
   * Get all registered format names
   */
  getRegisteredFormats(): string[] {
    return Array.from(this.parsers.keys());
  }

  /**
   * Get all registered parsers
   */
  getAllParsers(): FormatParser[] {
    return Array.from(this.parsers.values());
  }

  /**
   * Detect format with confidence scoring across all registered parsers
   * Similar to Spring's content negotiation
   */
  detectFormat(content: string, filename?: string, mimeType?: string): DetectionResult {
    const candidates: DetectionResult[] = [];

    // Try hint-based detection first (filename/MIME type)
    if (filename) {
      const ext = this.extractExtension(filename);
      if (ext) {
        const parser = this.getParserByExtension(ext);
        if (parser) {
          const result = parser.detect(content);
          candidates.push({
            ...result,
            confidence: result.confidence + 20, // Bonus for filename hint
            evidence: [...result.evidence, `Filename suggests ${parser.name}`]
          });
        }
      }
    }

    if (mimeType) {
      const parser = this.getParserByMimeType(mimeType);
      if (parser) {
        const result = parser.detect(content);
        candidates.push({
          ...result,
          confidence: result.confidence + 15, // Bonus for MIME type hint
          evidence: [...result.evidence, `MIME type suggests ${parser.name}`]
        });
      }
    }

    // Run detection on all parsers
    for (const parser of this.parsers.values()) {
      // Skip if already detected via hints
      const alreadyDetected = candidates.some(c => c.format === parser.name.toLowerCase());
      if (!alreadyDetected) {
        const result = parser.detect(content);
        if (result.confidence > 0) {
          candidates.push(result);
        }
      }
    }

    // Return the highest confidence result
    if (candidates.length === 0) {
      return {
        format: 'unknown',
        confidence: 0,
        evidence: ['No format detected by any parser']
      };
    }

    // Sort by confidence and return the best match
    candidates.sort((a, b) => b.confidence - a.confidence);
    const best = candidates[0];

    // Add competitive analysis to evidence
    if (candidates.length > 1) {
      const runner_up = candidates[1];
      best.evidence.push(`Confidence: ${best.confidence}% (vs ${runner_up.format}: ${runner_up.confidence}%)`);
    }

    return best;
  }

  /**
   * Parse content using the most appropriate parser
   * Includes automatic format detection if format not specified
   */
  parse(content: string, options: {
    format?: string;
    filename?: string;
    mimeType?: string;
  } = {}): ParseResult {
    let parser: FormatParser | null = null;

    // Use specified format if provided
    if (options.format) {
      parser = this.getParser(options.format);
      if (!parser) {
        return {
          isValid: false,
          data: null,
          errors: [{
            message: `Unknown format: ${options.format}`,
            code: 'UNKNOWN_FORMAT',
            severity: 'error'
          }],
          metadata: {
            parseTime: 0,
            fileSize: new Blob([content]).size,
            format: options.format,
            confidence: 0
          }
        };
      }
    } else {
      // Auto-detect format
      const detection = this.detectFormat(content, options.filename, options.mimeType);
      
      if (detection.format === 'unknown' || detection.confidence < 50) {
        return {
          isValid: false,
          data: null,
          errors: [{
            message: `Cannot determine format. Confidence: ${detection.confidence}%`,
            code: 'FORMAT_DETECTION_FAILED',
            severity: 'error'
          }],
          metadata: {
            parseTime: 0,
            fileSize: new Blob([content]).size,
            format: 'unknown',
            confidence: detection.confidence
          }
        };
      }

      parser = this.getParser(detection.format);
      if (!parser) {
        return {
          isValid: false,
          data: null,
          errors: [{
            message: `Parser not found for detected format: ${detection.format}`,
            code: 'PARSER_NOT_FOUND',
            severity: 'error'
          }],
          metadata: {
            parseTime: 0,
            fileSize: new Blob([content]).size,
            format: detection.format,
            confidence: detection.confidence
          }
        };
      }
    }

    // Parse using the selected parser
    return parser.parse(content);
  }

  /**
   * Validate content using appropriate parser
   */
  validate(content: string, options: {
    format?: string;
    filename?: string;
    mimeType?: string;
  } = {}) {
    let parser: FormatParser | null = null;

    if (options.format) {
      parser = this.getParser(options.format);
    } else {
      const detection = this.detectFormat(content, options.filename, options.mimeType);
      if (detection.format !== 'unknown') {
        parser = this.getParser(detection.format);
      }
    }

    if (!parser) {
      return [{
        message: 'Cannot validate - format not detected or parser not available',
        code: 'VALIDATION_UNAVAILABLE',
        severity: 'warning' as const
      }];
    }

    return parser.validate(content);
  }

  /**
   * Get registry statistics for monitoring
   * Similar to Spring Actuator health endpoints
   */
  getStats() {
    const stats = {
      registeredParsers: this.parsers.size,
      supportedExtensions: this.extensionMap.size,
      supportedMimeTypes: this.mimeTypeMap.size,
      formats: Array.from(this.parsers.keys()),
      extensions: Array.from(this.extensionMap.keys()),
      mimeTypes: Array.from(this.mimeTypeMap.keys())
    };

    return stats;
  }

  /**
   * Clear all registered parsers - useful for testing
   */
  clear(): void {
    this.parsers.clear();
    this.extensionMap.clear();
    this.mimeTypeMap.clear();
  }

  /**
   * Extract file extension from filename
   */
  private extractExtension(filename: string): string | null {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1 || lastDot === filename.length - 1) {
      return null;
    }
    return filename.substring(lastDot + 1);
  }
}

// Singleton instance for application-wide use
// Similar to Spring's ApplicationContext
export const formatRegistry = new FormatRegistry();