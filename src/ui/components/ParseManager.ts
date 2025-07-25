// Parse Manager - Connects UI to multi-format parsers
import { formatDetector } from '../../core/formatters/FormatDetector.ts';
import { formatRegistry } from '../../core/formatters/FormatRegistry.ts';
import type { ParseResult, DetectionResult, ValidationError } from '../../types/core.ts';

/**
 * Interface for status bar data
 */
interface StatusData {
  format: string;
  confidence: number;
  fileSize: number;
  lineCount: number;
  characterCount: number;
  parseTime: number;
  errors: number;
  warnings: number;
}

/**
 * Central parsing manager that coordinates UI interactions with the multi-format system
 * Similar to Spring's @Service pattern
 */
export class ParseManager {
  private inputElement?: HTMLTextAreaElement;
  private outputElement?: HTMLElement;
  private statusCallback?: (data: StatusData) => void;
  private validationCallback?: (errors: ValidationError[]) => void;
  private currentContent = '';
  private currentResult: ParseResult<any> | null = null;
  private currentDetection: DetectionResult | null = null;

  constructor() {
    this.bindToUI();
  }

  /**
   * Bind to UI elements
   */
  private bindToUI(): void {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initializeElements());
    } else {
      this.initializeElements();
    }
  }

  /**
   * Initialize UI elements and event handlers
   */
  private initializeElements(): void {
    // Find elements after DOM is ready
    setTimeout(() => {
      this.inputElement = document.querySelector('[data-role="input"]') as HTMLTextAreaElement;
      this.outputElement = document.querySelector('[data-role="output"]') as HTMLElement;
      
      if (!this.inputElement) {
        this.inputElement = document.querySelector('textarea') as HTMLTextAreaElement;
      }
      
      if (!this.outputElement) {
        // Find the output area by looking for the placeholder content
        const outputDiv = Array.from(document.querySelectorAll('div')).find(div => 
          div.textContent?.includes('Ready to parse your data')
        );
        if (outputDiv) {
          this.outputElement = outputDiv;
        }
      }

      this.setupEventHandlers();
    }, 100);
  }

  /**
   * Setup event handlers for UI interaction
   */
  private setupEventHandlers(): void {
    if (!this.inputElement) return;

    // Real-time parsing on input change
    this.inputElement.addEventListener('input', this.debounce(() => {
      this.handleInputChange();
    }, 500));


    // Clear button click
    const clearButton = document.querySelector('button[data-action="clear"]') as HTMLButtonElement;
    if (!clearButton) {
      const buttons = document.querySelectorAll('button');
      const foundClearButton = Array.from(buttons).find(btn => 
        btn.textContent?.toLowerCase().includes('clear')
      );
      if (foundClearButton) {
        foundClearButton.setAttribute('data-action', 'clear');
        foundClearButton.addEventListener('click', () => this.handleClearClick());
      }
    } else {
      clearButton.addEventListener('click', () => this.handleClearClick());
    }

  }

  /**
   * Handle input content change
   */
  private async handleInputChange(): Promise<void> {
    if (!this.inputElement) return;

    const content = this.inputElement.value.trim();
    this.currentContent = content;

    if (!content) {
      this.showEmptyState();
      return;
    }

    try {
      // Show loading state
      this.showLoadingState();

      // Detect format
      this.currentDetection = formatDetector.detect(content);
      
      // Parse content if format is detected
      if (this.currentDetection.format !== 'unknown') {
        const parser = formatRegistry.getParser(this.currentDetection.format);
        if (parser) {
          this.currentResult = parser.parse(content);
          if (this.currentResult.isValid) {
            this.displayResult();
          } else {
            // Parsing failed - show raw input as fallback
            this.showRawInput(content);
          }
        } else {
          this.showRawInput(content);
        }
      } else {
        // Format not detected - show raw input as fallback
        this.showRawInput(content);
      }

      // Update status bar
      this.updateStatus();

    } catch (error) {
      console.error('Parse error:', error);
      // On unexpected errors, show raw input as fallback
      this.showRawInput(content);
    }
  }


  /**
   * Handle clear button click
   */
  private handleClearClick(): void {
    if (this.inputElement) {
      this.inputElement.value = '';
      this.currentContent = '';
      this.currentResult = null;
      this.currentDetection = null;
      this.showEmptyState();
      this.updateStatus();
    }
  }


  /**
   * Display parsing result in interactive mode
   */
  private displayResult(): void {
    if (!this.outputElement || !this.currentResult || !this.currentDetection) return;

    this.displayInteractiveMode();
  }


  /**
   * Display result in interactive mode
   */
  private displayInteractiveMode(): void {
    if (!this.outputElement || !this.currentResult) return;

    // Update main header format badge
    this.updateMainHeaderFormatBadge();
    
    this.outputElement.innerHTML = `
      <div style="
        flex: 1;
        overflow-y: auto;
        overflow-x: auto;
        min-height: 0;
      ">
        ${this.generateInteractiveView()}
      </div>
    `;
  }

  /**
   * Generate interactive view based on format
   */
  private generateInteractiveView(): string {
    if (!this.currentResult?.data) return '<div style="padding: var(--spacing-md); color: var(--color-text-muted);">No data to display</div>';

    const format = this.currentDetection?.format?.toLowerCase();

    switch (format) {
      case 'json':
        return `<pre style="
          margin: 0; 
          padding: var(--spacing-md);
          white-space: pre-wrap; 
          color: var(--color-text-primary);
          font-family: var(--font-family-mono); 
          font-size: var(--font-size-sm);
          line-height: 1.4;
        ">${this.generateJsonTreeView(this.currentResult.data)}</pre>`;
      case 'csv':
        return this.generateCsvTableView(this.currentResult.data);
      case 'xml':
        return this.generateXmlTreeView(this.currentResult.data);
      default:
        return `<div style="padding: var(--spacing-md); color: var(--color-text-muted);">Interactive view not available for ${format} format</div>`;
    }
  }

  /**
   * Generate JSON tree view
   */
  private generateJsonTreeView(data: any, depth = 0): string {
    const indent = '  '.repeat(depth);
    const nextIndent = '  '.repeat(depth + 1);

    if (data === null) return `<span style="color: var(--color-syntax-null);">null</span>`;
    if (typeof data === 'string') return `<span style="color: var(--color-syntax-string);">"${data}"</span>`;
    if (typeof data === 'number') return `<span style="color: var(--color-syntax-number);">${data}</span>`;
    if (typeof data === 'boolean') return `<span style="color: var(--color-syntax-boolean);">${data}</span>`;

    if (Array.isArray(data)) {
      if (data.length === 0) return `<span style="color: var(--color-text-muted);">[]</span>`;
      
      const items = data.map((item, index) => 
        `${nextIndent}<span style="color: var(--color-text-muted);">${index}:</span> ${this.generateJsonTreeView(item, depth + 1)}`
      ).join(',\n');
      
      return `<span style="color: var(--color-text-muted);">[</span>\n${items}\n${indent}<span style="color: var(--color-text-muted);">]</span>`;
    }

    if (typeof data === 'object') {
      const keys = Object.keys(data);
      if (keys.length === 0) return `<span style="color: var(--color-text-muted);">{}</span>`;
      
      const items = keys.map(key => 
        `${nextIndent}<span style="color: var(--color-syntax-key);">"${key}"</span><span style="color: var(--color-text-muted);">:</span> ${this.generateJsonTreeView(data[key], depth + 1)}`
      ).join(',\n');
      
      return `<span style="color: var(--color-text-muted);">{</span>\n${items}\n${indent}<span style="color: var(--color-text-muted);">}</span>`;
    }

    return String(data);
  }

  /**
   * Generate CSV table view
   */
  private generateCsvTableView(data: any): string {
    if (!data.headers || !data.rows) {
      return '<div style="padding: var(--spacing-md); color: var(--color-text-muted);">Invalid CSV data structure</div>';
    }

    const headerRow = data.headers.map((header: string) => 
      `<th style="padding: var(--spacing-xs) var(--spacing-sm); background: var(--color-bg-primary); border: 1px solid var(--color-border-default); text-align: left; font-weight: 500;">${header}</th>`
    ).join('');

    const dataRows = data.rows.slice(0, 100).map((row: any) => {
      const cells = row.cells.map((cell: any) => {
        const value = cell.value === null ? '<em style="color: var(--color-text-muted);">null</em>' : String(cell.value);
        const typeColor = this.getCellTypeColor(cell.type);
        return `<td style="padding: var(--spacing-xs) var(--spacing-sm); border: 1px solid var(--color-border-default); color: ${typeColor};">${value}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    const truncationNote = data.rows.length > 100 ? 
      `<div style="padding: var(--spacing-sm); text-align: center; color: var(--color-text-muted); font-size: var(--font-size-xs);">
        Showing first 100 of ${data.rows.length} rows
      </div>` : '';

    return `
      <div style="padding: var(--spacing-md); height: 100%; display: flex; flex-direction: column;">
        <div style="overflow: auto; flex: 1; min-height: 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: var(--font-size-sm);">
            <thead>
              <tr>${headerRow}</tr>
            </thead>
            <tbody>
              ${dataRows}
            </tbody>
          </table>
        </div>
        ${truncationNote}
      </div>
    `;
  }

  /**
   * Generate XML tree view
   */
  private generateXmlTreeView(data: any): string {
    if (!data.root) {
      return '<div style="padding: var(--spacing-md); color: var(--color-text-muted);">Invalid XML data structure</div>';
    }

    return `
      <div style="padding: var(--spacing-md); font-family: var(--font-family-mono); font-size: var(--font-size-sm); height: 100%; overflow: auto;">
        ${data.declaration ? this.renderXmlDeclaration(data.declaration) : ''}
        ${this.renderXmlNode(data.root, 0)}
      </div>
    `;
  }

  /**
   * Render XML node recursively
   */
  private renderXmlNode(node: any, depth: number): string {
    const indent = '  '.repeat(depth);

    if (node.type === 'text') {
      const text = node.value?.trim();
      return text ? `<span style="color: var(--color-text-primary);">${text}</span>` : '';
    }

    if (node.type === 'comment') {
      return `${indent}<span style="color: var(--color-text-muted);">&lt;!-- ${node.value} --&gt;</span>`;
    }

    if (node.type === 'cdata') {
      return `${indent}<span style="color: var(--color-syntax-string);">&lt;![CDATA[${node.value}]]&gt;</span>`;
    }

    // Element node
    const tagName = node.prefix ? `${node.prefix}:${node.name}` : node.name;
    const attributes = node.attributes?.map((attr: any) => {
      const attrName = attr.prefix ? `${attr.prefix}:${attr.name}` : attr.name;
      return `<span style="color: var(--color-syntax-key);">${attrName}</span>=<span style="color: var(--color-syntax-string);">"${attr.value}"</span>`;
    }).join(' ') || '';

    const openTag = `<span style="color: var(--color-syntax-tag);">&lt;${tagName}</span>${attributes ? ' ' + attributes : ''}<span style="color: var(--color-syntax-tag);">&gt;</span>`;
    const closeTag = `<span style="color: var(--color-syntax-tag);">&lt;/${tagName}&gt;</span>`;

    if (!node.children || node.children.length === 0) {
      return `${indent}${openTag}${closeTag}`;
    }

    const children = node.children.map((child: any) => this.renderXmlNode(child, depth + 1)).filter(Boolean).join('\n');
    
    if (children.trim()) {
      return `${indent}${openTag}\n${children}\n${indent}${closeTag}`;
    } else {
      return `${indent}${openTag}${closeTag}`;
    }
  }

  /**
   * Render XML declaration
   */
  private renderXmlDeclaration(declaration: any): string {
    const version = declaration.version || '1.0';
    const encoding = declaration.encoding ? ` encoding="${declaration.encoding}"` : '';
    const standalone = declaration.standalone !== undefined ? ` standalone="${declaration.standalone ? 'yes' : 'no'}"` : '';
    
    return `<div style="margin-bottom: var(--spacing-sm); color: var(--color-syntax-tag);">
      &lt;?xml version="${version}"${encoding}${standalone}?&gt;
    </div>`;
  }


  /**
   * Get format badge HTML
   */
  private getFormatBadge(format: string): string {
    format = format.toLowerCase();
    const badgeClass = `status-bar__badge--${format}`;
    return `<span class="status-bar__badge ${badgeClass}">${format.toUpperCase()}</span>`;
  }

  /**
   * Get color for cell type
   */
  private getCellTypeColor(type: string): string {
    switch (type) {
      case 'number': return 'var(--color-syntax-number)';
      case 'boolean': return 'var(--color-syntax-boolean)';
      case 'date': return 'var(--color-syntax-date)';
      case 'null': return 'var(--color-syntax-null)';
      default: return 'var(--color-text-primary)';
    }
  }

  /**
   * Show loading state
   */
  private showLoadingState(): void {
    if (!this.outputElement) return;

    // Clear main header format badge during loading
    this.clearMainHeaderFormatBadge();

    // Clear validation panel during loading to prevent stale warnings
    if (this.validationCallback) {
      this.validationCallback([]);
    }

    this.outputElement.innerHTML = `
      <div style="
        flex: 1;
        display: flex; 
        align-items: center; 
        justify-content: center;
        color: var(--color-text-secondary);
        padding: var(--spacing-md);
      ">
        <div style="text-align: center;">
          <div style="font-size: var(--font-size-lg); margin-bottom: var(--spacing-sm);">⚡</div>
          <div>Parsing...</div>
        </div>
      </div>
    `;
  }

  /**
   * Show empty state
   */
  private showEmptyState(): void {
    if (!this.outputElement) return;

    // Clear main header format badge
    this.clearMainHeaderFormatBadge();

    // Clear current results to ensure clean state
    this.currentResult = null;
    this.currentDetection = null;

    this.outputElement.innerHTML = `
      <div style="
        flex: 1;
        display: flex; 
        align-items: center; 
        justify-content: center;
        color: var(--color-text-secondary);
        padding: var(--spacing-md);
      ">
        <div style="text-align: center;">
          <div style="font-size: var(--font-size-lg); margin-bottom: var(--spacing-sm); color: var(--color-text-muted);">⚡</div>
          <div>Ready to parse your data</div>
          <div style="font-size: var(--font-size-xs); margin-top: var(--spacing-xs); color: var(--color-text-muted);">
            Supports JSON, CSV, XML and more
          </div>
        </div>
      </div>
    `;

    // Update status to clear validation panel
    this.updateStatus();
  }

  /**
   * Show error state
   */
  private showError(message: string): void {
    if (!this.outputElement) return;

    // Clear main header format badge on error
    this.clearMainHeaderFormatBadge();

    // Clear validation panel on error to prevent stale warnings
    if (this.validationCallback) {
      this.validationCallback([]);
    }

    this.outputElement.innerHTML = `
      <div style="
        flex: 1;
        display: flex; 
        align-items: center; 
        justify-content: center;
        color: var(--color-status-error);
        padding: var(--spacing-md);
      ">
        <div style="text-align: center;">
          <div style="font-size: var(--font-size-lg); margin-bottom: var(--spacing-sm);">⚠️</div>
          <div style="font-weight: 500; margin-bottom: var(--spacing-xs);">Parse Error</div>
          <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">${message}</div>
        </div>
      </div>
    `;
  }

  /**
   * Show raw input as fallback when parsing fails
   */
  private showRawInput(content: string): void {
    if (!this.outputElement) return;

    // Clear main header format badge for raw input
    this.clearMainHeaderFormatBadge();

    this.outputElement.innerHTML = `
      <div style="
        flex: 1;
        overflow-y: auto;
        overflow-x: auto;
        min-height: 0;
        background: var(--color-bg-primary);
      ">
        <pre style="
          margin: 0; 
          padding: var(--spacing-md);
          white-space: pre-wrap; 
          color: var(--color-text-primary);
          font-family: var(--font-family-mono); 
          font-size: var(--font-size-sm);
          line-height: 1.4;
        ">${this.escapeHtml(content)}</pre>
      </div>
    `;
  }

  /**
   * Escape HTML characters for safe display
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Update status bar and validation panel
   */
  private updateStatus(): void {
    if (this.statusCallback) {
      const lineCount = this.currentContent ? this.currentContent.split('\n').length : 0;
      const characterCount = this.currentContent ? this.currentContent.length : 0;
      const fileSize = this.currentContent ? new Blob([this.currentContent]).size : 0;

      this.statusCallback({
        format: this.currentDetection?.format?.toUpperCase() || 'UNKNOWN',
        confidence: (this.currentDetection?.confidence || 0) / 100,
        fileSize,
        lineCount,
        characterCount,
        parseTime: this.currentResult?.metadata?.parseTime || 0,
        errors: this.currentResult?.errors?.filter(e => e.severity === 'error').length || 0,
        warnings: this.currentResult?.errors?.filter(e => e.severity === 'warning').length || 0
      });
    }

    // Always update validation panel - clear it when no errors exist
    if (this.validationCallback) {
      const errors = this.currentResult?.errors || [];
      this.validationCallback(errors);
    }
  }

  /**
   * Set status callback
   */
  public setStatusCallback(callback: (data: StatusData) => void): void {
    this.statusCallback = callback;
  }

  /**
   * Set validation callback for error/warning display
   */
  public setValidationCallback(callback: (errors: ValidationError[]) => void): void {
    this.validationCallback = callback;
  }

  /**
   * Update main header format badge
   */
  private updateMainHeaderFormatBadge(): void {
    const badgeContainer = document.getElementById('output-format-badge');
    if (badgeContainer && this.currentDetection) {
      const formatBadge = this.getFormatBadge(this.currentDetection.format);
      badgeContainer.innerHTML = formatBadge;
      badgeContainer.style.display = 'inline-block';
    }
  }

  /**
   * Clear main header format badge
   */
  private clearMainHeaderFormatBadge(): void {
    const badgeContainer = document.getElementById('output-format-badge');
    if (badgeContainer) {
      badgeContainer.innerHTML = '';
      badgeContainer.style.display = 'none';
    }
  }

  /**
   * Debounce utility
   */
  private debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
    let timeout: number;
    return ((...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    }) as T;
  }
}

// Create global instance
export const parseManager = new ParseManager();
