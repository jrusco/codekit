// Enterprise-grade CSV parser with auto-detection and performance optimization
import type { 
  FormatParser, 
  ParseResult, 
  ValidationError, 
  DetectionResult, 
  ParseMetadata,
  CsvData,
  CsvRow,
  CsvCell,
  CsvColumn,
  CsvMetadata,
  CsvCellType,
  FormatParserConfig
} from '../../types/core.ts';

/**
 * Production-ready CSV parser with advanced features
 * Provides Java-like enterprise patterns with comprehensive error handling
 */
export class CsvParser implements FormatParser<CsvData> {
  readonly name = 'CSV';
  readonly extensions = ['csv', 'tsv', 'txt'] as const;
  readonly mimeTypes = ['text/csv', 'application/csv', 'text/tab-separated-values'] as const;

  private readonly defaultConfig: Required<NonNullable<FormatParserConfig['csv']>> = {
    delimiter: ',',
    hasHeaders: true,
    quoteChar: '"',
    escapeChar: '"',
    skipEmptyLines: true
  };

  /**
   * Detect CSV format with intelligent delimiter and structure analysis
   */
  detect(content: string): DetectionResult {
    const trimmed = content.trim();
    const evidence: string[] = [];
    let confidence = 0;

    if (!trimmed) {
      return { format: 'unknown', confidence: 0, evidence: ['Empty content'] };
    }

    // Sample first few lines for analysis
    const lines = trimmed.split(/\r?\n/).slice(0, 10);
    const sampleText = lines.join('\n');

    // Test common delimiters
    const delimiterTests = this.analyzeDelimiters(sampleText);
    const bestDelimiter = delimiterTests.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );

    if (bestDelimiter.confidence > 0) {
      confidence += Math.min(40, bestDelimiter.confidence);
      evidence.push(`Detected delimiter: '${bestDelimiter.delimiter}' (${bestDelimiter.confidence}% confidence)`);
    }

    // Analyze row consistency
    const consistencyScore = this.analyzeRowConsistency(lines, bestDelimiter.delimiter);
    if (consistencyScore > 0.7) {
      confidence += 30;
      evidence.push(`Consistent row structure (${Math.round(consistencyScore * 100)}% consistent)`);
    }

    // Check for quoted fields (CSV-specific pattern)
    const quotedFieldPattern = new RegExp(`${this.escapeRegex(bestDelimiter.delimiter)}\\s*"[^"]*"`, 'g');
    const quotedMatches = (sampleText.match(quotedFieldPattern) || []).length;
    if (quotedMatches > 0) {
      confidence += 15;
      evidence.push(`Contains quoted fields (${quotedMatches} instances)`);
    }

    // Check for header-like patterns
    if (lines.length > 1) {
      const headerScore = this.analyzeHeaderPattern(lines[0], bestDelimiter.delimiter);
      if (headerScore > 0.5) {
        confidence += 15;
        evidence.push(`Header-like first row detected (${Math.round(headerScore * 100)}% confidence)`);
      }
    }

