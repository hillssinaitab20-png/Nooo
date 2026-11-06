/**
 * Types for Account Command Center Server
 */

export interface AdminProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'admin';
  lastLoginAt: string;
  isVerified: boolean;
}

export interface ConnectedAccount {
  accountId: string;          // Stable Google Subject ID or unique identifier
  email: string;              // Google account email address
  name: string;               // Display name
  picture?: string;           // Google profile photo
  status: 'connected' | 'disconnected' | 'expired' | 'needs_reauth';
  scope: string;              // Authorized Google scopes
  connectedAt: string;        // ISO timestamp
  lastSyncAt: string;         // ISO timestamp
  services: string[];         // e.g. ['gmail', 'youtube', 'search']
  isDemo?: boolean;           // Clearly marked for demo fixtures
}

export interface PrivateCredential {
  accountId: string;
  encryptedRefreshToken: string; // AES-256-GCM encrypted
  iv: string;                    // Initialization vector
  authTag: string;               // Authentication tag
  accessToken?: string;
  tokenExpiry?: number;
  updatedAt: string;
}

export interface YouTubeRecord {
  accountId: string;
  recordId: string;           // Deterministic fingerprint hash
  title: string;
  titleUrl?: string;
  channelTitle?: string;
  channelUrl?: string;
  watchedAt: string;          // ISO timestamp
  importedAt: string;         // ISO timestamp
  source: string;             // Filename / archive
  isDemo?: boolean;
}

export interface SearchRecord {
  accountId: string;
  recordId: string;           // Deterministic fingerprint hash
  query: string;
  searchUrl?: string;
  searchedAt: string;         // ISO timestamp
  importedAt: string;         // ISO timestamp
  source: string;
  isDemo?: boolean;
}

export interface ActivityLog {
  id: string;
  type: 'login' | 'logout' | 'connect_account' | 'disconnect_account' | 'sync_gmail' | 'import_takeout' | 'delete_data' | 'settings_change' | 'security_alert';
  accountEmail?: string;
  status: 'success' | 'warning' | 'error' | 'info';
  summary: string;
  details?: Record<string, unknown>;
  timestamp: string;
  ip?: string;
  isDemo?: boolean;
}

export interface GmailStats {
  inboxTotal: number;
  unreadTotal: number;
  sentTotal: number;
  lastChecked: string;
  status: 'connected' | 'auth_required' | 'api_disabled' | 'error';
  errorMessage?: string;
  isDemo?: boolean;
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  labels: string[];
  isUnread: boolean;
  hasAttachments: boolean;
  folder: 'inbox' | 'sent' | 'other';
  isDemo?: boolean;
}

export interface GmailMessageDetail extends GmailMessageSummary {
  bodyHtml?: string;
  bodyText?: string;
}
