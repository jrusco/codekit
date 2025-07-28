// Validation panel component for displaying errors, warnings, and info messages

import { BaseComponent } from './BaseComponent';
import type { ValidationError } from '../../types/core';
import { SecurityManager } from '../../core/security/SecurityManager.js';

/**
 * Validation panel data interface
 */
export interface ValidationPanelData {
  errors: ValidationError[];
  visible: boolean;
}

/**
 * Professional validation panel component
 * Similar to VS Code's Problems panel or IntelliJ's validation messages
 */
export class ValidationPanel extends BaseComponent<ValidationPanelData> {
  private collapsedSections: Set<string> = new Set();

  constructor(container: HTMLElement) {
    super(container);
  }

  protected createElement(): HTMLElement {
    const element = document.createElement('div');
    element.className = 'validation-panel';
    element.setAttribute('role', 'log');
    element.setAttribute('aria-live', 'polite');
    element.setAttribute('aria-label', 'Validation messages');
    
    return element;
  }

  protected render(): void {
    if (!this.data || !this.data.visible || this.data.errors.length === 0) {
      this.element.style.display = 'none';
      return;
    }

    this.element.style.display = 'block';
    
    // Group errors by severity
    const errorsBySeverity = this.groupBySeverity(this.data.errors);
    
    this.element.innerHTML = `
      <div class="validation-panel__header">
        <h3 class="validation-panel__title">Validation Messages</h3>
        <div class="validation-panel__summary">
          ${this.renderSummary(errorsBySeverity)}
        </div>
      </div>
      <div class="validation-panel__content">
        ${this.renderSeveritySections(errorsBySeverity)}
      </div>
    `;

    // Add event listeners for collapsible sections
    this.attachEventListeners();
  }

  private groupBySeverity(errors: ValidationError[]): Record<string, ValidationError[]> {
    const groups: Record<string, ValidationError[]> = {
      error: [],
      warning: [],
      info: []
    };

    errors.forEach(error => {
      const severity = error.severity || 'error';
      if (groups[severity]) {
        groups[severity].push(error);
      }
    });

    return groups;
  }

  private renderSummary(errorsBySeverity: Record<string, ValidationError[]>): string {
    const counts = [
      { severity: 'error', count: errorsBySeverity.error?.length || 0, icon: '⚠', label: 'Error' },
      { severity: 'warning', count: errorsBySeverity.warning?.length || 0, icon: '!', label: 'Warning' },
      { severity: 'info', count: errorsBySeverity.info?.length || 0, icon: 'ℹ', label: 'Info' }
    ].filter(item => item.count > 0);

    return counts.map(item => `
      <span class="validation-panel__summary-item validation-panel__summary-item--${item.severity}">
        <span class="validation-panel__icon">${item.icon}</span>
        <span class="validation-panel__count">${item.count}</span>
        <span class="validation-panel__label">${item.label}${item.count !== 1 ? 's' : ''}</span>
      </span>
    `).join('');
  }

  private renderSeveritySections(errorsBySeverity: Record<string, ValidationError[]>): string {
    const sections = ['error', 'warning', 'info']
      .filter(severity => errorsBySeverity[severity]?.length > 0)
      .map(severity => this.renderSeveritySection(severity, errorsBySeverity[severity]))
      .join('');

    return sections || '<div class="validation-panel__empty">No validation issues found</div>';
  }

  private renderSeveritySection(severity: string, errors: ValidationError[]): string {
    const isCollapsed = this.collapsedSections.has(severity);
    const icon = {
      error: '⚠',
      warning: '!',
      info: 'ℹ'
    }[severity] || '•';

    return `
      <div class="validation-panel__section validation-panel__section--${severity}">
        <button 
          class="validation-panel__section-header ${isCollapsed ? 'validation-panel__section-header--collapsed' : ''}"
          data-severity="${severity}"
          aria-expanded="${!isCollapsed}"
          aria-controls="validation-section-${severity}"
        >
          <span class="validation-panel__section-toggle">${isCollapsed ? '▶' : '▼'}</span>
          <span class="validation-panel__section-icon">${icon}</span>
          <span class="validation-panel__section-title">${severity.charAt(0).toUpperCase() + severity.slice(1)}s</span>
          <span class="validation-panel__section-count">(${errors.length})</span>
        </button>
        <div 
          id="validation-section-${severity}"
          class="validation-panel__section-content ${isCollapsed ? 'validation-panel__section-content--collapsed' : ''}"
        >
          ${errors.map(error => this.renderValidationError(error, severity)).join('')}
        </div>
      </div>
    `;
  }

  private renderValidationError(error: ValidationError, severity: string): string {
    const locationInfo = this.formatLocationInfo(error);
    const codeInfo = error.code ? `<span class="validation-panel__error-code">[${error.code}]</span>` : '';
    
    return `
      <div class="validation-panel__error validation-panel__error--${severity}">
        <div class="validation-panel__error-header">
          ${locationInfo}
          ${codeInfo}
        </div>
        <div class="validation-panel__error-message">${this.escapeHtml(error.message)}</div>
      </div>
    `;
  }

  private formatLocationInfo(error: ValidationError): string {
    if (error.line !== undefined) {
      const column = error.column !== undefined ? `:${error.column}` : '';
      return `<span class="validation-panel__location">Line ${error.line}${column}</span>`;
    }
    return '';
  }

  private escapeHtml(text: string): string {
    // Use SecurityManager for comprehensive error message sanitization
    const securityManager = SecurityManager.getInstance();
    
    try {
      // Create mock error to use the sanitization logic
      const mockError = new Error(text);
      const sanitizedError = securityManager.sanitizeErrorMessage(mockError);
      
      // Additional HTML escaping for safe DOM insertion
      const div = document.createElement('div');
      div.textContent = sanitizedError.message;
      return div.innerHTML;
    } catch (error) {
      // Fallback to basic HTML escaping if security manager fails
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  }

  private attachEventListeners(): void {
    const headers = this.element.querySelectorAll('.validation-panel__section-header');
    headers.forEach(header => {
      header.addEventListener('click', (e) => {
        const button = e.currentTarget as HTMLButtonElement;
        const severity = button.dataset.severity;
        if (severity) {
          this.toggleSection(severity);
        }
      });
    });
  }

  private toggleSection(severity: string): void {
    if (this.collapsedSections.has(severity)) {
      this.collapsedSections.delete(severity);
    } else {
      this.collapsedSections.add(severity);
    }
    this.render();
  }

  /**
   * Update validation messages
   */
  public updateValidation(errors: ValidationError[]): void {
    this.setData({
      errors,
      visible: errors.length > 0
    });
  }

  /**
   * Show or hide the validation panel
   */
  public setVisible(visible: boolean): void {
    this.setData({
      ...this.data || { errors: [] },
      visible
    });
  }

  /**
   * Clear all validation messages
   */
  public clear(): void {
    this.setData({
      errors: [],
      visible: false
    });
  }

  /**
   * Get current error counts by severity
   */
  public getErrorCounts(): { errors: number; warnings: number; info: number } {
    if (!this.data?.errors) {
      return { errors: 0, warnings: 0, info: 0 };
    }

    const groups = this.groupBySeverity(this.data.errors);
    return {
      errors: groups.error?.length || 0,
      warnings: groups.warning?.length || 0,
      info: groups.info?.length || 0
    };
  }
}