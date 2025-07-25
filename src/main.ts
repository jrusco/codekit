// Main application entry point - enterprise initialization pattern

import './styles/main.css';
import { darkTheme, generateCSSCustomProperties } from './styles/theme';
import { SplitPanel } from './ui/layout/SplitPanel';
import { StatusBar } from './ui/components/StatusBar';
import { ValidationPanel } from './ui/components/ValidationPanel';
import { initializeDefaultShortcuts } from './ui/components/KeyboardShortcuts';
import { PerformanceMonitor } from './utils/performance';
import { initializeFormatters } from './core/formatters/index.ts';
import { parseManager } from './ui/components/ParseManager.ts';

/**
 * Main application class - similar to Spring Boot's @SpringBootApplication
 */
class CodeKitApplication {
  private splitPanel!: SplitPanel;
  private statusBar!: StatusBar;
  private validationPanel!: ValidationPanel;
  private performanceMonitor = PerformanceMonitor.getInstance();

  constructor() {
    this.initializeFormatters();
    this.initializeTheme();
    this.initializeLayout();
    this.initializeComponents();
    this.initializeKeyboardShortcuts();
    this.setupPerformanceMonitoring();
  }

  /**
   * Initialize formatters system
   */
  private initializeFormatters(): void {
    const endTiming = this.performanceMonitor.startTiming('Application.initializeFormatters');
    
    try {
      initializeFormatters();
      console.log('✅ Formatters initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize formatters:', error);
      throw error;
    }
    
    endTiming();
  }

  /**
   * Initialize theme system
   */
  private initializeTheme(): void {
    const endTiming = this.performanceMonitor.startTiming('Application.initializeTheme');
    
    // Apply CSS custom properties to root
    const root = document.documentElement;
    const customProperties = generateCSSCustomProperties(darkTheme);
    
    Object.entries(customProperties).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
    
    endTiming();
  }

  /**
   * Initialize main application layout
   */
  private initializeLayout(): void {
    const endTiming = this.performanceMonitor.startTiming('Application.initializeLayout');
    
    const appContainer = document.getElementById('app');
    if (!appContainer) {
      throw new Error('Application container not found');
    }

    // Create main application structure
    appContainer.innerHTML = `
      <div class="app">
        <header class="app__header app__header--centered">
          <h1 style="margin: 0; font-size: var(--font-size-lg); color: white; font-weight: 500;">
            CodeKit
          </h1>
        </header>
        <main class="app__main" id="main-content">
          <!-- Split panel will be inserted here -->
        </main>
        <footer class="app__footer" id="status-container">
          <!-- Status bar will be inserted here -->
        </footer>
      </div>
    `;
    
    endTiming();
  }

  /**
   * Initialize main UI components
   */
  private initializeComponents(): void {
    const endTiming = this.performanceMonitor.startTiming('Application.initializeComponents');
    
    // Initialize split panel
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
      throw new Error('Main content container not found');
    }

    this.splitPanel = new SplitPanel(mainContent, {
      orientation: 'horizontal',
      initialSplit: 50,
      minSize: 200,
      resizable: true,
      collapsible: true
    });

    this.splitPanel.mount();

    // Add placeholder content to panels
    this.setupPanelContent();

    // Initialize status bar
    const statusContainer = document.getElementById('status-container');
    if (!statusContainer) {
      throw new Error('Status container not found');
    }

    this.statusBar = new StatusBar(statusContainer);
    // Set initial status bar data
    this.statusBar.setData({
      format: 'READY',
      confidence: 0,
      fileSize: 0,
      lineCount: 0,
      characterCount: 0,
      parseTime: 0,
      errors: 0,
      warnings: 0
    });
    this.statusBar.mount();

    // Initialize validation panel
    const validationContainer = document.getElementById('validation-container');
    if (!validationContainer) {
      throw new Error('Validation container not found');
    }

    this.validationPanel = new ValidationPanel(validationContainer);
    this.validationPanel.mount();

    // Connect parse manager to status bar and validation panel
    parseManager.setStatusCallback((data) => {
      this.statusBar.setData(data);
    });

    parseManager.setValidationCallback((errors) => {
      this.validationPanel.updateValidation(errors);
    });
    
