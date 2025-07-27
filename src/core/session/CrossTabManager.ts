// Cross-Tab Manager - Real-time synchronization between browser tabs
import type { SessionData, UserPreferences, CrossTabMessage, CrossTabMessageType } from '../../types/core';
import { sessionManager } from './SessionManager';
import { userPreferencesManager } from './UserPreferences';

/**
 * CrossTabManager - Handles real-time synchronization between browser tabs
 * Similar to Spring Events with @EventListener pattern
 */
export class CrossTabManager {
  private static instance: CrossTabManager | null = null;
  private tabId: string;
  private isLeader = false;
  private heartbeatInterval: number | null = null;
  private listeners: Map<CrossTabMessageType, Set<(data: any) => void>> = new Map();
  
  private static readonly HEARTBEAT_INTERVAL = 5000; // 5 seconds
  private static readonly LEADER_TIMEOUT = 10000; // 10 seconds
  private static readonly STORAGE_EVENT_KEY = 'codekit-cross-tab';

  private constructor() {
    this.tabId = this.generateTabId();
    this.initializeEventListeners();
    this.startLeaderElection();
    this.startHeartbeat();
  }

  /**
   * Singleton pattern
   */
  public static getInstance(): CrossTabManager {
    if (!CrossTabManager.instance) {
      CrossTabManager.instance = new CrossTabManager();
    }
    return CrossTabManager.instance;
  }

  /**
   * Check if this tab is the leader
   */
  public isLeaderTab(): boolean {
    return this.isLeader;
  }

  /**
   * Get current tab ID
   */
  public getTabId(): string {
    return this.tabId;
  }

  /**
   * Broadcast session update to other tabs
   */
  public broadcastSessionUpdate(session: SessionData): void {
    if (!userPreferencesManager.isCrossTabSyncEnabled()) {
      return;
    }

    this.sendMessage({
      type: 'session-update',
      sessionId: sessionManager.getSessionId(),
      timestamp: Date.now(),
      data: session,
      senderId: this.tabId
    });
  }

  /**
   * Broadcast preferences update to other tabs
   */
  public broadcastPreferencesUpdate(preferences: UserPreferences): void {
    if (!userPreferencesManager.isCrossTabSyncEnabled()) {
      return;
    }

    this.sendMessage({
      type: 'preferences-update',
      sessionId: sessionManager.getSessionId(),
      timestamp: Date.now(),
      data: preferences,
      senderId: this.tabId
    });
  }

  /**
   * Request session data from other tabs
   */
  public requestSessionSync(): void {
    if (!userPreferencesManager.isCrossTabSyncEnabled()) {
      return;
    }

    this.sendMessage({
      type: 'session-request',
      sessionId: sessionManager.getSessionId(),
      timestamp: Date.now(),
      senderId: this.tabId
    });
  }