    // Negative indicators
    if (trimmed.startsWith('<')) {
      confidence -= 30;
      evidence.push('Appears to be XML/HTML');
    }

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      confidence -= 20;
      evidence.push('Appears to be JSON');
    }

    return {
      format: confidence > 50 ? 'csv' : 'unknown',
      confidence: Math.max(0, Math.min(100, confidence)),
      evidence
    };
  }

  /**
   * Parse CSV content with comprehensive error handling and type inference
   */
  parse(content: string, config?: FormatParserConfig): ParseResult<CsvData> {
    const startTime = performance.now();
    const fileSize = new Blob([content]).size;
    
    try {
      const csvConfig = { ...this.defaultConfig, ...config?.csv };
      const validationErrors = this.validate(content);
      
      if (validationErrors.length > 0 && validationErrors.some(e => e.severity === 'error')) {
        return this.createFailedResult(validationErrors, startTime, fileSize);
      }

      const parseResult = this.parseWithConfig(content, csvConfig);
      const parseTime = performance.now() - startTime;
      
      const metadata: ParseMetadata = {
        parseTime,
        fileSize,
        format: 'csv',
        confidence: 100
      };

      return {
        isValid: true,
        data: parseResult,
        errors: validationErrors, // Include warnings
        metadata
      };

    } catch (error) {
      const errors = this.extractErrorDetails(error, content);
      return this.createFailedResult(errors, startTime, fileSize);
    }
  }

  /**
   * Validate CSV structure and detect potential issues
   */
  validate(content: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const trimmed = content.trim();

    if (!trimmed) {
      errors.push({
        message: 'Content is empty',
        code: 'EMPTY_CONTENT',
        severity: 'error'
      });
      return errors;
    }

    const lines = trimmed.split(/\r?\n/);
    
    // Check for minimum viable CSV (at least one line with delimiter)
    const detection = this.detect(content);
    if (detection.confidence < 30) {
      errors.push({
        message: 'Content does not appear to be valid CSV format',
        code: 'INVALID_CSV_FORMAT',
        severity: 'error'
      });
    }

    // Analyze delimiter consistency
    const delimiterAnalysis = this.analyzeDelimiters(content);
    const bestDelimiter = delimiterAnalysis.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );

    if (bestDelimiter.confidence < 50) {
      errors.push({
        message: 'Unable to reliably detect CSV delimiter',
        code: 'DELIMITER_DETECTION_FAILED',
        severity: 'warning'
      });
    }

    // Check for row consistency issues
    const consistencyScore = this.analyzeRowConsistency(lines, bestDelimiter.delimiter);
    if (consistencyScore < 0.8) {
      errors.push({
        message: `Inconsistent row structure detected (${Math.round(consistencyScore * 100)}% consistent)`,
        code: 'INCONSISTENT_ROWS',
        severity: 'warning'
      });
    }

    // Check for unterminated quotes
    const quoteErrors = this.validateQuotes(content, '"');
    errors.push(...quoteErrors);

    return errors;
  }

  /**
   * Parse CSV with specified configuration
   */
  private parseWithConfig(content: string, config: Required<NonNullable<FormatParserConfig['csv']>>): CsvData {
    const lines = content.split(/\r?\n/);
    const lineEnding = this.detectLineEnding(content);
    
    // Filter empty lines if requested
    const filteredLines = config.skipEmptyLines 
      ? lines.filter(line => line.trim().length > 0)
      : lines;

    if (filteredLines.length === 0) {
      throw new Error('No data rows found after filtering');
    }

    // Auto-detect delimiter if not specified or if default comma doesn't work well
    const delimiter = this.finalizeDelimiter(content, config.delimiter);
    
    // Parse rows
    const rawRows = filteredLines.map((line, index) => 
      this.parseRow(line, delimiter, config.quoteChar, config.escapeChar, index)
    );

    // Determine if first row contains headers
    const hasHeaders = config.hasHeaders ?? this.detectHeaders(rawRows, delimiter);
    
    // Extract headers
    const headers = hasHeaders && rawRows.length > 0
      ? rawRows[0].map(cell => cell.trim())
      : this.generateColumnNames(rawRows[0]?.length || 0);

    // Extract data rows
    const dataRows = hasHeaders ? rawRows.slice(1) : rawRows;
    
    // Infer column types
    const columns = this.inferColumnTypes(headers, dataRows);
    
    // Convert rows to typed data
    const typedRows = this.convertRowsToTyped(dataRows, columns);

    const metadata: CsvMetadata = {
      delimiter,
      hasHeaders,
      rowCount: typedRows.length,
      columnCount: headers.length,
      encoding: 'utf-8', // Assume UTF-8 for now
      lineEnding,
      quoteChar: config.quoteChar,
      escapeChar: config.escapeChar
    };

    return {
      headers,
      columns,
      rows: typedRows,
      metadata
    };
  }

  /**
   * Analyze potential delimiters and their confidence scores
   */
  private analyzeDelimiters(content: string): Array<{ delimiter: string; confidence: number }> {
    const delimiters = [',', ';', '\t', '|', ':'];
    const lines = content.split(/\r?\n/).slice(0, 10);
    
    return delimiters.map(delimiter => {
      let confidence = 0;
      const counts: number[] = [];
      
      // Count delimiter occurrences per line
      for (const line of lines) {
        if (line.trim()) {
          const count = (line.match(new RegExp(this.escapeRegex(delimiter), 'g')) || []).length;
          counts.push(count);
        }
      }
      
      if (counts.length === 0) return { delimiter, confidence: 0 };
      
      // Calculate consistency
      const avg = counts.reduce((sum, count) => sum + count, 0) / counts.length;
      const variance = counts.reduce((sum, count) => sum + Math.pow(count - avg, 2), 0) / counts.length;
      const consistency = avg > 0 ? Math.max(0, 1 - (variance / avg)) : 0;
      
      // Base confidence on average count and consistency
      if (avg > 0) {
        confidence = Math.min(90, avg * 20 * consistency);
      }
      
      return { delimiter, confidence };
    });
  }

  /**
   * Analyze row consistency for a given delimiter
   */
  private analyzeRowConsistency(lines: string[], delimiter: string): number {
    if (lines.length < 2) return 0;
    
    const fieldCounts = lines
      .filter(line => line.trim())
      .map(line => (line.match(new RegExp(this.escapeRegex(delimiter), 'g')) || []).length + 1);
    
    if (fieldCounts.length === 0) return 0;
    
    const mode = this.calculateMode(fieldCounts);
    const consistentRows = fieldCounts.filter(count => count === mode).length;
    
    return consistentRows / fieldCounts.length;
  }

  /**
   * Analyze if first row looks like headers
   */
  private analyzeHeaderPattern(firstRow: string, delimiter: string): number {
    const fields = this.parseRow(firstRow, delimiter, '"', '"', 0);
    let score = 0;
    
    for (const field of fields) {
      const trimmed = field.trim();
      
      // Check for typical header characteristics
      if (trimmed.length > 0) {
        // Contains letters (not just numbers)
        if (/[a-zA-Z]/.test(trimmed)) score += 0.3;
        
        // Contains common header words
        if (/^(id|name|title|date|time|count|value|type|status|code)$/i.test(trimmed)) score += 0.2;
        
        // Reasonable length (not too long)
        if (trimmed.length > 1 && trimmed.length < 50) score += 0.1;
        
        // No special characters that suggest data
        if (!/[0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]+\.[0-9]{2}|\$[0-9]/.test(trimmed)) score += 0.1;
      }
    }
    
    return Math.min(1, score / fields.length);
  }

  /**
   * Parse a single CSV row with quote handling
   */
  private parseRow(line: string, delimiter: string, quoteChar: string, escapeChar: string, _rowIndex: number): string[] {
    const fields: string[] = [];
    let currentField = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === quoteChar && !inQuotes) {
        // Start of quoted field
        inQuotes = true;
      } else if (char === quoteChar && inQuotes) {
        if (nextChar === quoteChar && escapeChar === quoteChar) {
          // Escaped quote (double quote)
          currentField += quoteChar;
          i++; // Skip next quote
        } else {
          // End of quoted field
          inQuotes = false;
        }
      } else if (char === delimiter && !inQuotes) {
        // Field separator
        fields.push(currentField);
        currentField = '';
      } else {
        currentField += char;
      }
      
      i++;
    }
    
    // Add final field
    fields.push(currentField);
    
    return fields;
  }

  /**
   * Infer column types from data samples
   */
  private inferColumnTypes(headers: string[], dataRows: string[][]): CsvColumn[] {
    const columns: CsvColumn[] = [];
    
    for (let colIndex = 0; colIndex < headers.length; colIndex++) {
      const samples = dataRows
        .slice(0, 100) // Sample first 100 rows for performance
        .map(row => row[colIndex] || '')
        .filter(value => value.trim().length > 0);
      
      const typeAnalysis = this.analyzeColumnType(samples);
      
      columns.push({
        name: headers[colIndex],
        index: colIndex,
        inferredType: typeAnalysis.type,
        typeConfidence: typeAnalysis.confidence,
        nullable: typeAnalysis.hasNulls,
        samples: samples.slice(0, 5) // Keep first 5 samples
      });
    }
    
    return columns;
  }

  /**
   * Analyze column type from sample values
   */
  private analyzeColumnType(samples: string[]): { type: CsvCellType; confidence: number; hasNulls: boolean } {
    if (samples.length === 0) {
      return { type: 'string', confidence: 0, hasNulls: true };
    }

    let numberCount = 0;
    let booleanCount = 0;
    let dateCount = 0;
    let nullCount = 0;
    
    for (const sample of samples) {
      const trimmed = sample.trim().toLowerCase();
      
      // Check for null-like values
      if (!trimmed || trimmed === 'null' || trimmed === 'na' || trimmed === 'n/a' || trimmed === '') {
        nullCount++;
        continue;
      }
      
      // Check for boolean
      if (trimmed === 'true' || trimmed === 'false' || trimmed === 'yes' || trimmed === 'no' || 
          trimmed === '1' || trimmed === '0' || trimmed === 'y' || trimmed === 'n') {
        booleanCount++;
        continue;
      }
      
      // Check for number
      if (/^-?\d*\.?\d+([eE][+-]?\d+)?$/.test(trimmed) || /^-?\d{1,3}(,\d{3})*(\.\d+)?$/.test(trimmed)) {
        numberCount++;
        continue;
      }
      
      // Check for date
      if (this.isDateLike(trimmed)) {
        dateCount++;
        continue;
      }
    }
    
    const totalSamples = samples.length;
    const nonNullSamples = totalSamples - nullCount;
    
    if (nonNullSamples === 0) {
      return { type: 'null', confidence: 1, hasNulls: true };
    }
    
    const numberRatio = numberCount / nonNullSamples;
    const booleanRatio = booleanCount / nonNullSamples;
    const dateRatio = dateCount / nonNullSamples;
    
    // Determine primary type
    if (numberRatio > 0.8) {
      return { type: 'number', confidence: numberRatio, hasNulls: nullCount > 0 };
    } else if (booleanRatio > 0.8) {
      return { type: 'boolean', confidence: booleanRatio, hasNulls: nullCount > 0 };
    } else if (dateRatio > 0.7) {
      return { type: 'date', confidence: dateRatio, hasNulls: nullCount > 0 };
    } else {
      return { type: 'string', confidence: 1 - Math.max(numberRatio, booleanRatio, dateRatio), hasNulls: nullCount > 0 };
    }
  }

  /**
   * Convert raw string rows to typed CSV rows
   */
  private convertRowsToTyped(rawRows: string[][], columns: CsvColumn[]): CsvRow[] {
    return rawRows.map((rawRow, index) => {
      const cells: CsvCell[] = [];
      const errors: string[] = [];
      let isValid = true;
      
      for (let colIndex = 0; colIndex < columns.length; colIndex++) {
        const rawValue = rawRow[colIndex] || '';
        const column = columns[colIndex];
        
        try {
          const cell = this.convertCellValue(rawValue, column.inferredType, colIndex);
          cells.push(cell);
        } catch (error) {
          // Fallback to string type on conversion error
          cells.push({
            value: rawValue,
            rawValue,
            type: 'string',
            columnIndex: colIndex
          });
          
          errors.push(`Column ${colIndex} (${column.name}): ${error instanceof Error ? error.message : String(error)}`);
          isValid = false;
        }
      }
      
      return {
        index,
        cells,
        isValid,
        errors
      };
    });
  }

  /**
   * Convert individual cell value to appropriate type
   */
  private convertCellValue(rawValue: string, targetType: CsvCellType, columnIndex: number): CsvCell {
    const trimmed = rawValue.trim();
    
    // Handle null-like values
    if (!trimmed || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'na' || trimmed.toLowerCase() === 'n/a') {
      return {
        value: null,
        rawValue,
        type: 'null',
        columnIndex
      };
    }
    
    try {
      switch (targetType) {
        case 'number':
          // Remove commas from numbers like "1,234.56"
          const cleanNumber = trimmed.replace(/,/g, '');
          const numValue = parseFloat(cleanNumber);
          if (isNaN(numValue)) throw new Error(`Invalid number: ${trimmed}`);
          return {
            value: numValue,
            rawValue,
            type: 'number',
            columnIndex
          };
          
        case 'boolean':
          const lowerValue = trimmed.toLowerCase();
          const boolValue = lowerValue === 'true' || lowerValue === 'yes' || lowerValue === 'y' || lowerValue === '1';
          return {
            value: boolValue,
            rawValue,
            type: 'boolean',
            columnIndex
          };
          
        case 'date':
          const dateValue = new Date(trimmed);
          if (isNaN(dateValue.getTime())) throw new Error(`Invalid date: ${trimmed}`);
          return {
            value: dateValue,
            rawValue,
            type: 'date',
            columnIndex
          };
          
        default:
          return {
            value: rawValue,
            rawValue,
            type: 'string',
            columnIndex
          };
      }
    } catch (error) {
      throw new Error(`Type conversion failed for value "${trimmed}": ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Utility methods

  private detectHeaders(rows: string[][], _delimiter: string): boolean {
    if (rows.length < 2) return false;
    
    const firstRow = rows[0];
    const secondRow = rows[1];
    
    // Compare patterns between first and second row
    let headerLikeCount = 0;
    
    for (let i = 0; i < Math.min(firstRow.length, secondRow.length); i++) {
      const first = firstRow[i]?.trim() || '';
      const second = secondRow[i]?.trim() || '';
      
      // First row has text, second row has number-like value
      if (/^[a-zA-Z]/.test(first) && /^[0-9]/.test(second)) {
        headerLikeCount++;
      }
    }
    
    return headerLikeCount > firstRow.length * 0.3;
  }

  private generateColumnNames(columnCount: number): string[] {
    const names: string[] = [];
    for (let i = 0; i < columnCount; i++) {
      names.push(`Column ${i + 1}`);
    }
    return names;
  }

  private finalizeDelimiter(content: string, configDelimiter: string): string {
    const analysis = this.analyzeDelimiters(content);
    const bestDetected = analysis.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );
    
    // Use detected delimiter if it's much better than the configured one
    const configAnalysis = analysis.find(a => a.delimiter === configDelimiter);
    const configConfidence = configAnalysis?.confidence || 0;
    
    if (bestDetected.confidence > configConfidence + 20) {
      return bestDetected.delimiter;
    }
    
    return configDelimiter;
  }

  private detectLineEnding(content: string): '\n' | '\r\n' | '\r' {
    const crlfCount = (content.match(/\r\n/g) || []).length;
    const lfCount = (content.match(/(?<!\r)\n/g) || []).length;
    const crCount = (content.match(/\r(?!\n)/g) || []).length;
    
    if (crlfCount > lfCount && crlfCount > crCount) return '\r\n';
    if (crCount > lfCount) return '\r';
    return '\n';
  }

  private validateQuotes(content: string, quoteChar: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const lines = content.split(/\r?\n/);
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      let inQuotes = false;
      let quoteCount = 0;
      
      for (let charIndex = 0; charIndex < line.length; charIndex++) {
        if (line[charIndex] === quoteChar) {
          quoteCount++;
          inQuotes = !inQuotes;
        }
      }
      
      if (inQuotes && quoteCount % 2 === 1) {
        errors.push({
          message: 'Unterminated quoted field',
          line: lineIndex + 1,
          column: line.length,
          code: 'UNTERMINATED_QUOTE',
          severity: 'error'
        });
      }
    }
    
    return errors;
  }

  private isDateLike(value: string): boolean {
    // Common date patterns
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
      /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
      /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
      /^\d{1,2}\/\d{1,2}\/\d{2,4}$/, // M/D/YY or MM/DD/YYYY
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // ISO 8601
    ];
    
    return datePatterns.some(pattern => pattern.test(value)) && !isNaN(new Date(value).getTime());
  }

  private calculateMode(numbers: number[]): number {
    const frequency: { [key: number]: number } = {};
    let maxFreq = 0;
    let mode = numbers[0];
    
    for (const num of numbers) {
      frequency[num] = (frequency[num] || 0) + 1;
      if (frequency[num] > maxFreq) {
        maxFreq = frequency[num];
        mode = num;
      }
    }
    
    return mode;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private extractErrorDetails(error: any, _content: string): ValidationError[] {
    return [{
      message: error instanceof Error ? error.message : String(error),
      code: 'CSV_PARSE_ERROR',
      severity: 'error'
    }];
  }

  private createFailedResult(errors: ValidationError[], startTime: number, fileSize: number): ParseResult<CsvData> {
    const parseTime = performance.now() - startTime;
    const metadata: ParseMetadata = {
      parseTime,
      fileSize,
      format: 'csv',
      confidence: 0
    };

    return {
      isValid: false,
      data: null,
      errors,
      metadata
    };
  }
}