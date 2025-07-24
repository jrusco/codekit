// Advanced format detection engine with confidence scoring
import type { DetectionResult } from '../../types/core.ts';
import { formatRegistry } from './FormatRegistry.ts';

/**
 * Intelligent format detection service with machine learning-like confidence scoring
 * Provides enterprise-grade format identification similar to Apache Tika
 */
export class FormatDetector {
  private readonly detectionCache = new Map<string, DetectionResult>();
  private readonly maxCacheSize = 100;

  /**
   * Detect format with comprehensive analysis and caching
   * Similar to Spring's caching annotations
   */
  detect(content: string, options: {
    filename?: string;
    mimeType?: string;
    useCache?: boolean;
  } = {}): DetectionResult {
    const { filename, mimeType, useCache = true } = options;
    
    // Generate cache key for performance
    const cacheKey = this.generateCacheKey(content, filename || '', mimeType || '');
    
    if (useCache && this.detectionCache.has(cacheKey)) {
      return this.detectionCache.get(cacheKey)!;
    }

    // Perform multi-stage detection
    const result = this.performDetection(content, filename, mimeType);
    
    // Cache result if using cache
    if (useCache) {
      this.addToCache(cacheKey, result);
    }

    return result;
  }

  /**
   * Fast detection using file signature analysis
   * Similar to Unix file command magic numbers
   */
  detectBySignature(content: string): DetectionResult {
    const signatures = this.getFormatSignatures();
    const trimmed = content.trim();
    
    for (const [format, signature] of signatures) {
      if (signature.test(trimmed)) {
        return {
          format,
          confidence: 95, // High confidence for signature matches
          evidence: [`File signature matches ${format.toUpperCase()} format`]
        };
      }
    }

    return {
      format: 'unknown',
      confidence: 0,
      evidence: ['No matching file signature found']
    };
  }

  /**
   * Detect format using filename heuristics
   */
  detectByFilename(filename: string): DetectionResult {
    if (!filename) {
      return { format: 'unknown', confidence: 0, evidence: ['No filename provided'] };
    }

    const extension = this.extractExtension(filename);
    if (!extension) {
      return { format: 'unknown', confidence: 0, evidence: ['No file extension found'] };
    }

    const parser = formatRegistry.getParserByExtension(extension);
    if (parser) {
      return {
        format: parser.name.toLowerCase(),
        confidence: 70, // Moderate confidence for extension-based detection
        evidence: [`File extension .${extension} suggests ${parser.name} format`]
      };
    }

    return {
      format: 'unknown',
      confidence: 0,
      evidence: [`Unknown file extension: .${extension}`]
    };
  }

  /**
   * Detect format using MIME type
   */
  detectByMimeType(mimeType: string): DetectionResult {
    if (!mimeType) {
      return { format: 'unknown', confidence: 0, evidence: ['No MIME type provided'] };
    }

    const parser = formatRegistry.getParserByMimeType(mimeType);
    if (parser) {
      return {
        format: parser.name.toLowerCase(),
        confidence: 80, // High confidence for MIME type matches
        evidence: [`MIME type ${mimeType} indicates ${parser.name} format`]
      };
    }

    return {
      format: 'unknown',
      confidence: 0,
      evidence: [`Unknown MIME type: ${mimeType}`]
    };
  }

  /**
   * Comprehensive content analysis with weighted scoring
   */
  detectByContent(content: string): DetectionResult {
    const candidates: DetectionResult[] = [];
    
    // Run detection on all registered parsers
    for (const parser of formatRegistry.getAllParsers()) {
      const result = parser.detect(content);
      if (result.confidence > 0) {
        candidates.push(result);
      }
    }

    if (candidates.length === 0) {
      return {
        format: 'unknown',
        confidence: 0,
        evidence: ['Content analysis yielded no format matches']
      };
    }

    // Sort by confidence and return best match
    candidates.sort((a, b) => b.confidence - a.confidence);
    const best = candidates[0];

    // Add competitive analysis
    if (candidates.length > 1) {
      const others = candidates.slice(1, 3).map(c => `${c.format}(${c.confidence}%)`);
      best.evidence.push(`Best match among: ${others.join(', ')}`);
    }

    return best;
  }

