export interface AdminUser {
  uid: string;
  email: string;
  username?: string;
  emailVerified: boolean;
  displayName?: string;
  photoURL?: string;
  role?: string;
}

export interface ConnectedAccount {
  accountId: string;
  email: string;
  name: string;
  picture?: string;
  status: 'connected' | 'disconnected' | 'expired' | 'needs_reauth';
  scope: string;
  connectedAt: string;
  lastSyncAt: string;
  services: string[];
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

export interface YouTubeRecord {
  accountId: string;
  recordId: string;
  title: string;
  titleUrl?: string;
  channelTitle?: string;
  channelUrl?: string;
  watchedAt: string;
  importedAt: string;
  source: string;
  isDemo?: boolean;
}

export interface SearchRecord {
  accountId: string;
  recordId: string;
  query: string;
  searchUrl?: string;
  searchedAt: string;
  importedAt: string;
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

export interface SystemOverviewMetrics {
  connectedAccountsTotal: number;
  activeConnections: number;
  disconnectedAccounts: number;
  gmailInboxTotal: number;
  gmailUnreadTotal: number;
  gmailSentTotal: number;
  lastSyncAt: string;
  isDemo?: boolean;
}

export interface OAuthServerStatus {
  isConfigured: boolean;
  clientIdConfigured: boolean;
  clientSecretConfigured: boolean;
  redirectUri: string;
  scopes: string[];
  adminEmail: string;
}
