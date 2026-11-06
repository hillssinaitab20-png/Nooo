import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  ConnectedAccount,
  PrivateCredential,
  YouTubeRecord,
  SearchRecord,
  ActivityLog,
} from './types.ts';

const DATA_DIR = path.resolve(process.cwd(), '.acc-data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

interface StorageData {
  accounts: Record<string, ConnectedAccount>;
  credentials: Record<string, PrivateCredential>;
  youtubeRecords: Record<string, YouTubeRecord[]>;
  searchRecords: Record<string, SearchRecord[]>;
  activityLogs: ActivityLog[];
}

// In-memory cache + persistent disk sync
let store: StorageData = {
  accounts: {},
  credentials: {},
  youtubeRecords: {},
  searchRecords: {},
  activityLogs: [],
};

// Realistic Demo Fixtures
const DEMO_ACCOUNTS: ConnectedAccount[] = [
  {
    accountId: 'demo-google-account-personal',
    email: 'admin.personal@gmail.com',
    name: 'Command Admin (Personal)',
    picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&auto=format&fit=crop&q=80',
    status: 'connected',
    scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly',
    connectedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    lastSyncAt: new Date(Date.now() - 15 * 60000).toISOString(),
    services: ['gmail', 'youtube', 'search'],
    isDemo: true,
  },
  {
    accountId: 'demo-google-account-work',
    email: 'hillssinaitab20@gmail.com',
    name: 'Administrator (Primary Workspace)',
    picture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&auto=format&fit=crop&q=80',
    status: 'connected',
    scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly',
    connectedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    lastSyncAt: new Date(Date.now() - 5 * 60000).toISOString(),
    services: ['gmail', 'youtube', 'search'],
    isDemo: true,
  },
  {
    accountId: 'demo-google-account-dev',
    email: 'admin.lab.dev@gmail.com',
    name: 'Lab & Research Account',
    picture: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=128&auto=format&fit=crop&q=80',
    status: 'needs_reauth',
    scope: 'openid email profile',
    connectedAt: new Date(Date.now() - 45 * 86400000).toISOString(),
    lastSyncAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    services: ['youtube', 'search'],
    isDemo: true,
  },
];

const DEMO_YOUTUBE_RECORDS: YouTubeRecord[] = [
  {
    accountId: 'demo-google-account-work',
    recordId: 'demo-yt-1',
    title: 'Google I/O Keynote: Advancing AI Responsibly & Production Cloud Systems',
    titleUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    channelTitle: 'Google Developers',
    channelUrl: 'https://www.youtube.com/@GoogleDevelopers',
    watchedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    importedAt: new Date(Date.now() - 86400000).toISOString(),
    source: 'Takeout_YouTube_2026.zip',
    isDemo: true,
  },
  {
    accountId: 'demo-google-account-work',
    recordId: 'demo-yt-2',
    title: 'Building Zero-Trust Cloud Architectures on Google Cloud Platform',
    titleUrl: 'https://www.youtube.com/watch?v=2e6a_481a8ed',
    channelTitle: 'Google Cloud Tech',
    channelUrl: 'https://www.youtube.com/@GoogleCloudTech',
    watchedAt: new Date(Date.now() - 18 * 3600000).toISOString(),
    importedAt: new Date(Date.now() - 86400000).toISOString(),
    source: 'Takeout_YouTube_2026.zip',
    isDemo: true,
  },
  {
    accountId: 'demo-google-account-work',
    recordId: 'demo-yt-3',
    title: 'OAuth 2.0 Security Best Practices and Restricted Scopes Deep Dive',
    titleUrl: 'https://www.youtube.com/watch?v=3f5b7c8d9e0',
    channelTitle: 'Computerphile',
    channelUrl: 'https://www.youtube.com/@Computerphile',
    watchedAt: new Date(Date.now() - 48 * 3600000).toISOString(),
    importedAt: new Date(Date.now() - 86400000).toISOString(),
    source: 'Takeout_YouTube_2026.zip',
    isDemo: true,
  },
  {
    accountId: 'demo-google-account-personal',
    recordId: 'demo-yt-4',
    title: 'NASA James Webb Space Telescope: New Deep Space Discoveries',
    titleUrl: 'https://www.youtube.com/watch?v=5a1b2c3d4e5',
    channelTitle: 'NASA',
    channelUrl: 'https://www.youtube.com/@NASA',
    watchedAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    importedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    source: 'watch-history.json',
    isDemo: true,
  },
];

const DEMO_SEARCH_RECORDS: SearchRecord[] = [
  {
    accountId: 'demo-google-account-work',
    recordId: 'demo-search-1',
    query: 'RFC 7636 OAuth PKCE code verifier and code challenge requirements',
    searchUrl: 'https://www.google.com/search?q=RFC+7636+OAuth+PKCE',
    searchedAt: new Date(Date.now() - 4 * 3600000).toISOString(),
    importedAt: new Date(Date.now() - 86400000).toISOString(),
    source: 'Takeout_Search_2026.zip',
    isDemo: true,
  },
  {
    accountId: 'demo-google-account-work',
    recordId: 'demo-search-2',
    query: 'Gmail API restricted scope CASA Tier 2 verification requirements',
    searchUrl: 'https://www.google.com/search?q=Gmail+API+restricted+scope+CASA',
    searchedAt: new Date(Date.now() - 22 * 3600000).toISOString(),
    importedAt: new Date(Date.now() - 86400000).toISOString(),
    source: 'Takeout_Search_2026.zip',
    isDemo: true,
  },
  {
    accountId: 'demo-google-account-work',
    recordId: 'demo-search-3',
    query: 'Cloud Firestore AES-256 authenticated encryption with GCM',
    searchUrl: 'https://www.google.com/search?q=Cloud+Firestore+AES-256',
    searchedAt: new Date(Date.now() - 50 * 3600000).toISOString(),
    importedAt: new Date(Date.now() - 86400000).toISOString(),
    source: 'Takeout_Search_2026.zip',
    isDemo: true,
  },
  {
    accountId: 'demo-google-account-personal',
    recordId: 'demo-search-4',
    query: 'high altitude weather forecast northern ridge expedition',
    searchUrl: 'https://www.google.com/search?q=weather+forecast',
    searchedAt: new Date(Date.now() - 36 * 3600000).toISOString(),
    importedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    source: 'My Activity.json',
    isDemo: true,
  },
];

const DEMO_ACTIVITY_LOGS: ActivityLog[] = [
  {
    id: 'demo-log-1',
    type: 'login',
    accountEmail: 'hillssinaitab20@gmail.com',
    status: 'success',
    summary: 'Administrator logged in successfully via Firebase Google Authentication',
    timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
    ip: '127.0.0.1',
    isDemo: true,
  },
  {
    id: 'demo-log-2',
    type: 'sync_gmail',
    accountEmail: 'hillssinaitab20@gmail.com',
    status: 'success',
    summary: 'Synchronized Gmail stats and verified gmail.readonly token health',
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    ip: '127.0.0.1',
    isDemo: true,
  },
  {
    id: 'demo-log-3',
    type: 'import_takeout',
    accountEmail: 'hillssinaitab20@gmail.com',
    status: 'success',
    summary: 'Imported Takeout archive (Takeout_YouTube_2026.zip) - 3 new YouTube records',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    ip: '127.0.0.1',
    isDemo: true,
  },
  {
    id: 'demo-log-4',
    type: 'connect_account',
    accountEmail: 'admin.personal@gmail.com',
    status: 'success',
    summary: 'Authorized Google Account admin.personal@gmail.com via dedicated OAuth code flow',
    timestamp: new Date(Date.now() - 14 * 86400000).toISOString(),
    ip: '127.0.0.1',
    isDemo: true,
  },
];

function initStorage() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      store = {
        accounts: parsed.accounts || {},
        credentials: parsed.credentials || {},
        youtubeRecords: parsed.youtubeRecords || {},
        searchRecords: parsed.searchRecords || {},
        activityLogs: parsed.activityLogs || [],
      };
    } else {
      saveToDisk();
    }
  } catch (err) {
    console.warn('Storage init fallback to in-memory:', err);
  }
}

function saveToDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save store to disk:', err);
  }
}

// Initialize on module load
initStorage();

export const Storage = {
  // Accounts
  listAccounts(includeDemo: boolean = false): ConnectedAccount[] {
    const realAccounts = Object.values(store.accounts);
    if (!includeDemo) return realAccounts;
    // In demo mode, merge real and demo fixtures without duplicate IDs
    const realIds = new Set(realAccounts.map(a => a.accountId));
    const demoFiltered = DEMO_ACCOUNTS.filter(a => !realIds.has(a.accountId));
    return [...realAccounts, ...demoFiltered];
  },

  getAccount(accountId: string, includeDemo: boolean = false): ConnectedAccount | null {
    if (store.accounts[accountId]) {
      return store.accounts[accountId];
    }
    if (includeDemo) {
      return DEMO_ACCOUNTS.find(a => a.accountId === accountId) || null;
    }
    return null;
  },

  saveAccount(account: ConnectedAccount): void {
    store.accounts[account.accountId] = { ...account };
    saveToDisk();
  },

  deleteAccount(accountId: string): boolean {
    const existed = !!store.accounts[accountId];
    delete store.accounts[accountId];
    delete store.credentials[accountId];
    delete store.youtubeRecords[accountId];
    delete store.searchRecords[accountId];
    saveToDisk();
    return existed;
  },

  // Credentials (never returned in client responses)
  saveCredential(cred: PrivateCredential): void {
    store.credentials[cred.accountId] = { ...cred };
    saveToDisk();
  },

  getCredential(accountId: string): PrivateCredential | null {
    return store.credentials[accountId] || null;
  },

  deleteCredential(accountId: string): void {
    delete store.credentials[accountId];
    saveToDisk();
  },

  // YouTube Takeout
  addYouTubeRecords(accountId: string, records: YouTubeRecord[]): { added: number; duplicates: number } {
    if (!store.youtubeRecords[accountId]) {
      store.youtubeRecords[accountId] = [];
    }
    const existing = new Set(store.youtubeRecords[accountId].map(r => r.recordId));
    let added = 0;
    let duplicates = 0;

    for (const rec of records) {
      if (existing.has(rec.recordId)) {
        duplicates++;
      } else {
        store.youtubeRecords[accountId].unshift(rec);
        existing.add(rec.recordId);
        added++;
      }
    }
    saveToDisk();
    return { added, duplicates };
  },

  getYouTubeRecords(
    accountId: string,
    query?: string,
    dateFrom?: string,
    dateTo?: string,
    page: number = 1,
    limit: number = 20,
    includeDemo: boolean = false
  ): { records: YouTubeRecord[]; total: number; page: number; totalPages: number } {
    let list = store.youtubeRecords[accountId] ? [...store.youtubeRecords[accountId]] : [];
    
    if (includeDemo && list.length === 0) {
      list = DEMO_YOUTUBE_RECORDS.filter(r => r.accountId === accountId || accountId === 'all');
    }

    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter(r =>
        (r.title && r.title.toLowerCase().includes(q)) ||
        (r.channelTitle && r.channelTitle.toLowerCase().includes(q))
      );
    }

    if (dateFrom) {
      const fromTime = new Date(dateFrom).getTime();
      list = list.filter(r => new Date(r.watchedAt).getTime() >= fromTime);
    }

    if (dateTo) {
      const toTime = new Date(dateTo).getTime();
      list = list.filter(r => new Date(r.watchedAt).getTime() <= toTime);
    }

    // Sort descending by watched date
    list.sort((a, b) => new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime());

    const total = list.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const records = list.slice(offset, offset + limit);

    return { records, total, page, totalPages };
  },

  deleteYouTubeRecords(accountId: string, recordId?: string): number {
    if (!store.youtubeRecords[accountId]) return 0;
    if (recordId) {
      const initial = store.youtubeRecords[accountId].length;
      store.youtubeRecords[accountId] = store.youtubeRecords[accountId].filter(r => r.recordId !== recordId);
      saveToDisk();
      return initial - store.youtubeRecords[accountId].length;
    } else {
      const count = store.youtubeRecords[accountId].length;
      store.youtubeRecords[accountId] = [];
      saveToDisk();
      return count;
    }
  },

  // Search Takeout
  addSearchRecords(accountId: string, records: SearchRecord[]): { added: number; duplicates: number } {
    if (!store.searchRecords[accountId]) {
      store.searchRecords[accountId] = [];
    }
    const existing = new Set(store.searchRecords[accountId].map(r => r.recordId));
    let added = 0;
    let duplicates = 0;

    for (const rec of records) {
      if (existing.has(rec.recordId)) {
        duplicates++;
      } else {
        store.searchRecords[accountId].unshift(rec);
        existing.add(rec.recordId);
        added++;
      }
    }
    saveToDisk();
    return { added, duplicates };
  },

  getSearchRecords(
    accountId: string,
    query?: string,
    dateFrom?: string,
    dateTo?: string,
    page: number = 1,
    limit: number = 20,
    includeDemo: boolean = false
  ): { records: SearchRecord[]; total: number; page: number; totalPages: number } {
    let list = store.searchRecords[accountId] ? [...store.searchRecords[accountId]] : [];

    if (includeDemo && list.length === 0) {
      list = DEMO_SEARCH_RECORDS.filter(r => r.accountId === accountId || accountId === 'all');
    }

    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter(r => r.query && r.query.toLowerCase().includes(q));
    }

    if (dateFrom) {
      const fromTime = new Date(dateFrom).getTime();
      list = list.filter(r => new Date(r.searchedAt).getTime() >= fromTime);
    }

    if (dateTo) {
      const toTime = new Date(dateTo).getTime();
      list = list.filter(r => new Date(r.searchedAt).getTime() <= toTime);
    }

    // Sort descending by searched date
    list.sort((a, b) => new Date(b.searchedAt).getTime() - new Date(a.searchedAt).getTime());

    const total = list.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const records = list.slice(offset, offset + limit);

    return { records, total, page, totalPages };
  },

  deleteSearchRecords(accountId: string, recordId?: string): number {
    if (!store.searchRecords[accountId]) return 0;
    if (recordId) {
      const initial = store.searchRecords[accountId].length;
      store.searchRecords[accountId] = store.searchRecords[accountId].filter(r => r.recordId !== recordId);
      saveToDisk();
      return initial - store.searchRecords[accountId].length;
    } else {
      const count = store.searchRecords[accountId].length;
      store.searchRecords[accountId] = [];
      saveToDisk();
      return count;
    }
  },

  // Activity Logs
  logActivity(entry: Omit<ActivityLog, 'id' | 'timestamp'>): ActivityLog {
    const fullLog: ActivityLog = {
      ...entry,
      id: 'log-' + crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    store.activityLogs.unshift(fullLog);
    // Keep max 500 recent logs
    if (store.activityLogs.length > 500) {
      store.activityLogs = store.activityLogs.slice(0, 500);
    }
    saveToDisk();
    return fullLog;
  },

  getActivityLogs(limit: number = 50, includeDemo: boolean = false): ActivityLog[] {
    const realLogs = store.activityLogs.slice(0, limit);
    if (!includeDemo) return realLogs;
    const all = [...realLogs, ...DEMO_ACTIVITY_LOGS];
    all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return all.slice(0, limit);
  },

  deleteAllAccountData(accountId: string): void {
    delete store.youtubeRecords[accountId];
    delete store.searchRecords[accountId];
    saveToDisk();
  },
};
