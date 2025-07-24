// Enterprise keyboard shortcut system - similar to VS Code's keybinding system

import type { KeyboardShortcut } from '@/types/ui';

/**
 * Keyboard shortcut manager - singleton pattern
 * Similar to IntelliJ's ActionManager or VS Code's keybinding service
 */
export class KeyboardShortcutManager {
  private static instance: KeyboardShortcutManager;
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private isEnabled = true;

  private constructor() {
    this.setupGlobalListener();
  }

  static getInstance(): KeyboardShortcutManager {
    if (!KeyboardShortcutManager.instance) {
      KeyboardShortcutManager.instance = new KeyboardShortcutManager();
    }
    return KeyboardShortcutManager.instance;
  }

  /**
   * Register a keyboard shortcut
   */
  public register(shortcut: KeyboardShortcut): void {
    const key = this.createShortcutKey(shortcut);
    this.shortcuts.set(key, shortcut);
  }

  /**
   * Unregister a keyboard shortcut
   */
  public unregister(shortcut: Partial<KeyboardShortcut>): void {
    const key = this.createShortcutKey(shortcut);
    this.shortcuts.delete(key);
  }

  /**
   * Enable/disable all keyboard shortcuts
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Get all registered shortcuts
   */
  public getShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Get shortcuts grouped by category for help display
   */
  public getShortcutsByCategory(): Record<string, KeyboardShortcut[]> {
    const categories: Record<string, KeyboardShortcut[]> = {};
    
    this.shortcuts.forEach(shortcut => {
      const category = this.extractCategory(shortcut.description);
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(shortcut);
    });

    return categories;
  }

  private setupGlobalListener(): void {
    document.addEventListener('keydown', (event: KeyboardEvent) => {
      if (!this.isEnabled) return;
      
      // Don't trigger shortcuts when typing in input fields
      if (this.isInputElement(event.target as Element)) return;
      
      const key = this.createKeyFromEvent(event);
      const shortcut = this.shortcuts.get(key);
      
      if (shortcut && this.shouldTrigger(event, shortcut)) {
        event.preventDefault();
        event.stopPropagation();
        
        try {
          shortcut.action();
        } catch (error) {
          console.error('Error executing keyboard shortcut:', error);
        }
      }
    });
  }

  private createShortcutKey(shortcut: Partial<KeyboardShortcut>): string {
    const parts: string[] = [];
    
    if (shortcut.ctrlKey) parts.push('ctrl');
    if (shortcut.shiftKey) parts.push('shift');
    if (shortcut.altKey) parts.push('alt');
    if (shortcut.key) parts.push(shortcut.key.toLowerCase());
    
    return parts.join('+');
  }

  private createKeyFromEvent(event: KeyboardEvent): string {
    const parts: string[] = [];
    
    if (event.ctrlKey || event.metaKey) parts.push('ctrl');
    if (event.shiftKey) parts.push('shift');
    if (event.altKey) parts.push('alt');
    parts.push(event.key.toLowerCase());
    
    return parts.join('+');
  }

  private shouldTrigger(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
    return (
      (!!shortcut.ctrlKey === (event.ctrlKey || event.metaKey)) &&
      (!!shortcut.shiftKey === event.shiftKey) &&
      (!!shortcut.altKey === event.altKey) &&
      shortcut.key.toLowerCase() === event.key.toLowerCase()
    );
  }

  private isInputElement(element: Element | null): boolean {
    if (!element) return false;
    
    const tagName = element.tagName.toLowerCase();
    const contentEditable = element.getAttribute('contenteditable');
    
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      contentEditable === 'true' ||
      contentEditable === ''
    );
  }

  private extractCategory(description: string): string {
    // Extract category from description (e.g., "Edit: Copy" -> "Edit")
    const colonIndex = description.indexOf(':');
    if (colonIndex > 0) {
      return description.substring(0, colonIndex).trim();
    }
    return 'General';
  }

  /**
   * Format shortcut for display (e.g., "Ctrl+C")
   */
  public formatShortcut(shortcut: KeyboardShortcut): string {
    const parts: string[] = [];
    
    if (shortcut.ctrlKey) {
      parts.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl');
    }
    if (shortcut.shiftKey) {
      parts.push('Shift');
    }
    if (shortcut.altKey) {
      parts.push(navigator.platform.includes('Mac') ? '⌥' : 'Alt');
    }
    
    // Format key name
    let keyName = shortcut.key;
    if (keyName.length === 1) {
      keyName = keyName.toUpperCase();
    } else {
      // Handle special keys
      const specialKeys: Record<string, string> = {
        'arrowup': '↑',
        'arrowdown': '↓', 
        'arrowleft': '←',
        'arrowright': '→',
        'enter': '↵',
        'escape': 'Esc',
        'backspace': '⌫',
        'delete': 'Del',
        'tab': '⇥'
      };
      keyName = specialKeys[keyName.toLowerCase()] || keyName;
    }
    
    parts.push(keyName);
    
    return parts.join('+');
  }
}

/**
 * Default keyboard shortcuts for the application
 */
export const defaultShortcuts: KeyboardShortcut[] = [
  // File operations
  {
    key: 'o',
    ctrlKey: true,
    description: 'File: Open file',
    action: () => console.log('Open file') // Will be replaced with actual implementation
  },
  {
    key: 's',
    ctrlKey: true,
    description: 'File: Save content',
    action: () => console.log('Save content')
  },
  
  // Edit operations
  {
    key: 'c',
    ctrlKey: true,
    description: 'Edit: Copy content',
    action: () => console.log('Copy content')
  },
  {
    key: 'v',
    ctrlKey: true,
    description: 'Edit: Paste content',
    action: () => console.log('Paste content')
  },
  {
    key: 'a',
    ctrlKey: true,
    description: 'Edit: Select all',
    action: () => console.log('Select all')
  },
  {
    key: 'f',
    ctrlKey: true,
    description: 'Edit: Find in content',
    action: () => console.log('Find in content')
  },
  
  // View operations
  {
    key: 'r',
    ctrlKey: true,
    description: 'View: Refresh/reparse',
    action: () => console.log('Refresh content')
  },
  {
    key: 't',
    ctrlKey: true,
    description: 'View: Toggle render mode',
    action: () => console.log('Toggle render mode')
  },
  {
    key: '=',
    ctrlKey: true,
    description: 'View: Zoom in',
    action: () => console.log('Zoom in')
  },
  {
    key: '-',
    ctrlKey: true,
    description: 'View: Zoom out',
    action: () => console.log('Zoom out')
  },
  {
    key: '0',
    ctrlKey: true,
    description: 'View: Reset zoom',
    action: () => console.log('Reset zoom')
  },
  
  // Help
  {
    key: 'F1',
    description: 'Help: Show keyboard shortcuts',
    action: () => console.log('Show help')
  },
  {
    key: '?',
    ctrlKey: true,
    description: 'Help: Show quick help',
    action: () => console.log('Show quick help')
  }
];

/**
 * Initialize default keyboard shortcuts
 */
export function initializeDefaultShortcuts(): void {
  const manager = KeyboardShortcutManager.getInstance();
  defaultShortcuts.forEach(shortcut => {
    manager.register(shortcut);
  });
}