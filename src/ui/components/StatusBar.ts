// Status bar component with format detection indicators

import { BaseComponent } from '@/ui/components/BaseComponent';
import type { DetectionResult, ParseMetadata } from '@/types/core';

/**
 * Status bar data interface
 */
export interface StatusBarData {
  format?: string;
  confidence?: number;
  fileSize?: number;
  lineCount?: number;
  characterCount?: number;
  parseTime?: number;
  errors?: number;
  warnings?: number;
}

/**
 * Professional status bar component
 * Similar to VS Code's status bar or IntelliJ's status line
 */
export class StatusBar extends BaseComponent<StatusBarData> {
  private sections!: Map<string, HTMLElement>;

  constructor(container: HTMLElement) {
    super(container);
    this.sections = new Map<string, HTMLElement>();
  }

  protected createElement(): HTMLElement {
    const element = document.createElement('div');
    element.className = 'status-bar';
    element.setAttribute('role', 'status');
    element.setAttribute('aria-live', 'polite');
    element.setAttribute('aria-label', 'Status information');
    
    return element;
  }

  protected render(): void {
    this.element.innerHTML = '';
    
    if (!this.sections) {
      this.sections = new Map<string, HTMLElement>();
    }
    this.sections.clear();
    
    if (!this.data) {
      this.renderEmptyState();
      return;
    }

    // Left section - format and confidence
    const leftSection = this.createSection('left');
    this.renderFormatInfo(leftSection);
    
    // Center section - file statistics
    const centerSection = this.createSection('center');
    this.renderFileStats(centerSection);
    
    // Right section - performance and errors
    const rightSection = this.createSection('right');
    this.renderPerformanceInfo(rightSection);
    
    this.element.appendChild(leftSection);
    this.element.appendChild(centerSection);
    this.element.appendChild(rightSection);
  }

  private createSection(position: 'left' | 'center' | 'right'): HTMLElement {
    const section = document.createElement('div');
    section.className = `status-bar__section status-bar__section--${position}`;
    this.sections.set(position, section);
    return section;
  }

  private renderEmptyState(): void {
    const section = this.createSection('center');
    section.innerHTML = `
      <span class="status-bar__item">
        <span class="status-bar__text">Ready</span>
      </span>
    `;
    this.element.appendChild(section);
  }

  private renderFormatInfo(section: HTMLElement): void {
    if (!this.data?.format) return;

    const formatItem = document.createElement('span');
    formatItem.className = 'status-bar__item status-bar__item--format';
    
    const formatBadge = document.createElement('span');
    formatBadge.className = `status-bar__badge status-bar__badge--${this.data.format.toLowerCase()}`;
    formatBadge.textContent = this.data.format.toUpperCase();
    formatBadge.setAttribute('title', `Detected format: ${this.data.format}`);
    
    formatItem.appendChild(formatBadge);
    
    // Add confidence indicator if available
    if (this.data.confidence !== undefined) {
      const confidenceSpan = document.createElement('span');
      confidenceSpan.className = 'status-bar__confidence';
      confidenceSpan.textContent = `${Math.round(this.data.confidence * 100)}%`;
      confidenceSpan.setAttribute('title', `Detection confidence: ${Math.round(this.data.confidence * 100)}%`);
      
      // Add confidence level class
      const confidenceLevel = this.getConfidenceLevel(this.data.confidence);
      confidenceSpan.classList.add(`status-bar__confidence--${confidenceLevel}`);
      
      formatItem.appendChild(confidenceSpan);
    }
    
    section.appendChild(formatItem);
  }

  private renderFileStats(section: HTMLElement): void {
    const stats: Array<{ label: string; value: string | number; key: keyof StatusBarData }> = [
      { label: 'Size', value: this.formatFileSize(this.data?.fileSize), key: 'fileSize' },
      { label: 'Lines', value: this.data?.lineCount || 0, key: 'lineCount' },
      { label: 'Chars', value: this.formatNumber(this.data?.characterCount), key: 'characterCount' }
    ];

    stats.forEach(stat => {
      if (this.data?.[stat.key] !== undefined) {
        const item = document.createElement('span');
        item.className = 'status-bar__item status-bar__item--stat';
        
        const label = document.createElement('span');
        label.className = 'status-bar__label';
        label.textContent = stat.label;
        
        const value = document.createElement('span');
        value.className = 'status-bar__value';
        value.textContent = String(stat.value);
        
        item.appendChild(label);
        item.appendChild(value);
        section.appendChild(item);
      }
    });
  }

  private renderPerformanceInfo(section: HTMLElement): void {
    // Parse time
    if (this.data?.parseTime !== undefined) {
      const parseTimeItem = document.createElement('span');
      parseTimeItem.className = 'status-bar__item status-bar__item--performance';
      parseTimeItem.innerHTML = `
        <span class="status-bar__icon">⚡</span>
        <span class="status-bar__text">${this.formatTime(this.data.parseTime)}</span>
      `;
      parseTimeItem.setAttribute('title', `Parse time: ${this.formatTime(this.data.parseTime)}`);
      section.appendChild(parseTimeItem);
    }

    // Error/warning count
    const errorCount = this.data?.errors || 0;
    const warningCount = this.data?.warnings || 0;
    
    if (errorCount > 0 || warningCount > 0) {
      const issuesItem = document.createElement('span');
      issuesItem.className = 'status-bar__item status-bar__item--issues';
      
      if (errorCount > 0) {
        const errorSpan = document.createElement('span');
        errorSpan.className = 'status-bar__issue status-bar__issue--error';
        errorSpan.innerHTML = `<span class="status-bar__icon">⚠</span>${errorCount}`;
        errorSpan.setAttribute('title', `${errorCount} error${errorCount !== 1 ? 's' : ''}`);
        issuesItem.appendChild(errorSpan);
      }
      
      if (warningCount > 0) {
        const warningSpan = document.createElement('span');
        warningSpan.className = 'status-bar__issue status-bar__issue--warning';
        warningSpan.innerHTML = `<span class="status-bar__icon">!</span>${warningCount}`;
        warningSpan.setAttribute('title', `${warningCount} warning${warningCount !== 1 ? 's' : ''}`);
        issuesItem.appendChild(warningSpan);
      }
      
      section.appendChild(issuesItem);
    }
  }

  private getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
  }

  private formatFileSize(bytes?: number): string {
    if (!bytes) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  }

  private formatNumber(num?: number): string {
    if (!num) return '0';
    return num.toLocaleString();
  }

  private formatTime(ms: number): string {
    if (ms < 1000) {
      return `${Math.round(ms)}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
  }

  /**
   * Update status bar with detection result
   */
  public updateDetection(result: DetectionResult): void {
    this.setData({
      ...this.data,
      format: result.format,
      confidence: result.confidence
    });
  }

  /**
   * Update status bar with parse metadata
   */
  public updateMetadata(metadata: ParseMetadata): void {
    this.setData({
      ...this.data,
      fileSize: metadata.fileSize,
      parseTime: metadata.parseTime
    });
  }

  /**
   * Update content statistics
   */
  public updateContentStats(stats: { lineCount: number; characterCount: number }): void {
    this.setData({
      ...this.data,
      lineCount: stats.lineCount,
      characterCount: stats.characterCount
    });
  }

  /**
   * Update error/warning counts
   */
  public updateIssues(errors: number, warnings: number): void {
    this.setData({
      ...this.data,
      errors,
      warnings
    });
  }
}