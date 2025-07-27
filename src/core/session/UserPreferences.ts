// User Preferences Manager - Enterprise configuration management
import type { UserPreferences } from '../../types/core';
import { sessionManager } from './SessionManager';

/**
 * UserPreferencesManager - Handles user configuration with validation
 * Similar to Spring Boot's @ConfigurationProperties pattern
 */
export class UserPreferencesManager {
  private static instance: UserPreferencesManager | null = null;
  private preferences: UserPreferences;
  private changeListeners: Set<(preferences: UserPreferences) => void> = new Set();

  private constructor() {
    this.preferences = sessionManager.loadPreferences();
    this.initializeCrossTabSync();
  }

  /**
   * Singleton pattern
   */
  public static getInstance(): UserPreferencesManager {
    if (!UserPreferencesManager.instance) {
      UserPreferencesManager.instance = new UserPreferencesManager();
    }
    return UserPreferencesManager.instance;
  }

  /**
   * Get current preferences
   */
  public getPreferences(): UserPreferences {
    return { ...this.preferences };
  }

  /**
   * Update specific preference
   */
  public updatePreference<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ): void {
    const previousValue = this.preferences[key];
    
    if (previousValue === value) {
      return; // No change
    }

    const newPreferences = {
      ...this.preferences,
      [key]: value
    };

    const validation = this.validatePreferences(newPreferences);
    if (!validation.isValid) {
      throw new Error(`Invalid preference value for ${key}: ${validation.errors.join(', ')}`);
    }

    this.preferences = newPreferences;
    this.savePreferences();
    this.notifyChangeListeners();
  }

  /**
   * Update multiple preferences atomically
   */
  public updatePreferences(updates: Partial<UserPreferences>): void {
    const newPreferences = { ...this.preferences, ...updates };
    
    const validation = this.validatePreferences(newPreferences);
    if (!validation.isValid) {
      throw new Error(`Invalid preferences: ${validation.errors.join(', ')}`);
    }

    this.preferences = newPreferences;
    this.savePreferences();
    this.notifyChangeListeners();
  }

  /**
   * Reset preferences to defaults
   */
  public resetToDefaults(): void {
    this.preferences = this.getDefaultPreferences();
    this.savePreferences();
    this.notifyChangeListeners();
  }

  /**
   * Add preference change listener
   */
  public addChangeListener(listener: (preferences: UserPreferences) => void): void {
    this.changeListeners.add(listener);
  }

  /**
   * Remove preference change listener
   */
  public removeChangeListener(listener: (preferences: UserPreferences) => void): void {
    this.changeListeners.delete(listener);
  }

  /**
   * Get specific preference with type safety
   */
  public getPreference<K extends keyof UserPreferences>(key: K): UserPreferences[K] {
    return this.preferences[key];
  }

  /**
   * Check if auto-save is enabled
   */
  public isAutoSaveEnabled(): boolean {
    return this.preferences.autoSave;
  }

  /**
   * Get auto-save interval in milliseconds
   */
  public getAutoSaveInterval(): number {
    return this.preferences.autoSaveInterval;
  }

  /**
   * Check if cross-tab sync is enabled
   */
  public isCrossTabSyncEnabled(): boolean {
    return this.preferences.enableCrossTabSync;
  }

  /**
   * Get current theme
   */
  public getTheme(): 'dark' | 'light' {
    return this.preferences.theme;
  }

  /**
   * Check if format remembering is enabled
   */
  public shouldRememberInputFormat(): boolean {
    return this.preferences.rememberInputFormat;
  }

  /**
   * Check if compression is enabled
   */
  public isCompressionEnabled(): boolean {
    return this.preferences.compressionEnabled;
  }

  /**
   * Validate preferences object
   */
  private validatePreferences(preferences: UserPreferences): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate autoSave
    if (typeof preferences.autoSave !== 'boolean') {
      errors.push('autoSave must be a boolean');
    }

    // Validate autoSaveInterval
    if (typeof preferences.autoSaveInterval !== 'number' || preferences.autoSaveInterval < 1000) {
      errors.push('autoSaveInterval must be a number >= 1000ms');
    }

    if (preferences.autoSaveInterval > 300000) { // 5 minutes max
      errors.push('autoSaveInterval must be <= 300000ms (5 minutes)');
    }

    // Validate theme
    if (!['dark', 'light'].includes(preferences.theme)) {
      errors.push('theme must be "dark" or "light"');
    }

    // Validate boolean preferences
    if (typeof preferences.rememberInputFormat !== 'boolean') {
      errors.push('rememberInputFormat must be a boolean');
    }

    if (typeof preferences.enableCrossTabSync !== 'boolean') {
      errors.push('enableCrossTabSync must be a boolean');
    }

    if (typeof preferences.compressionEnabled !== 'boolean') {
      errors.push('compressionEnabled must be a boolean');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Save preferences to storage
   */
  private savePreferences(): void {
    try {
      sessionManager.savePreferences(this.preferences);
    } catch (error) {
      console.error('Failed to save preferences:', error);
      throw error;
    }
  }

  /**
   * Notify all change listeners
   */
  private notifyChangeListeners(): void {
    this.changeListeners.forEach(listener => {
      try {
        listener(this.getPreferences());
      } catch (error) {
        console.error('Error in preference change listener:', error);
      }
    });
  }

  /**
   * Initialize cross-tab synchronization for preferences
   */
  private initializeCrossTabSync(): void {
    window.addEventListener('codekit-preferences-updated', (event: Event) => {
      const customEvent = event as CustomEvent;
      const { preferences, sessionId } = customEvent.detail;
      
      // Don't sync from our own updates
      if (sessionId === sessionManager.getSessionId()) {
        return;
      }

      // Update local preferences without triggering save
      this.preferences = { ...this.preferences, ...preferences };
      this.notifyChangeListeners();
    });
  }

  /**
   * Get default preferences
   */
  private getDefaultPreferences(): UserPreferences {
    return {
      autoSave: true,
      autoSaveInterval: 30000, // 30 seconds
      theme: 'dark',
      rememberInputFormat: true,
      enableCrossTabSync: true,
      compressionEnabled: true
    };
  }

  /**
   * Export preferences for backup/import
   */
  public exportPreferences(): string {
    return JSON.stringify(this.preferences, null, 2);
  }

  /**
   * Import preferences from backup
   */
  public importPreferences(preferencesJson: string): void {
    try {
      const importedPreferences = JSON.parse(preferencesJson) as UserPreferences;
      
      const validation = this.validatePreferences(importedPreferences);
      if (!validation.isValid) {
        throw new Error(`Invalid preferences JSON: ${validation.errors.join(', ')}`);
      }

      this.updatePreferences(importedPreferences);
    } catch (error) {
      throw new Error(`Failed to import preferences: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get preferences schema for validation
   */
  public getPreferencesSchema(): Record<keyof UserPreferences, string> {
    return {
      autoSave: 'boolean - Enable automatic session saving',
      autoSaveInterval: 'number - Auto-save interval in milliseconds (1000-300000)',
      theme: 'string - UI theme ("dark" | "light")',
      rememberInputFormat: 'boolean - Remember last input format',
      enableCrossTabSync: 'boolean - Enable real-time tab synchronization',
      compressionEnabled: 'boolean - Enable session data compression'
    };
  }
}

// Export singleton instance
export const userPreferencesManager = UserPreferencesManager.getInstance();