  /**
   * Multi-stage detection with confidence aggregation
   * Combines multiple detection methods for highest accuracy
   */
  private performDetection(content: string, filename?: string, mimeType?: string): DetectionResult {
    const detectionMethods: Array<{ result: DetectionResult; weight: number; name: string }> = [];

    // Method 1: File signature (highest priority)
    const signatureResult = this.detectBySignature(content);
    if (signatureResult.confidence > 0) {
      detectionMethods.push({ result: signatureResult, weight: 1.0, name: 'signature' });
    }

    // Method 2: MIME type (high priority)
    if (mimeType) {
      const mimeResult = this.detectByMimeType(mimeType);
      if (mimeResult.confidence > 0) {
        detectionMethods.push({ result: mimeResult, weight: 0.8, name: 'mime-type' });
      }
    }

    // Method 3: Filename extension (medium priority)
    if (filename) {
      const filenameResult = this.detectByFilename(filename);
      if (filenameResult.confidence > 0) {
        detectionMethods.push({ result: filenameResult, weight: 0.6, name: 'filename' });
      }
    }

    // Method 4: Content analysis (fallback)
    const contentResult = this.detectByContent(content);
    if (contentResult.confidence > 0) {
      detectionMethods.push({ result: contentResult, weight: 0.5, name: 'content' });
    }

    // If no methods found anything
    if (detectionMethods.length === 0) {
      return {
        format: 'unknown',
        confidence: 0,
        evidence: ['All detection methods failed to identify format']
      };
    }

    // Aggregate results using weighted confidence
    return this.aggregateResults(detectionMethods);
  }

  /**
   * Aggregate multiple detection results with weighted confidence scoring
   */
  private aggregateResults(methods: Array<{ result: DetectionResult; weight: number; name: string }>): DetectionResult {
    // Group by format
    const formatGroups = new Map<string, Array<{ result: DetectionResult; weight: number; name: string }>>();
    
    for (const method of methods) {
      const format = method.result.format;
      if (!formatGroups.has(format)) {
        formatGroups.set(format, []);
      }
      formatGroups.get(format)!.push(method);
    }

    // Calculate weighted confidence for each format
    const formatScores: Array<{ format: string; confidence: number; evidence: string[] }> = [];
    
    for (const [format, groupMethods] of formatGroups) {
      let totalWeightedConfidence = 0;
      let totalWeight = 0;
      const evidence: string[] = [];

      for (const method of groupMethods) {
        const weightedConfidence = method.result.confidence * method.weight;
        totalWeightedConfidence += weightedConfidence;
        totalWeight += method.weight;
        
        evidence.push(`${method.name}: ${method.result.confidence}% (weight: ${method.weight})`);
        evidence.push(...method.result.evidence);
      }

      const avgConfidence = totalWeight > 0 ? totalWeightedConfidence / totalWeight : 0;
      
      formatScores.push({
        format,
        confidence: Math.round(avgConfidence),
        evidence
      });
    }

    // Sort by confidence and return best match
    formatScores.sort((a, b) => b.confidence - a.confidence);
    const best = formatScores[0];

    // Add competitive analysis if multiple candidates
    if (formatScores.length > 1) {
      const alternatives = formatScores.slice(1, 3)
        .map(f => `${f.format}(${f.confidence}%)`)
        .join(', ');
      best.evidence.push(`Alternative formats: ${alternatives}`);
    }

    return best;
  }

  /**
   * Get format signatures for binary detection
   */
  private getFormatSignatures(): Map<string, RegExp> {
    return new Map([
      // JSON signatures
      ['json', /^[\s]*[{\[].*[}\]][\s]*$/s],
      
      // XML signatures  
      ['xml', /^[\s]*<\?xml|^[\s]*<[a-zA-Z]/],
      
      // CSV signatures (heuristic-based)
      ['csv', /^[^<{].*[,;]\s*[^\s]/m],
      
      // Common text patterns
      ['text', /^[\x20-\x7E\s]*$/] // ASCII printable + whitespace
    ]);
  }

  /**
   * Generate cache key for detection results
   */
  private generateCacheKey(content: string, filename: string, mimeType: string): string {
    // Use content hash + metadata for cache key
    const contentHash = this.simpleHash(content.substring(0, 1000)); // First 1KB for performance
    return `${contentHash}-${filename}-${mimeType}`;
  }

  /**
   * Simple string hash for cache keys
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Add result to cache with LRU eviction
   */
  private addToCache(key: string, result: DetectionResult): void {
    // Simple LRU: if cache is full, remove oldest entry
    if (this.detectionCache.size >= this.maxCacheSize) {
      const firstKey = this.detectionCache.keys().next().value;
      if (firstKey) {
        this.detectionCache.delete(firstKey);
      }
    }
    
    this.detectionCache.set(key, result);
  }

  /**
   * Extract file extension from filename
   */
  private extractExtension(filename: string | undefined): string | null {
    if (!filename) return null;
    
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1 || lastDot === filename.length - 1) {
      return null;
    }
    return filename.substring(lastDot + 1).toLowerCase();
  }

  /**
   * Clear detection cache
   */
  clearCache(): void {
    this.detectionCache.clear();
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats() {
    return {
      size: this.detectionCache.size,
      maxSize: this.maxCacheSize,
      utilization: Math.round((this.detectionCache.size / this.maxCacheSize) * 100)
    };
  }
}

// Singleton instance for application use
export const formatDetector = new FormatDetector();