  /**
   * Add listener for cross-tab messages
   */
  public addListener(
    type: CrossTabMessageType,
    listener: (data: any) => void
  ): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  /**
   * Remove listener for cross-tab messages
   */
  public removeListener(
    type: CrossTabMessageType,
    listener: (data: any) => void
  ): void {
    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      typeListeners.delete(listener);
    }
  }

  /**
   * Get active tab count (approximate)
   */
  public getActiveTabCount(): number {
    try {
      const heartbeats = this.getStoredHeartbeats();
      const now = Date.now();
      const activeTabs = Object.values(heartbeats).filter(
        timestamp => (now - timestamp) < CrossTabManager.LEADER_TIMEOUT
      );
      return activeTabs.length;
    } catch (error) {
      return 1; // Assume at least this tab is active
    }
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    window.removeEventListener('storage', this.handleStorageEvent.bind(this));
    window.removeEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    
    this.removeHeartbeat();
  }

  /**
   * Send message to other tabs via localStorage
   */
  private sendMessage(message: CrossTabMessage): void {
    try {
      const messageWithId = { ...message, id: this.generateMessageId() };
      localStorage.setItem(
        CrossTabManager.STORAGE_EVENT_KEY,
        JSON.stringify(messageWithId)
      );
      
      // Remove immediately to trigger storage event
      localStorage.removeItem(CrossTabManager.STORAGE_EVENT_KEY);
    } catch (error) {
      console.error('Failed to send cross-tab message:', error);
    }
  }

  /**
   * Initialize event listeners
   */
  private initializeEventListeners(): void {
    // Listen for localStorage changes from other tabs
    window.addEventListener('storage', this.handleStorageEvent.bind(this));
    
    // Cleanup on tab close
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    
    // Handle visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }

  /**
   * Handle storage events from other tabs
   */
  private handleStorageEvent(event: StorageEvent): void {
    if (event.key !== CrossTabManager.STORAGE_EVENT_KEY || !event.newValue) {
      return;
    }

    try {
      const message = JSON.parse(event.newValue) as CrossTabMessage & { id: string };
      
      // Don't process our own messages
      if (message.senderId === this.tabId) {
        return;
      }

      this.processIncomingMessage(message);
    } catch (error) {
      console.error('Failed to process cross-tab message:', error);
    }
  }

  /**
   * Process incoming message from other tabs
   */
  private processIncomingMessage(message: CrossTabMessage): void {
    // Notify listeners
    const typeListeners = this.listeners.get(message.type);
    if (typeListeners) {
      typeListeners.forEach(listener => {
        try {
          listener(message.data);
        } catch (error) {
          console.error('Error in cross-tab message listener:', error);
        }
      });
    }

    // Handle built-in message types
    switch (message.type) {
      case 'session-request':
        if (this.isLeader) {
          this.respondToSessionRequest();
        }
        break;
        
      case 'session-response':
        // Handle session data from leader tab
        break;
    }
  }

  /**
   * Respond to session request from other tab
   */
  private respondToSessionRequest(): void {
    const currentSession = sessionManager.load();
    if (currentSession) {
      this.sendMessage({
        type: 'session-response',
        sessionId: sessionManager.getSessionId(),
        timestamp: Date.now(),
        data: currentSession,
        senderId: this.tabId
      });
    }
  }

  /**
   * Start leader election process
   */
  private startLeaderElection(): void {
    const heartbeats = this.getStoredHeartbeats();
    const now = Date.now();
    
    // Check if there's an active leader
    const activeLeader = Object.entries(heartbeats).find(([tabId, timestamp]) => {
      return tabId !== this.tabId && (now - timestamp) < CrossTabManager.LEADER_TIMEOUT;
    });

    if (!activeLeader) {
      this.becomeLeader();
    }
  }

  /**
   * Become the leader tab
   */
  private becomeLeader(): void {
    this.isLeader = true;
    console.log(`Tab ${this.tabId} became leader`);
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.updateHeartbeat();
    
    this.heartbeatInterval = window.setInterval(() => {
      this.updateHeartbeat();
      this.checkLeaderStatus();
    }, CrossTabManager.HEARTBEAT_INTERVAL);
  }

  /**
   * Update heartbeat timestamp
   */
  private updateHeartbeat(): void {
    try {
      const heartbeats = this.getStoredHeartbeats();
      heartbeats[this.tabId] = Date.now();
      localStorage.setItem('codekit-heartbeats', JSON.stringify(heartbeats));
    } catch (error) {
      console.error('Failed to update heartbeat:', error);
    }
  }

  /**
   * Remove heartbeat on tab close
   */
  private removeHeartbeat(): void {
    try {
      const heartbeats = this.getStoredHeartbeats();
      delete heartbeats[this.tabId];
      localStorage.setItem('codekit-heartbeats', JSON.stringify(heartbeats));
    } catch (error) {
      console.error('Failed to remove heartbeat:', error);
    }
  }

  /**
   * Check and update leader status
   */
  private checkLeaderStatus(): void {
    const heartbeats = this.getStoredHeartbeats();
    const now = Date.now();
    
    // Clean up stale heartbeats
    const activeHeartbeats: Record<string, number> = {};
    Object.entries(heartbeats).forEach(([tabId, timestamp]) => {
      if ((now - timestamp) < CrossTabManager.LEADER_TIMEOUT) {
        activeHeartbeats[tabId] = timestamp;
      }
    });
    
    // Update stored heartbeats
    localStorage.setItem('codekit-heartbeats', JSON.stringify(activeHeartbeats));
    
    // Check if we should be leader (oldest active tab)
    const sortedTabs = Object.entries(activeHeartbeats)
      .sort(([, a], [, b]) => a - b);
    
    const shouldBeLeader = sortedTabs.length > 0 && sortedTabs[0][0] === this.tabId;
    
    if (shouldBeLeader && !this.isLeader) {
      this.becomeLeader();
    } else if (!shouldBeLeader && this.isLeader) {
      this.isLeader = false;
      console.log(`Tab ${this.tabId} stepped down as leader`);
    }
  }

  /**
   * Get stored heartbeats from localStorage
   */
  private getStoredHeartbeats(): Record<string, number> {
    try {
      const stored = localStorage.getItem('codekit-heartbeats');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      return {};
    }
  }

  /**
   * Handle tab visibility changes
   */
  private handleVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      // Tab became visible, check leader status
      setTimeout(() => this.checkLeaderStatus(), 100);
    }
  }

  /**
   * Handle tab close
   */
  private handleBeforeUnload(): void {
    this.removeHeartbeat();
  }

  /**
   * Generate unique tab identifier
   */
  private generateTabId(): string {
    return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique message identifier
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const crossTabManager = CrossTabManager.getInstance();