    endTiming();
  }

  /**
   * Setup placeholder content for split panels
   */
  private setupPanelContent(): void {
    const leftPanel = this.splitPanel.getPrimaryPanel();
    const rightPanel = this.splitPanel.getSecondaryPanel();

    // Left panel - Input area
    leftPanel.innerHTML = `
      <div style="padding: var(--spacing-md); height: 100%; display: flex; flex-direction: column;">
        <textarea 
          data-role="input"
          placeholder="Paste your JSON, CSV, XML, or other text data here..." 
          style="
            flex: 1; 
            background: var(--color-bg-primary); 
            border: 1px solid var(--color-border-default); 
            border-radius: var(--border-radius-md); 
            padding: var(--spacing-md); 
            color: var(--color-text-primary); 
            font-family: var(--font-family-mono); 
            font-size: var(--font-size-sm);
            resize: none;
            outline: none;
          "
        ></textarea>
      </div>
    `;

    // Right panel - Output area with validation panel
    rightPanel.innerHTML = `
      <div style="padding: var(--spacing-md); height: 100%; display: flex; flex-direction: column;">
        <div data-role="output" style="
          flex: 1; 
          background: var(--color-bg-primary); 
          border: 1px solid var(--color-border-default); 
          border-radius: var(--border-radius-md); 
          overflow: hidden;
          min-height: 0;
          display: flex;
          flex-direction: column;
          margin-bottom: var(--spacing-md);
        ">
          <div style="
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: var(--spacing-md);
            color: var(--color-text-secondary);
          ">
            <div style="text-align: center;">
              <div style="font-size: var(--font-size-lg); margin-bottom: var(--spacing-sm); color: var(--color-text-muted);">
                ⚡
              </div>
              <div>Ready to parse your data</div>
              <div style="font-size: var(--font-size-xs); margin-top: var(--spacing-xs); color: var(--color-text-muted);">
                Supports JSON, CSV, XML and more
              </div>
            </div>
          </div>
        </div>
        <div id="validation-container" style="
          flex: 0 0 auto;
          max-height: 200px;
          border: 1px solid var(--color-border-default);
          border-radius: var(--border-radius-md);
          overflow: hidden;
        ">
          <!-- Validation panel will be inserted here -->
        </div>
      </div>
    `;
  }

  /**
   * Initialize keyboard shortcuts
   */
  private initializeKeyboardShortcuts(): void {
    const endTiming = this.performanceMonitor.startTiming('Application.initializeKeyboardShortcuts');
    
    initializeDefaultShortcuts();
    
    endTiming();
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    // Log application startup metrics
    const startupMetrics = this.performanceMonitor.getMetrics();
    console.log('Application startup metrics:', startupMetrics);

    // Setup periodic performance reporting (in development)
    if (import.meta.env.DEV) {
      setInterval(() => {
        const metrics = this.performanceMonitor.getMetrics();
        if (metrics.length > 0) {
          console.group('Performance Metrics');
          metrics.forEach(metric => {
            if (metric.duration > 10) { // Only log operations > 10ms
              console.log(`${metric.operation}: ${metric.duration.toFixed(2)}ms`);
            }
          });
          console.groupEnd();
          this.performanceMonitor.clearMetrics();
        }
      }, 30000); // Every 30 seconds
    }
  }

  /**
   * Get split panel instance for external access
   */
  public getSplitPanel(): SplitPanel {
    return this.splitPanel;
  }

  /**
   * Get status bar instance for external access
   */
  public getStatusBar(): StatusBar {
    return this.statusBar;
  }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const startupTiming = PerformanceMonitor.getInstance().startTiming('Application.startup');
  
  try {
    const app = new CodeKitApplication();
    
    // Make app instance globally available for debugging
    if (import.meta.env.DEV) {
      (window as any).codeKitApp = app;
    }
    
    console.log('✅ CodeKit application initialized successfully');
    
  } catch (error) {
    console.error('❌ Failed to initialize CodeKit application:', error);
    
    // Show error message to user
    const appContainer = document.getElementById('app');
    if (appContainer) {
      appContainer.innerHTML = `
        <div style="
          display: flex; 
          align-items: center; 
          justify-content: center; 
          height: 100vh; 
          background: #0d1117; 
          color: #f85149;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        ">
          <div style="text-align: center;">
            <h1>Application Error</h1>
            <p>Failed to initialize CodeKit. Please refresh the page.</p>
            <details style="margin-top: 1rem;">
              <summary>Error Details</summary>
              <pre style="text-align: left; background: rgba(255,255,255,0.1); padding: 1rem; border-radius: 4px;">
                ${error instanceof Error ? error.stack : String(error)}
              </pre>
            </details>
          </div>
        </div>
      `;
    }
  } finally {
    startupTiming();
  }
});

// Handle unhandled errors
window.addEventListener('error', (event) => {
  console.error('Unhandled error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});