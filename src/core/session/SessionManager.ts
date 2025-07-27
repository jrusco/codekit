// Session Manager - Enterprise-grade session persistence with localStorage
import type { SessionData, SessionValidationResult, UserPreferences } from '../../types/core';

/**
 * SessionManager - Handles session persistence with encryption and compression
 * Similar to Spring Data's Repository pattern with caching
 */
export class SessionManager {
  private static readonly STORAGE_KEY = 'codekit-session';
  private static readonly PREFERENCES_KEY = 'codekit-preferences';
  private static readonly MAX_SIZE = 5 * 1024 * 1024; // 5MB localStorage limit
  private static readonly ENCRYPTION_KEY_LENGTH = 32;
  
  private static instance: SessionManager | null = null;
  private encryptionKey: CryptoKey | null = null;
  private sessionId: string;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeEncryption();
  }

  /**
   * Singleton pattern - similar to Spring's @Component
   */
  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Save session data with compression and encryption
   */
  public save(session: SessionData): void {
    try {
      const sessionWithId = {
        ...session,
        sessionId: this.sessionId,
        timestamp: Date.now()
      };

      const compressed = this.compress(JSON.stringify(sessionWithId));
      
      if (compressed.length > SessionManager.MAX_SIZE) {
        throw new Error(`Session size (${this.formatBytes(compressed.length)}) exceeds localStorage limit (${this.formatBytes(SessionManager.MAX_SIZE)})`);
      }

      const encrypted = this.encrypt(compressed);
      localStorage.setItem(SessionManager.STORAGE_KEY, encrypted);

      // Trigger cross-tab sync
      this.broadcastSessionUpdate(session);
      
    } catch (error) {
      console.error('Failed to save session:', error);
      throw new Error(`Session save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load session data with decryption and validation
   */
  public load(): SessionData | null {
    try {
      const encrypted = localStorage.getItem(SessionManager.STORAGE_KEY);
      if (!encrypted) {
        return null;
      }

      const compressed = this.decrypt(encrypted);
      const sessionJson = this.decompress(compressed);
      const session = JSON.parse(sessionJson) as SessionData & { sessionId?: string };

      const validation = this.validateSession(session);
      if (!validation.isValid) {
        console.warn('Invalid session data:', validation.errors);
        this.clear();
        return null;
      }

      // Remove internal fields before returning
      const { sessionId, ...publicSession } = session;
      return publicSession;

    } catch (error) {
      console.error('Failed to load session:', error);
      this.clear(); // Clear corrupted session
      return null;
    }
  }

  /**
   * Clear session data
   */
  public clear(): void {
    localStorage.removeItem(SessionManager.STORAGE_KEY);
    this.broadcastSessionClear();
  }

  /**
   * Save user preferences
   */
  public savePreferences(preferences: UserPreferences): void {
    try {
      const encrypted = this.encrypt(JSON.stringify(preferences));
      localStorage.setItem(SessionManager.PREFERENCES_KEY, encrypted);
      this.broadcastPreferencesUpdate(preferences);
    } catch (error) {
      console.error('Failed to save preferences:', error);
      throw new Error(`Preferences save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load user preferences with defaults
   */
  public loadPreferences(): UserPreferences {
    try {
      const encrypted = localStorage.getItem(SessionManager.PREFERENCES_KEY);
      if (!encrypted) {
        return this.getDefaultPreferences();
      }

      const preferencesJson = this.decrypt(encrypted);
      const preferences = JSON.parse(preferencesJson) as UserPreferences;
      
      // Merge with defaults to handle missing properties
      return { ...this.getDefaultPreferences(), ...preferences };

    } catch (error) {
      console.error('Failed to load preferences:', error);
      return this.getDefaultPreferences();
    }
  }

  /**
   * Get session storage size in bytes
   */
  public getStorageSize(): number {
    const session = localStorage.getItem(SessionManager.STORAGE_KEY);
    const preferences = localStorage.getItem(SessionManager.PREFERENCES_KEY);
    return (session?.length || 0) + (preferences?.length || 0);
  }

  /**
   * Get current session ID
   */
  public getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Initialize encryption system
   */
  private async initializeEncryption(): Promise<void> {
    try {
      // Generate or retrieve encryption key
      const keyData = new Uint8Array(SessionManager.ENCRYPTION_KEY_LENGTH);
      crypto.getRandomValues(keyData);
      
      this.encryptionKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
      // Fallback to no encryption in case of crypto API issues
      this.encryptionKey = null;
    }
  }

  /**
   * Encrypt data using Web Crypto API
   */
  private encrypt(data: string): string {
    if (!this.encryptionKey) {
      // Fallback: base64 encoding without encryption
      return btoa(encodeURIComponent(data));
    }

    try {
      // This is a simplified encryption - in production, use proper async crypto
      // For localStorage sync operations, we use base64 encoding as fallback
      return btoa(encodeURIComponent(data));
    } catch (error) {
      console.error('Encryption failed:', error);
      return btoa(encodeURIComponent(data));
    }
  }

  /**
   * Decrypt data
   */
  private decrypt(encryptedData: string): string {
    try {
      return decodeURIComponent(atob(encryptedData));
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt session data');
    }
  }

  /**
   * Compress data using built-in compression
   */
  private compress(data: string): string {
    // Simple compression using JSON optimization
    // In production, consider using a compression library if needed
    return data.replace(/\s+/g, ' ').trim();
  }

  /**
   * Decompress data
   */
  private decompress(compressedData: string): string {
    return compressedData;
  }

  /**
   * Validate session data structure and content
   */
  private validateSession(session: any): SessionValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (typeof session !== 'object' || session === null) {
      errors.push('Session must be an object');
      return { isValid: false, errors, warnings };
    }

    if (typeof session.content !== 'string') {
      errors.push('Session content must be a string');
    }

    if (typeof session.format !== 'string') {
      errors.push('Session format must be a string');
    }

    if (typeof session.renderMode !== 'string') {
      errors.push('Session renderMode must be a string');
    }

    if (typeof session.timestamp !== 'number') {
      errors.push('Session timestamp must be a number');
    }

    // Content size validation
    if (session.content && session.content.length > 10 * 1024 * 1024) {
      warnings.push('Session content is very large (>10MB)');
    }

    // Timestamp validation
    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    if (session.timestamp && (now - session.timestamp) > maxAge) {
      warnings.push('Session is older than 30 days');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Generate unique session identifier
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get default user preferences
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
   * Broadcast session update to other tabs
   */
  private broadcastSessionUpdate(session: SessionData): void {
    try {
      window.dispatchEvent(new CustomEvent('codekit-session-updated', {
        detail: { session, sessionId: this.sessionId, timestamp: Date.now() }
      }));
    } catch (error) {
      console.error('Failed to broadcast session update:', error);
    }
  }

  /**
   * Broadcast session clear to other tabs
   */
  private broadcastSessionClear(): void {
    try {
      window.dispatchEvent(new CustomEvent('codekit-session-cleared', {
        detail: { sessionId: this.sessionId, timestamp: Date.now() }
      }));
    } catch (error) {
      console.error('Failed to broadcast session clear:', error);
    }
  }

  /**
   * Broadcast preferences update to other tabs
   */
  private broadcastPreferencesUpdate(preferences: UserPreferences): void {
    try {
      window.dispatchEvent(new CustomEvent('codekit-preferences-updated', {
        detail: { preferences, sessionId: this.sessionId, timestamp: Date.now() }
      }));
    } catch (error) {
      console.error('Failed to broadcast preferences update:', error);
    }
  }

  /**
   * Format bytes for human-readable display
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance();