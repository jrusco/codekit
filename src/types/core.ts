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