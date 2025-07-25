// Enterprise-grade type definitions - similar to Java interfaces/DTOs

/**
 * Core parsing result interface - like Spring's ResponseEntity pattern
 */
export interface ParseResult<T = any> {
  readonly isValid: boolean;
  readonly data: T | null;
  readonly errors: ValidationError[];
  readonly metadata: ParseMetadata;
}

/**
 * Validation error with detailed context - like Bean Validation violations
 */
export interface ValidationError {
  readonly message: string;
  readonly line?: number;
  readonly column?: number;
  readonly code: string;
  readonly severity: 'error' | 'warning' | 'info';
}

/**
 * Parse metadata for performance monitoring
 */
export interface ParseMetadata {
  readonly parseTime: number;
  readonly fileSize: number;
  readonly format: string;
  readonly confidence: number;
}

/**
 * Format detection result with confidence scoring
 */
export interface DetectionResult {
  readonly format: string;
  readonly confidence: number;
  readonly evidence: string[];
}

/**
 * Base parser interface - like Spring's Repository pattern
 */
export interface FormatParser<T = any> {
  readonly name: string;
  readonly extensions: readonly string[];
  readonly mimeTypes: readonly string[];
  
  detect(content: string): DetectionResult;
  parse(content: string): ParseResult<T>;
  validate(content: string): ValidationError[];
}

/**
 * Render mode type union for better performance
 */
export type RenderMode = 'text' | 'interactive';

export const RenderMode = {
  TEXT: 'text' as const,
  INTERACTIVE: 'interactive' as const
} as const;

/**
 * Session data interface for persistence
 */
export interface SessionData {
  readonly content: string;
  readonly format: string;
  readonly renderMode: RenderMode;
  readonly timestamp: number;
}

// === CSV Format Types ===

/**
 * Detected data type for CSV cells
 */
export type CsvCellType = 'string' | 'number' | 'boolean' | 'date' | 'null';

/**
 * Individual CSV row with typed data
 */
export interface CsvRow {
  readonly index: number;
  readonly cells: CsvCell[];
  readonly isValid: boolean;
  readonly errors: string[];
}

/**
 * Individual CSV cell with type information
 */
export interface CsvCell {
  readonly value: string | number | boolean | Date | null;
  readonly rawValue: string;
  readonly type: CsvCellType;
  readonly columnIndex: number;
}

/**
 * CSV column metadata for type inference and validation
 */
export interface CsvColumn {
  readonly name: string;
  readonly index: number;
  readonly inferredType: CsvCellType;
  readonly typeConfidence: number;
  readonly nullable: boolean;
  readonly samples: string[];
}

/**
 * Parsed CSV data structure with metadata
 */
export interface CsvData {
  readonly headers: string[];
  readonly columns: CsvColumn[];
  readonly rows: CsvRow[];
  readonly metadata: CsvMetadata;
}

/**
 * CSV parsing metadata
 */
export interface CsvMetadata {
  readonly delimiter: string;
  readonly hasHeaders: boolean;
  readonly rowCount: number;
  readonly columnCount: number;
  readonly encoding: string;
  readonly lineEnding: '\n' | '\r\n' | '\r';
  readonly quoteChar: string;
  readonly escapeChar: string;
}

// === XML Format Types ===

/**
 * XML node types for DOM-like structure
 */
export type XmlNodeType = 'element' | 'text' | 'comment' | 'cdata' | 'processing-instruction';

/**
 * XML attribute with namespace support
 */
export interface XmlAttribute {
  readonly name: string;
  readonly value: string;
  readonly namespace?: string;
  readonly prefix?: string;
}

/**
 * XML node in DOM-like tree structure
 */
export interface XmlNode {
  readonly type: XmlNodeType;
  readonly name: string;
  readonly value?: string;
  readonly attributes: XmlAttribute[];
  readonly children: XmlNode[];
  readonly parent?: XmlNode;
  readonly namespace?: string;
  readonly prefix?: string;
}

/**
 * XML declaration information
 */
export interface XmlDeclaration {
  readonly version: string;
  readonly encoding?: string;
  readonly standalone?: boolean;
}

/**
 * Parsed XML document structure
 */
export interface XmlDocument {
  readonly declaration?: XmlDeclaration;
  readonly root: XmlNode;
  readonly namespaces: Map<string, string>;
  readonly processingInstructions: XmlNode[];
  readonly comments: XmlNode[];
}

// === Enhanced Format Parser Types ===

/**
 * CSV validation configuration for comprehensive linting
 * Similar to Spring Boot's @ConfigurationProperties pattern
 */
export interface CsvValidationConfig {
  readonly enableDataQualityChecks: boolean;
  readonly enableSecurityValidation: boolean;
  readonly enablePerformanceWarnings: boolean;
  readonly enableEncodingValidation: boolean;
  readonly enableHeaderValidation: boolean;
  readonly maxFileSize: number; // in bytes
  readonly maxRowCount: number;
  readonly maxColumnCount: number;
  readonly checkCsvInjection: boolean;
  readonly validateDataTypes: boolean;
  readonly strictDelimiterConsistency: boolean;
  readonly warnOnMixedLineEndings: boolean;
}

/**
 * CSV validation profiles for different use cases
 */
export type CsvValidationProfile = 'strict' | 'lenient' | 'security-focused' | 'performance-focused' | 'custom';

/**
 * Format-specific parser configuration
 */
export interface FormatParserConfig {
  readonly csv?: {
    delimiter?: string;
    hasHeaders?: boolean;
    quoteChar?: string;
    escapeChar?: string;
    skipEmptyLines?: boolean;
    validation?: Partial<CsvValidationConfig>;
  };
  readonly xml?: {
    preserveWhitespace?: boolean;
    validateStructure?: boolean;
    resolveNamespaces?: boolean;
    includeComments?: boolean;
  };
}