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

    // Add enhanced format-specific detection
    const enhancedResults = this.runEnhancedDetection(content);
    candidates.push(...enhancedResults);

    if (candidates.length === 0) {
      return {
        format: 'unknown',
        confidence: 0,
        evidence: ['Content analysis yielded no format matches']
      };
    }

    // Merge results for same formats (take highest confidence)
    const mergedCandidates = this.mergeCandidatesByFormat(candidates);

    // Sort by confidence and return best match
    mergedCandidates.sort((a, b) => b.confidence - a.confidence);
    const best = mergedCandidates[0];

    // Add competitive analysis
    if (mergedCandidates.length > 1) {
      const others = mergedCandidates.slice(1, 3).map(c => `${c.format}(${c.confidence}%)`);
      best.evidence.push(`Best match among: ${others.join(', ')}`);
    }

    return best;
  }

  /**
   * Run enhanced format-specific detection algorithms
   */
  private runEnhancedDetection(content: string): DetectionResult[] {
    const results: DetectionResult[] = [];

    // Enhanced CSV detection
    const csvResult = this.enhancedCsvDetection(content);
    if (csvResult.confidence > 0) {
      results.push(csvResult);
    }

    // Enhanced XML detection
    const xmlResult = this.enhancedXmlDetection(content);
    if (xmlResult.confidence > 0) {
      results.push(xmlResult);
    }

    return results;
  }

  /**
   * Enhanced CSV detection with delimiter analysis
   */
  private enhancedCsvDetection(content: string): DetectionResult {
    const trimmed = content.trim();
    const evidence: string[] = [];
    let confidence = 0;

    if (!trimmed) {
      return { format: 'csv', confidence: 0, evidence: ['Empty content'] };
    }

    const lines = trimmed.split(/\r?\n/).slice(0, 10);
    
    // Test common CSV delimiters
    const delimiters = [',', ';', '\t', '|'];
    let bestDelimiter = { char: ',', score: 0 };

    for (const delimiter of delimiters) {
      const score = this.analyzeDelimiterConsistency(lines, delimiter);
      if (score > bestDelimiter.score) {
        bestDelimiter = { char: delimiter, score };
      }
    }

    if (bestDelimiter.score > 0.3) {
      confidence += Math.min(40, bestDelimiter.score * 50);
      evidence.push(`Consistent delimiter pattern: '${bestDelimiter.char}' (${Math.round(bestDelimiter.score * 100)}% consistent)`);
    }

    // Check for quoted fields (CSV-specific)
    const quotedFieldPattern = /[,;|\t]\s*"[^"]*"/g;
    const quotedMatches = (trimmed.match(quotedFieldPattern) || []).length;
    if (quotedMatches > 0) {
      confidence += Math.min(20, quotedMatches * 2);
      evidence.push(`Contains quoted fields (${quotedMatches} instances)`);
    }

    // Check row length consistency
    if (lines.length > 1) {
      const consistencyScore = this.analyzeRowLengthConsistency(lines, bestDelimiter.char);
      if (consistencyScore > 0.7) {
        confidence += 20;
        evidence.push(`Consistent row structure (${Math.round(consistencyScore * 100)}% consistent)`);
      }
    }

    // Negative indicators
    if (trimmed.startsWith('<') || /^\s*<[a-zA-Z]/.test(trimmed)) {
      confidence = Math.max(0, confidence - 30);
      evidence.push('Contains XML-like tags (negative indicator)');
    }

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      confidence = Math.max(0, confidence - 25);
      evidence.push('Starts with JSON brackets (negative indicator)');
    }

    return {
      format: 'csv',
      confidence: Math.max(0, Math.min(100, confidence)),
      evidence
    };
  }

  /**
   * Enhanced XML detection with structure analysis
   */
  private enhancedXmlDetection(content: string): DetectionResult {
    const trimmed = content.trim();
    const evidence: string[] = [];
    let confidence = 0;

    if (!trimmed) {
      return { format: 'xml', confidence: 0, evidence: ['Empty content'] };
    }

    // Check for XML declaration
    if (/^\s*<\?xml\s+version\s*=/.test(trimmed)) {
      confidence += 40;
      evidence.push('Contains XML declaration');
    }

    // Check for XML-like tag structure
    const tagPattern = /<[^<>]+>/g;
    const tags = trimmed.match(tagPattern) || [];
    
    if (tags.length > 0) {
      confidence += Math.min(25, tags.length * 2);
      evidence.push(`Contains ${tags.length} XML-like tags`);

      // Analyze tag structure quality
      const structureScore = this.analyzeXmlTagStructure(trimmed);
      if (structureScore > 0.5) {
        confidence += 20;
        evidence.push(`Well-formed tag structure (${Math.round(structureScore * 100)}% matched)`);
      }
    }

    // Check for XML namespaces
    if (/xmlns[^=]*\s*=\s*["'][^"']*["']/.test(trimmed)) {
      confidence += 15;
      evidence.push('Contains XML namespaces');
    }

    // Check for XML-specific constructs
    if (/<!\[CDATA\[/.test(trimmed)) {
      confidence += 10;
      evidence.push('Contains CDATA sections');
    }

    if (/<\?[^>]+\?>/.test(trimmed)) {
      confidence += 10;
      evidence.push('Contains processing instructions');
    }

    if (/<!--[\s\S]*?-->/.test(trimmed)) {
      confidence += 5;
      evidence.push('Contains XML comments');
    }

    // Check for self-closing tags
    if (/<[^>]+\/>/.test(trimmed)) {
      confidence += 10;
      evidence.push('Contains self-closing tags');
    }

    // Negative indicators
    if (/^[^<]*[,;|\t][^<]*[,;|\t]/.test(trimmed)) {
      confidence = Math.max(0, confidence - 20);
      evidence.push('Contains delimiter patterns (CSV-like)');
    }

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      confidence = Math.max(0, confidence - 30);
      evidence.push('Starts with JSON brackets (negative indicator)');
    }

    return {
      format: 'xml',
      confidence: Math.max(0, Math.min(100, confidence)),
      evidence
    };
  }

  /**
   * Analyze delimiter consistency across lines
   */
  private analyzeDelimiterConsistency(lines: string[], delimiter: string): number {
    if (lines.length < 2) return 0;

    const counts: number[] = [];
    const escapedDelimiter = delimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    for (const line of lines) {
      if (line.trim()) {
        const count = (line.match(new RegExp(escapedDelimiter, 'g')) || []).length;
        counts.push(count);
      }
    }

    if (counts.length === 0) return 0;

    // Calculate coefficient of variation (lower is more consistent)
    const mean = counts.reduce((sum, count) => sum + count, 0) / counts.length;
    if (mean === 0) return 0;

    const variance = counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length;
    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = standardDeviation / mean;

    // Convert to consistency score (1 = perfectly consistent, 0 = completely inconsistent)
    return Math.max(0, 1 - coefficientOfVariation);
  }

  /**
   * Analyze row length consistency for CSV detection
   */
  private analyzeRowLengthConsistency(lines: string[], delimiter: string): number {
    if (lines.length < 2) return 0;

    const fieldCounts: number[] = [];
    const escapedDelimiter = delimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    for (const line of lines) {
      if (line.trim()) {
        const fieldCount = (line.match(new RegExp(escapedDelimiter, 'g')) || []).length + 1;
        fieldCounts.push(fieldCount);
      }
    }

    if (fieldCounts.length === 0) return 0;

    // Find the mode (most common field count)
    const countFrequency: { [key: number]: number } = {};
    for (const count of fieldCounts) {
      countFrequency[count] = (countFrequency[count] || 0) + 1;
    }

    const mode = Object.keys(countFrequency).reduce((a, b) => 
      countFrequency[parseInt(a)] > countFrequency[parseInt(b)] ? a : b
    );

    const modeCount = countFrequency[parseInt(mode)];
    return modeCount / fieldCounts.length;
  }

  /**
   * Analyze XML tag structure quality
   */
  private analyzeXmlTagStructure(content: string): number {
    const openTags: string[] = [];
    const tagPattern = /<\/?([^>\s\/]+)[^>]*\/?>/g;
    let match;
    let totalTags = 0;
    let matchedTags = 0;

    while ((match = tagPattern.exec(content)) !== null) {
      const tagName = match[1];
      const fullMatch = match[0];
      totalTags++;

      if (fullMatch.startsWith('</')) {
        // Closing tag
        const expectedOpen = openTags.pop();
        if (expectedOpen === tagName) {
          matchedTags += 2; // Count both opening and closing
        }
      } else if (fullMatch.endsWith('/>')) {
        // Self-closing tag
        matchedTags++;
      } else {
        // Opening tag
        openTags.push(tagName);
      }
    }

    return totalTags > 0 ? matchedTags / totalTags : 0;
  }

  /**
   * Merge detection candidates by format, keeping highest confidence
   */
  private mergeCandidatesByFormat(candidates: DetectionResult[]): DetectionResult[] {
    const formatMap = new Map<string, DetectionResult>();

    for (const candidate of candidates) {
      const existing = formatMap.get(candidate.format);
      if (!existing || candidate.confidence > existing.confidence) {
        // Merge evidence if same format
        const evidence = existing 
          ? [...new Set([...existing.evidence, ...candidate.evidence])]
          : candidate.evidence;
        
        formatMap.set(candidate.format, {
          ...candidate,
          evidence
        });
      }
    }

    return Array.from(formatMap.values());
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
      // JSON signatures - high precision
      ['json', /^[\s]*[{\[].*[}\]][\s]*$/s],
      
      // XML signatures - comprehensive patterns
      ['xml', /^[\s]*(<\?xml[\s\S]*?\?>[\s\S]*?)?<[a-zA-Z][\s\S]*>/],
      
      // CSV signatures - enhanced heuristic detection
      ['csv', /^[^<{]*([,;|\t][^,;|\t\n\r]*){2,}.*$/m],
      
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