// Split panel layout component - enterprise responsive design

import { BaseComponent } from '@/ui/components/BaseComponent';
// Split panel layout component - enterprise responsive design

/**
 * Split panel configuration
 */
export interface SplitPanelConfig {
  orientation: 'horizontal' | 'vertical';
  initialSplit: number; // Percentage (0-100)
  minSize: number; // Minimum size in pixels
  resizable: boolean;
  collapsible: boolean;
}

/**
 * Professional split panel layout component
 * Similar to VS Code's split editor or IntelliJ's panel system
 */
export class SplitPanel extends BaseComponent<SplitPanelConfig> {
  private leftPanel!: HTMLElement;
  private rightPanel!: HTMLElement;
  private separator!: HTMLElement;
  private config: SplitPanelConfig;
  
  private isDragging = false;
  private startPos = 0;
  private startSplit = 0;

  constructor(container: HTMLElement, config: SplitPanelConfig) {
    super(container);
    this.config = config;
    this.setData(config);
    this.setupSplitPanelEventListeners();
  }

  protected createElement(): HTMLElement {
    const element = document.createElement('div');
    element.className = 'split-panel';
    element.setAttribute('role', 'group');
    element.setAttribute('aria-label', 'Split panel layout');
    
    return element;
  }

  protected render(): void {
    if (!this.data) return;

    // Update orientation class
    this.element.className = `split-panel split-panel--${this.data.orientation}`;
    
    this.element.innerHTML = '';
    
    // Create left/top panel
    this.leftPanel = document.createElement('div');
    this.leftPanel.className = 'split-panel__pane split-panel__pane--primary';
    this.leftPanel.setAttribute('role', 'region');
    this.leftPanel.setAttribute('aria-label', 'Primary panel');
    
    // Create separator (if resizable)
    if (this.config.resizable) {
      this.separator = document.createElement('div');
      this.separator.className = 'split-panel__separator';
      this.separator.setAttribute('role', 'separator');
      this.separator.setAttribute('aria-orientation', this.config.orientation);
      this.separator.setAttribute('tabindex', '0');
      this.separator.setAttribute('aria-label', 'Panel separator - drag to resize');
      
      // Add resize handle
      const handle = document.createElement('div');
      handle.className = 'split-panel__handle';
      this.separator.appendChild(handle);
    }
    
    // Create right/bottom panel
    this.rightPanel = document.createElement('div');
    this.rightPanel.className = 'split-panel__pane split-panel__pane--secondary';
    this.rightPanel.setAttribute('role', 'region');
    this.rightPanel.setAttribute('aria-label', 'Secondary panel');
    
    // Append elements
    this.element.appendChild(this.leftPanel);
    if (this.separator) {
      this.element.appendChild(this.separator);
    }
    this.element.appendChild(this.rightPanel);
    
    // Apply initial split
    this.applySplit(this.config.initialSplit);
  }

  protected setupEventListeners(): void {
    // Base component event listeners (empty for split panel)
  }

  private setupSplitPanelEventListeners(): void {
    if (!this.config?.resizable || !this.separator) return;

    // Mouse events for desktop
    this.separator.addEventListener('mousedown', this.handleMouseDown.bind(this));
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    
    // Touch events for mobile
    this.separator.addEventListener('touchstart', this.handleTouchStart.bind(this));
    document.addEventListener('touchmove', this.handleTouchMove.bind(this));
    document.addEventListener('touchend', this.handleTouchEnd.bind(this));
    
    // Keyboard support
    this.separator.addEventListener('keydown', this.handleKeyDown.bind(this));
    
    // Window resize
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private handleMouseDown(event: MouseEvent): void {
    event.preventDefault();
    this.startDrag(event.clientX, event.clientY);
  }

  private handleTouchStart(event: TouchEvent): void {
    event.preventDefault();
    const touch = event.touches[0];
    this.startDrag(touch.clientX, touch.clientY);
  }

  private startDrag(clientX: number, clientY: number): void {
    this.isDragging = true;
    this.startPos = this.config.orientation === 'horizontal' ? clientX : clientY;
    this.startSplit = this.getCurrentSplit();
    
    this.element.classList.add('split-panel--dragging');
    document.body.style.cursor = this.config.orientation === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;
    event.preventDefault();
    this.updateSplit(event.clientX, event.clientY);
  }

  private handleTouchMove(event: TouchEvent): void {
    if (!this.isDragging) return;
    event.preventDefault();
    const touch = event.touches[0];
    this.updateSplit(touch.clientX, touch.clientY);
  }

  private updateSplit(clientX: number, clientY: number): void {
    const currentPos = this.config.orientation === 'horizontal' ? clientX : clientY;
    const delta = currentPos - this.startPos;
    const containerSize = this.config.orientation === 'horizontal' 
      ? this.element.clientWidth 
      : this.element.clientHeight;
    
    const deltaPercent = (delta / containerSize) * 100;
    const newSplit = Math.max(0, Math.min(100, this.startSplit + deltaPercent));
    
    this.applySplit(newSplit);
  }

  private handleMouseUp(): void {
    this.endDrag();
  }

  private handleTouchEnd(): void {
    this.endDrag();
  }

  private endDrag(): void {
    if (!this.isDragging) return;
    
    this.isDragging = false;
    this.element.classList.remove('split-panel--dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!event.target || event.target !== this.separator) return;
    
    const step = 5; // 5% steps
    let newSplit = this.getCurrentSplit();
    
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        newSplit = Math.max(0, newSplit - step);
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        newSplit = Math.min(100, newSplit + step);
        break;
      case 'Home':
        newSplit = 0;
        break;
      case 'End':
        newSplit = 100;
        break;
      default:
        return;
    }
    
    event.preventDefault();
    this.applySplit(newSplit);
  }

  private handleResize(): void {
    // Reapply split on window resize to maintain proportions
    this.applySplit(this.getCurrentSplit());
  }

  private applySplit(percentage: number): void {
    const clampedPercentage = Math.max(5, Math.min(95, percentage)); // Prevent complete collapse
    
    if (this.config.orientation === 'horizontal') {
      this.leftPanel.style.width = `${clampedPercentage}%`;
      this.rightPanel.style.width = `${100 - clampedPercentage}%`;
    } else {
      this.leftPanel.style.height = `${clampedPercentage}%`;
      this.rightPanel.style.height = `${100 - clampedPercentage}%`;
    }
  }

  private getCurrentSplit(): number {
    const style = this.config.orientation === 'horizontal' 
      ? this.leftPanel.style.width 
      : this.leftPanel.style.height;
    
    return parseFloat(style) || this.config.initialSplit;
  }

  /**
   * Get the primary (left/top) panel element
   */
  public getPrimaryPanel(): HTMLElement {
    return this.leftPanel;
  }

  /**
   * Get the secondary (right/bottom) panel element
   */
  public getSecondaryPanel(): HTMLElement {
    return this.rightPanel;
  }

  /**
   * Set split percentage programmatically
   */
  public setSplit(percentage: number): void {
    this.applySplit(percentage);
  }

  /**
   * Get current split percentage
   */
  public getSplit(): number {
    return this.getCurrentSplit();
  }
}