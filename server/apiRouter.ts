import express, { Request, Response } from 'express';
import {
  requireAdminAuth,
  ADMIN_EMAIL,
  ADMIN_USERNAME,
  authenticateAdminCredentials,
  updateAdminPassword,
  getAdminCredentialsInfo,
} from './authMiddleware.ts';
import { signAdminToken, verifyPassword } from './crypto.ts';
import {
  getOAuthStatus,
  getAuthorizationUrl,
  handleOAuthCallback,
  disconnectGoogleAccount,
} from './googleOAuth.ts';
import { Storage } from './storage.ts';
import { getGmailStats, listGmailMessages, getGmailMessageDetail } from './gmailApi.ts';
import { parseTakeoutBuffer } from './takeoutParser.ts';

const router = express.Router();

/**
 * Administrator Username & Password Authentication
 */
router.post('/admin/login', (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      error: 'MISSING_CREDENTIALS',
      message: 'Username and password are required.',
    });
  }

  const authResult = authenticateAdminCredentials(username, password);

  if (!authResult.success) {
    Storage.logActivity({
      type: 'login',
      status: 'warning',
      accountEmail: username,
      summary: `Failed administrator login attempt for identifier: ${username}`,
    });

    return res.status(401).json({
      error: 'INVALID_CREDENTIALS',
      message: 'Invalid administrator username or password.',
    });
  }

  const token = signAdminToken(authResult.admin);

  // Set secure cookie
  res.cookie('acc_admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });

  Storage.logActivity({
    type: 'login',
    status: 'success',
    accountEmail: authResult.admin.email,
    summary: `Administrator (${authResult.admin.username}) logged in successfully with username and password`,
  });

  res.json({
    success: true,
    token,
    admin: authResult.admin,
  });
});

/**
 * Administrator Logout
 */
router.post('/admin/logout', (req: Request, res: Response) => {
  res.clearCookie('acc_admin_token');
  res.json({ success: true, message: 'Logged out successfully' });
});

/**
 * Change Administrator Password
 */
router.post('/admin/change-password', requireAdminAuth, (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      error: 'INVALID_PAYLOAD',
      message: 'currentPassword and newPassword are required.',
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      error: 'WEAK_PASSWORD',
      message: 'New password must be at least 8 characters long.',
    });
  }

  const verifyCurrent = authenticateAdminCredentials(ADMIN_USERNAME, currentPassword);
  if (!verifyCurrent.success) {
    return res.status(401).json({
      error: 'CURRENT_PASSWORD_INCORRECT',
      message: 'Current password does not match.',
    });
  }

  updateAdminPassword(newPassword);

  Storage.logActivity({
    type: 'settings_change',
    status: 'info',
    accountEmail: ADMIN_EMAIL,
    summary: 'Administrator password was updated successfully',
  });

  res.json({ success: true, message: 'Administrator password updated successfully.' });
});

/**
 * Public/Initial configuration and OAuth status
 */
router.get('/auth/status', (req: Request, res: Response) => {
  const protocol = req.protocol;
  const host = req.get('host');
  const reqBaseUrl = `${protocol}://${host}`;
  const status = getOAuthStatus(reqBaseUrl);
  const creds = getAdminCredentialsInfo();
  res.json({
    ...status,
    adminEmail: ADMIN_EMAIL,
    adminUsername: creds.username,
  });
});

/**
 * Start OAuth Authorization code flow (Requires Admin)
 */
router.get('/auth/google/start', requireAdminAuth, (req: Request, res: Response) => {
  const protocol = req.protocol;
  const host = req.get('host');
  const reqBaseUrl = `${protocol}://${host}`;
  const redirectPath = (req.query.redirect as string) || '/accounts';

  try {
    const { url, state } = getAuthorizationUrl(reqBaseUrl, redirectPath);
    res.json({ url, state });
  } catch (err: any) {
    res.status(500).json({ error: 'OAUTH_START_FAILED', message: err.message });
  }
});

/**
 * Google OAuth 2.0 callback endpoint
 */
