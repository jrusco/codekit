// Base component class - similar to Spring's @Component pattern

import type { ComponentSize, ComponentState } from '../../types/ui';
import { PerformanceMonitor } from '../../utils/performance';

/**
 * Abstract base component following enterprise patterns
 * Similar to React.Component or Angular's Component base class
 */
export abstract class BaseComponent<T = any> {
  protected element: HTMLElement;
  protected container: HTMLElement;
  protected state: ComponentState = 'idle';
  protected size: ComponentSize = 'md';
  protected data: T | null = null;
  
  private eventListeners = new Map<string, EventListener[]>();
  private performanceMonitor = PerformanceMonitor.getInstance();

  constructor(container: HTMLElement) {
    this.container = container;
    this.element = this.createElement();
    this.setupEventListeners();
    this.render();
  }

  /**
   * Abstract method for creating the component's DOM element
   * Must be implemented by subclasses
   */
  protected abstract createElement(): HTMLElement;

  /**
   * Abstract method for rendering component content
   * Called after state/data changes
   */
  protected abstract render(): void;

  /**
   * Optional method for setting up event listeners
   * Override in subclasses that need event handling
   */
  protected setupEventListeners(): void {
    // Default implementation - no listeners
  }

  /**
   * Set component data and trigger re-render
   */
  public setData(data: T): void {
    const endTiming = this.performanceMonitor.startTiming(
      `${this.constructor.name}.setData`
    );
    
    this.data = data;
    this.render();
    
    endTiming();
  }

  /**
   * Set component state and trigger re-render
   */
  public setState(state: ComponentState): void {
    if (this.state !== state) {
      this.state = state;
      this.updateStateClasses();
      this.render();
    }
  }

  /**
   * Set component size
   */
  public setSize(size: ComponentSize): void {
    if (this.size !== size) {
      this.element.classList.remove(`size-${this.size}`);
      this.size = size;
      this.element.classList.add(`size-${size}`);
    }
  }

  /**
   * Add event listener with cleanup tracking
   */
  protected addEventListener(
    event: string, 
    listener: EventListener, 
    element: HTMLElement = this.element
  ): void {
    element.addEventListener(event, listener);
    
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  /**
   * Update CSS classes based on current state
   */
  private updateStateClasses(): void {
    // Remove all state classes
    this.element.classList.remove('state-idle', 'state-loading', 'state-error', 'state-success');
    // Add current state class
    this.element.classList.add(`state-${this.state}`);
  }

  /**
   * Mount component to container
   */
  public mount(): void {
    if (!this.container.contains(this.element)) {
      this.container.appendChild(this.element);
    }
  }

  /**
   * Unmount component and cleanup resources
   */
  public unmount(): void {
    // Cleanup event listeners
    this.eventListeners.forEach((listeners, event) => {
      listeners.forEach(listener => {
        this.element.removeEventListener(event, listener);
      });
    });
    this.eventListeners.clear();

    // Remove from DOM
    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }

  /**
   * Get the component's DOM element
   */
  public getElement(): HTMLElement {
    return this.element;
  }

  /**
   * Show component
   */
  public show(): void {
    this.element.style.display = '';
    this.element.setAttribute('aria-hidden', 'false');
  }

  /**
   * Hide component
   */
  public hide(): void {
    this.element.style.display = 'none';
    this.element.setAttribute('aria-hidden', 'true');
  }

  /**
   * Check if component is visible
   */
  public isVisible(): boolean {
    return this.element.style.display !== 'none';
  }

  /**
   * Focus the component
   */
  public focus(): void {
    if (this.element.tabIndex >= 0) {
      this.element.focus();
    } else {
      // Find first focusable element
      const focusable = this.element.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      
      if (focusable) {
        focusable.focus();
      }
    }
  }
}