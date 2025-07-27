// Recovery Modal - Session restoration interface
import type { SessionData } from '../../types/core';

/**
 * RecoveryModal - Modal component for session recovery
 * Similar to Bootstrap modal but built with vanilla TypeScript
 */
export class RecoveryModal {
  private element: HTMLDivElement;
  private sessionData: SessionData | null = null;
  private onRestore?: (session: SessionData) => void;
  private onDiscard?: () => void;

  constructor(container: HTMLElement) {
    this.element = document.createElement('div');
    this.element.className = 'recovery-modal';
    container.appendChild(this.element);
  }

  /**
   * Show recovery modal with session data
   */
  public showRecovery(
    sessionData: SessionData,
    onRestore: (session: SessionData) => void,
    onDiscard: () => void
  ): void {
    this.sessionData = sessionData;
    this.onRestore = onRestore;
    this.onDiscard = onDiscard;
    
    this.render();
    this.show();
  }

  /**
   * Hide recovery modal
   */
  public hide(): void {
    if (this.element) {
      this.element.style.display = 'none';
      document.body.style.overflow = ''; // Restore scrolling
    }
  }

  /**
   * Render modal content
   */
  private render(): void {
    if (!this.sessionData) return;

    const sessionAge = this.getSessionAge(this.sessionData.timestamp);
    const contentPreview = this.getContentPreview(this.sessionData.content);
    const formatBadge = this.getFormatBadge(this.sessionData.format);

    this.element.innerHTML = `
      <div class="recovery-modal__backdrop" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        padding: var(--spacing-md);
      ">
        <div class="recovery-modal__dialog" style="
          background: var(--color-bg-primary);
          border-radius: var(--border-radius-lg);
          border: 1px solid var(--color-border-default);
          max-width: 600px;
          width: 100%;
          max-height: 80vh;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        ">
          <!-- Header -->
          <div style="
            padding: var(--spacing-lg);
            border-bottom: 1px solid var(--color-border-default);
            display: flex;
            align-items: center;
            justify-content: space-between;
          ">
            <div>
              <h2 style="
                margin: 0;
                font-size: var(--font-size-lg);
                color: var(--color-text-primary);
                font-weight: 500;
              ">
                🔄 Session Recovery
              </h2>
              <p style="
                margin: var(--spacing-xs) 0 0 0;
                font-size: var(--font-size-sm);
                color: var(--color-text-secondary);
              ">
                We found a previous session from ${sessionAge}
              </p>
            </div>
            <button 
              data-action="close"
              style="
                background: none;
                border: none;
                color: var(--color-text-secondary);
                font-size: var(--font-size-lg);
                cursor: pointer;
                padding: var(--spacing-xs);
                border-radius: var(--border-radius-sm);
              "
              title="Close"
            >×</button>
          </div>

          <!-- Content -->
          <div style="padding: var(--spacing-lg);">
            <!-- Session Info -->
            <div style="
              background: var(--color-bg-secondary);
              border-radius: var(--border-radius-md);
              padding: var(--spacing-md);
              margin-bottom: var(--spacing-lg);
            ">
              <div style="
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: var(--spacing-sm);
              ">
                <div style="
                  display: flex;
                  align-items: center;
                  gap: var(--spacing-sm);
                ">
                  ${formatBadge}
                  <span style="
                    font-size: var(--font-size-sm);
                    color: var(--color-text-secondary);
                  ">${this.formatBytes(this.sessionData.content.length)}</span>
                </div>
                <span style="
                  font-size: var(--font-size-xs);
                  color: var(--color-text-muted);
                ">${new Date(this.sessionData.timestamp).toLocaleString()}</span>
              </div>
              
              <!-- Content Preview -->
              <div style="
                background: var(--color-bg-primary);
                border-radius: var(--border-radius-sm);
                padding: var(--spacing-sm);
                max-height: 200px;
                overflow-y: auto;
              ">
                <pre style="
                  margin: 0;
                  font-family: var(--font-family-mono);
                  font-size: var(--font-size-xs);
                  color: var(--color-text-primary);
                  white-space: pre-wrap;
                  word-break: break-word;
                ">${contentPreview}</pre>
              </div>
            </div>

            <!-- Actions -->
            <div style="
              display: flex;
              gap: var(--spacing-sm);
              justify-content: flex-end;
            ">
              <button 
                data-action="discard"
                style="
                  padding: var(--spacing-sm) var(--spacing-lg);
                  background: transparent;
                  border: 1px solid var(--color-border-default);
                  color: var(--color-text-secondary);
                  border-radius: var(--border-radius-sm);
                  cursor: pointer;
                  font-size: var(--font-size-sm);
                  transition: all 0.2s ease;
                "
                onmouseover="this.style.background='var(--color-bg-hover)'"
                onmouseout="this.style.background='transparent'"
              >
                Start Fresh
              </button>
              <button 
                data-action="restore"
                style="
                  padding: var(--spacing-sm) var(--spacing-lg);
                  background: var(--color-primary);
                  border: 1px solid var(--color-primary);
                  color: white;
                  border-radius: var(--border-radius-sm);
                  cursor: pointer;
                  font-size: var(--font-size-sm);
                  font-weight: 500;
                  transition: all 0.2s ease;
                "
                onmouseover="this.style.background='var(--color-primary-hover)'"
                onmouseout="this.style.background='var(--color-primary)'"
              >
                Restore Session
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for modal interactions
   */
  private setupEventHandlers(): void {
    if (!this.element) return;

    // Close button
    const closeButton = this.element.querySelector('[data-action="close"]');
    closeButton?.addEventListener('click', () => {
      this.handleDiscard();
    });

    // Discard button
    const discardButton = this.element.querySelector('[data-action="discard"]');
    discardButton?.addEventListener('click', () => {
      this.handleDiscard();
    });

    // Restore button
    const restoreButton = this.element.querySelector('[data-action="restore"]');
    restoreButton?.addEventListener('click', () => {
      this.handleRestore();
    });

    // Backdrop click
    const backdrop = this.element.querySelector('.recovery-modal__backdrop');
    backdrop?.addEventListener('click', (event) => {
      if (event.target === backdrop) {
        this.handleDiscard();
      }
    });

    // Keyboard navigation
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  /**
   * Handle keyboard navigation
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.element || this.element.style.display === 'none') return;

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.handleDiscard();
        break;
      case 'Enter':
        event.preventDefault();
        this.handleRestore();
        break;
    }
  }

  /**
   * Handle restore action
   */
  private handleRestore(): void {
    if (this.sessionData && this.onRestore) {
      this.onRestore(this.sessionData);
    }
    this.hide();
    this.cleanup();
  }

  /**
   * Handle discard action
   */
  private handleDiscard(): void {
    if (this.onDiscard) {
      this.onDiscard();
    }
    this.hide();
    this.cleanup();
  }

  /**
   * Show modal
   */
  private show(): void {
    if (this.element) {
      this.element.style.display = 'block';
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
      
      // Focus management
      const restoreButton = this.element.querySelector('[data-action="restore"]') as HTMLElement;
      restoreButton?.focus();
    }
  }

  /**
   * Cleanup event listeners
   */
  private cleanup(): void {
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
  }

  /**
   * Get session age as human-readable string
   */
  private getSessionAge(timestamp: number): string {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return 'just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    }
  }

  /**
   * Get content preview (first 500 characters)
   */
  private getContentPreview(content: string): string {
    const maxLength = 500;
    const preview = content.length > maxLength ? 
      content.substring(0, maxLength) + '...' : 
      content;
    
    // Escape HTML
    const div = document.createElement('div');
    div.textContent = preview;
    return div.innerHTML;
  }

  /**
   * Get format badge HTML
   */
  private getFormatBadge(format: string): string {
    const formatUpper = format.toUpperCase();
    const color = this.getFormatColor(format);
    
    return `
      <span style="
        background: ${color};
        color: white;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 10px;
        font-weight: 500;
        text-transform: uppercase;
      ">${formatUpper}</span>
    `;
  }

  /**
   * Get color for format badge
   */
  private getFormatColor(format: string): string {
    switch (format.toLowerCase()) {
      case 'json': return '#f7931e';
      case 'csv': return '#4caf50';
      case 'xml': return '#2196f3';
      default: return '#9e9e9e';
    }
  }

  /**
   * Format bytes for human-readable display
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

/**
 * Create and show recovery modal
 */
export function showRecoveryModal(
  sessionData: SessionData,
  onRestore: (session: SessionData) => void,
  onDiscard: () => void
): void {
  // Create modal container
  const container = document.createElement('div');
  container.id = 'recovery-modal-container';
  document.body.appendChild(container);

  // Create and show modal
  const modal = new RecoveryModal(container);
  modal.showRecovery(sessionData, 
    (session) => {
      onRestore(session);
      // Cleanup
      document.body.removeChild(container);
    },
    () => {
      onDiscard();
      // Cleanup
      document.body.removeChild(container);
    }
  );
}