router.get('/auth/google/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const state = req.query.state as string;
  const error = req.query.error as string;

  if (error) {
    return res.redirect(`/accounts?oauth_error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return res.redirect('/accounts?oauth_error=missing_code_or_state');
  }

  const protocol = req.protocol;
  const host = req.get('host');
  const reqBaseUrl = `${protocol}://${host}`;

  try {
    const { account } = await handleOAuthCallback(code, state, reqBaseUrl);
    return res.redirect(`/accounts?connected=success&email=${encodeURIComponent(account.email)}`);
  } catch (err: any) {
    console.error('OAuth callback failure:', err);
    return res.redirect(`/accounts?oauth_error=${encodeURIComponent(err.message || 'OAuth verification failed')}`);
  }
});

/**
 * Administrator Profile Check
 */
router.get('/admin/me', requireAdminAuth, (req: Request, res: Response) => {
  res.json({
    admin: req.adminUser,
    configuredAdminEmail: ADMIN_EMAIL,
    isAuthorized: true,
  });
});

/**
 * List Connected Accounts
 */
router.get('/accounts', requireAdminAuth, (req: Request, res: Response) => {
  const includeDemo = req.query.demo === 'true';
  const accounts = Storage.listAccounts(includeDemo);
  res.json({ accounts });
});

/**
 * Get Account Details
 */
router.get('/accounts/:accountId', requireAdminAuth, (req: Request, res: Response) => {
  const accountId = req.params.accountId;
  const includeDemo = req.query.demo === 'true';
  const account = Storage.getAccount(accountId, includeDemo);

  if (!account) {
    return res.status(404).json({ error: 'ACCOUNT_NOT_FOUND', message: 'Account not found' });
  }

  res.json({ account });
});

/**
 * Refresh/Sync Account Status
 */
router.post('/accounts/:accountId/sync', requireAdminAuth, async (req: Request, res: Response) => {
  const accountId = req.params.accountId;
  const isDemo = req.query.demo === 'true';
  const account = Storage.getAccount(accountId, isDemo);

  if (!account) {
    return res.status(404).json({ error: 'ACCOUNT_NOT_FOUND' });
  }

  const stats = await getGmailStats(accountId, isDemo);
  account.lastSyncAt = new Date().toISOString();
  if (stats.status === 'connected') {
    account.status = 'connected';
  } else if (stats.status === 'auth_required') {
    account.status = 'expired';
  }
  Storage.saveAccount(account);

  Storage.logActivity({
    type: 'sync_gmail',
    accountEmail: account.email,
    status: stats.status === 'connected' ? 'success' : 'warning',
    summary: `Refreshed connection status for ${account.email} (${stats.status})`,
  });

  res.json({ account, stats });
});

/**
 * Disconnect Google Account & Revoke Token
 */
router.post('/accounts/:accountId/disconnect', requireAdminAuth, async (req: Request, res: Response) => {
  const accountId = req.params.accountId;
  try {
    const success = await disconnectGoogleAccount(accountId);
    if (!success) {
      return res.status(404).json({ error: 'ACCOUNT_NOT_FOUND' });
    }
    res.json({ success: true, message: 'Account successfully disconnected and token revoked' });
  } catch (err: any) {
    res.status(500).json({ error: 'DISCONNECT_FAILED', message: err.message });
  }
});

/**
 * Delete Account Completely
 */
router.delete('/accounts/:accountId', requireAdminAuth, async (req: Request, res: Response) => {
  const accountId = req.params.accountId;
  const account = Storage.getAccount(accountId, true);
  if (!account) {
    return res.status(404).json({ error: 'ACCOUNT_NOT_FOUND' });
  }

  await disconnectGoogleAccount(accountId);
  Storage.deleteAccount(accountId);

  Storage.logActivity({
    type: 'delete_data',
    accountEmail: account.email,
    status: 'info',
    summary: `Deleted account record and all associated data for ${account.email}`,
  });

  res.json({ success: true });
});

/**
 * Delete only Takeout history for an account
 */
router.delete('/accounts/:accountId/data', requireAdminAuth, (req: Request, res: Response) => {
  const accountId = req.params.accountId;
  const account = Storage.getAccount(accountId, true);
  if (!account) {
    return res.status(404).json({ error: 'ACCOUNT_NOT_FOUND' });
  }

  Storage.deleteAllAccountData(accountId);

  Storage.logActivity({
    type: 'delete_data',
    accountEmail: account.email,
    status: 'info',
    summary: `Cleared all imported YouTube and Google Search records for ${account.email}`,
  });

  res.json({ success: true, message: 'All imported records deleted successfully' });
});

/**
 * Gmail Statistics
 */
router.get('/gmail/:accountId/stats', requireAdminAuth, async (req: Request, res: Response) => {
  const accountId = req.params.accountId;
  const isDemo = req.query.demo === 'true';
  const stats = await getGmailStats(accountId, isDemo);
  res.json({ stats });
});

/**
 * List Gmail Messages
 */
router.get('/gmail/:accountId/messages', requireAdminAuth, async (req: Request, res: Response) => {
  const accountId = req.params.accountId;
  const isDemo = req.query.demo === 'true';
  const folder = (req.query.folder as 'inbox' | 'sent' | 'all') || 'inbox';
  const q = req.query.q as string;
  const maxResults = req.query.maxResults ? parseInt(req.query.maxResults as string, 10) : 20;
  const pageToken = req.query.pageToken as string;

  try {
    const result = await listGmailMessages(accountId, { folder, q, maxResults, pageToken }, isDemo);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'GMAIL_FETCH_FAILED', message: err.message });
  }
});

/**
 * Get Gmail Message Detail on demand
 */
router.get('/gmail/:accountId/messages/:messageId', requireAdminAuth, async (req: Request, res: Response) => {
  const accountId = req.params.accountId;
  const messageId = req.params.messageId;
  const isDemo = req.query.demo === 'true';

  try {
    const detail = await getGmailMessageDetail(accountId, messageId, isDemo);
    res.json({ message: detail });
  } catch (err: any) {
    res.status(500).json({ error: 'MESSAGE_FETCH_FAILED', message: err.message });
  }
});

/**
 * Takeout Import Engine: Upload & Process Export
 */
router.post('/takeout/upload', requireAdminAuth, async (req: Request, res: Response) => {
  const { fileName, fileData, accountId } = req.body;

  if (!fileName || !fileData || !accountId) {
    return res.status(400).json({
      error: 'INVALID_PAYLOAD',
      message: 'fileName, fileData (base64 string), and accountId are required.',
    });
  }

  // Account verification
  const account = Storage.getAccount(accountId, true);
  if (!account) {
    return res.status(404).json({ error: 'ACCOUNT_NOT_FOUND', message: 'Target account not found.' });
  }

  try {
    const buffer = Buffer.from(fileData, 'base64');
    
    // Check raw upload size (max 50MB)
    if (buffer.length > 50 * 1024 * 1024) {
      return res.status(413).json({
        error: 'PAYLOAD_TOO_LARGE',
        message: 'File exceeds maximum upload size of 50MB.',
      });
    }

    const parseResult = await parseTakeoutBuffer(buffer, fileName, accountId);

    let ytAdded = 0;
    let ytDupes = 0;
    let searchAdded = 0;
    let searchDupes = 0;

    if (parseResult.youtubeRecords.length > 0) {
      const ytRes = Storage.addYouTubeRecords(accountId, parseResult.youtubeRecords);
      ytAdded = ytRes.added;
      ytDupes = ytRes.duplicates;
    }

    if (parseResult.searchRecords.length > 0) {
      const searchRes = Storage.addSearchRecords(accountId, parseResult.searchRecords);
      searchAdded = searchRes.added;
      searchDupes = searchRes.duplicates;
    }

    Storage.logActivity({
      type: 'import_takeout',
      accountEmail: account.email,
      status: 'success',
      summary: `Imported Takeout file (${fileName}): ${ytAdded} YouTube, ${searchAdded} Search records (${ytDupes + searchDupes} duplicates skipped)`,
    });

    res.json({
      success: true,
      fileName,
      sourceType: parseResult.sourceType,
      youtube: { added: ytAdded, duplicates: ytDupes, totalExtracted: parseResult.youtubeRecords.length },
      search: { added: searchAdded, duplicates: searchDupes, totalExtracted: parseResult.searchRecords.length },
      warnings: parseResult.warnings,
    });
  } catch (err: any) {
    Storage.logActivity({
      type: 'import_takeout',
      accountEmail: account.email,
      status: 'error',
      summary: `Failed to import Takeout archive ${fileName}: ${err.message}`,
    });

    res.status(400).json({
      error: 'TAKEOUT_PROCESSING_FAILED',
      message: err.message,
    });
  }
});

/**
 * YouTube Takeout History Query
 */
router.get('/takeout/:accountId/youtube', requireAdminAuth, (req: Request, res: Response) => {
  const accountId = req.params.accountId;
  const query = req.query.q as string;
  const dateFrom = req.query.from as string;
  const dateTo = req.query.to as string;
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  const isDemo = req.query.demo === 'true';

  const result = Storage.getYouTubeRecords(accountId, query, dateFrom, dateTo, page, limit, isDemo);
  res.json(result);
});

/**
 * Delete YouTube Takeout History
 */
router.delete('/takeout/:accountId/youtube', requireAdminAuth, (req: Request, res: Response) => {
  const accountId = req.params.accountId;
  const recordId = req.query.recordId as string;
  const deleted = Storage.deleteYouTubeRecords(accountId, recordId);

  Storage.logActivity({
    type: 'delete_data',
    status: 'info',
    summary: recordId
      ? `Deleted individual YouTube watch record (${recordId})`
      : `Deleted all (${deleted}) YouTube watch records for account ${accountId}`,
  });

  res.json({ success: true, deletedCount: deleted });
});

/**
 * Google Search Takeout History Query
 */
router.get('/takeout/:accountId/search', requireAdminAuth, (req: Request, res: Response) => {
  const accountId = req.params.accountId;
  const query = req.query.q as string;
  const dateFrom = req.query.from as string;
  const dateTo = req.query.to as string;
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  const isDemo = req.query.demo === 'true';

  const result = Storage.getSearchRecords(accountId, query, dateFrom, dateTo, page, limit, isDemo);
  res.json(result);
});

/**
 * Delete Search Takeout History
 */
router.delete('/takeout/:accountId/search', requireAdminAuth, (req: Request, res: Response) => {
  const accountId = req.params.accountId;
  const recordId = req.query.recordId as string;
  const deleted = Storage.deleteSearchRecords(accountId, recordId);

  Storage.logActivity({
    type: 'delete_data',
    status: 'info',
    summary: recordId
      ? `Deleted individual Search history record (${recordId})`
      : `Deleted all (${deleted}) Search history records for account ${accountId}`,
  });

  res.json({ success: true, deletedCount: deleted });
});

/**
 * Application Activity Logs
 */
router.get('/activity-logs', requireAdminAuth, (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const isDemo = req.query.demo === 'true';
  const logs = Storage.getActivityLogs(limit, isDemo);
  res.json({ logs });
});

/**
 * Overview Metrics Aggregator
 */
router.get('/system/overview', requireAdminAuth, async (req: Request, res: Response) => {
  const isDemo = req.query.demo === 'true';
  const accounts = Storage.listAccounts(isDemo);

  const activeCount = accounts.filter(a => a.status === 'connected').length;
  const disconnectedCount = accounts.filter(a => a.status !== 'connected').length;

  let totalInbox = 0;
  let totalUnread = 0;
  let totalSent = 0;

  // Aggregate stats across active accounts
  for (const acc of accounts) {
    if (acc.status === 'connected') {
      const stats = await getGmailStats(acc.accountId, isDemo);
      totalInbox += stats.inboxTotal;
      totalUnread += stats.unreadTotal;
      totalSent += stats.sentTotal;
    }
  }

  const recentLogs = Storage.getActivityLogs(8, isDemo);

  res.json({
    metrics: {
      connectedAccountsTotal: accounts.length,
      activeConnections: activeCount,
      disconnectedAccounts: disconnectedCount,
      gmailInboxTotal: totalInbox,
      gmailUnreadTotal: totalUnread,
      gmailSentTotal: totalSent,
      lastSyncAt: new Date().toISOString(),
      isDemo,
    },
    recentLogs,
  });
});

export default router;
