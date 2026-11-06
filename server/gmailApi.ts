import { google, gmail_v1 } from 'googleapis';
import { getAuthenticatedClientForAccount } from './googleOAuth.ts';
import { GmailStats, GmailMessageSummary, GmailMessageDetail } from './types.ts';
import { Storage } from './storage.ts';

// Demo Gmail Messages
const DEMO_GMAIL_MESSAGES: GmailMessageDetail[] = [
  {
    id: 'demo-msg-1',
    threadId: 'demo-thread-1',
    subject: 'Security Alert: New OAuth App Authorization Verified',
    from: 'Google Cloud Platform <no-reply@accounts.google.com>',
    to: 'hillssinaitab20@gmail.com',
    date: new Date(Date.now() - 35 * 60000).toISOString(),
    snippet: 'Account Command Center was granted restricted read-only access (gmail.readonly) to your Gmail messages...',
    labels: ['INBOX', 'UNREAD', 'IMPORTANT'],
    isUnread: true,
    hasAttachments: false,
    folder: 'inbox',
    isDemo: true,
    bodyHtml: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 16px; color: #1e293b;">
        <h2 style="color: #0f172a; margin-top: 0;">Google Security Verification</h2>
        <p>A new application was granted authorized access to your Google Account:</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin: 16px 0;">
          <strong>Application:</strong> Account Command Center<br/>
          <strong>Requested Scope:</strong> <code>https://www.googleapis.com/auth/gmail.readonly</code><br/>
          <strong>Access Type:</strong> Offline Refresh Token (Server-Side Encrypted)<br/>
          <strong>Timestamp:</strong> Today at ${new Date().toLocaleTimeString()}
        </div>
        <p>If you authorized this access from your administrator terminal, no further action is required.</p>
        <p style="color: #64748b; font-size: 12px; margin-top: 24px;">This is a demonstration message illustrating production Gmail API integration.</p>
      </div>
    `,
    bodyText: 'Google Security Verification: Account Command Center was granted restricted read-only access (gmail.readonly) to your Google Account.',
  },
  {
    id: 'demo-msg-2',
    threadId: 'demo-thread-2',
    subject: 'Google Cloud Monthly Billing & Architecture Summary',
    from: 'Google Cloud Billing <billing-noreply@google.com>',
    to: 'hillssinaitab20@gmail.com',
    date: new Date(Date.now() - 4 * 3600000).toISOString(),
    snippet: 'Your Cloud Firestore and Cloud Run usage report for project gen-lang-client-0123631544 is now ready...',
    labels: ['INBOX'],
    isUnread: false,
    hasAttachments: true,
    folder: 'inbox',
    isDemo: true,
    bodyHtml: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 16px; color: #1e293b;">
        <h2 style="color: #0f172a; margin-top: 0;">Google Cloud Billing Summary</h2>
        <p>Dear Administrator,</p>
        <p>Your monthly statement for Google Cloud project <strong>gen-lang-client-0123631544</strong> has been generated.</p>
        <ul>
          <li>Cloud Firestore (Enterprise Edition): Tier 1 Free Allocation</li>
          <li>Cloud Run Applet Runtime: Active ($0.00 within free tier)</li>
          <li>Google APIs (Gmail & OAuth2): Active</li>
        </ul>
        <p>View your full invoice and audit logs anytime in the Google Cloud Console.</p>
      </div>
    `,
    bodyText: 'Google Cloud Billing Summary: Your statement for project gen-lang-client-0123631544 is ready.',
  },
  {
    id: 'demo-msg-3',
    threadId: 'demo-thread-3',
    subject: 'Google Workspace: Security Audit Completed for Command Center',
    from: 'Workspace Admin Team <workspace-security@google.com>',
    to: 'hillssinaitab20@gmail.com',
    date: new Date(Date.now() - 24 * 3600000).toISOString(),
    snippet: 'Zero-trust audit check completed. All administrator sessions require MFA and valid ID tokens...',
    labels: ['INBOX'],
    isUnread: false,
    hasAttachments: false,
    folder: 'inbox',
    isDemo: true,
    bodyHtml: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 16px; color: #1e293b;">
        <h3 style="color: #0f172a; margin-top: 0;">Google Workspace Zero-Trust Audit</h3>
        <p>Your workspace environment has passed the internal security policy check.</p>
        <p>Summary of enforced policies:</p>
        <ul>
          <li>Strict single-admin access policy</li>
          <li>Server-side AES-256-GCM token encryption</li>
          <li>Least-privilege read-only Gmail scope</li>
          <li>Client-side sanitized HTML rendering</li>
        </ul>
      </div>
    `,
    bodyText: 'Google Workspace Zero-Trust Audit completed successfully.',
  },
  {
    id: 'demo-msg-4',
    threadId: 'demo-thread-4',
    subject: 'Re: API Integration Architecture & Production Checklist',
    from: 'Command Administrator <hillssinaitab20@gmail.com>',
    to: 'security-review@example.com',
    date: new Date(Date.now() - 48 * 3600000).toISOString(),
    snippet: 'Attached is our OAuth 2.0 verification package and CASA Tier 2 self-assessment questionnaire...',
    labels: ['SENT'],
    isUnread: false,
    hasAttachments: true,
    folder: 'sent',
    isDemo: true,
    bodyHtml: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 16px; color: #1e293b;">
        <p>Hello Review Team,</p>
        <p>We have submitted our application for verification with the <code>gmail.readonly</code> scope.</p>
        <p>Key architecture points:</p>
        <ul>
          <li>Tokens are encrypted with AES-256-GCM at rest</li>
          <li>Emails are retrieved on-demand and never stored permanently in database</li>
          <li>Only the designated administrator can authorize personal accounts</li>
        </ul>
        <p>Best regards,<br/>Admin</p>
      </div>
    `,
    bodyText: 'We have submitted our application for verification with the gmail.readonly scope.',
  },
];

/**
 * Fetch Gmail statistics (Inbox total, Unread total, Sent total)
 */
export async function getGmailStats(accountId: string, isDemo: boolean = false): Promise<GmailStats> {
  if (isDemo || accountId.startsWith('demo-')) {
    const unread = DEMO_GMAIL_MESSAGES.filter(m => m.folder === 'inbox' && m.isUnread).length;
    const inbox = DEMO_GMAIL_MESSAGES.filter(m => m.folder === 'inbox').length;
    const sent = DEMO_GMAIL_MESSAGES.filter(m => m.folder === 'sent').length;

    return {
      inboxTotal: inbox,
      unreadTotal: unread,
      sentTotal: sent,
      lastChecked: new Date().toISOString(),
      status: 'connected',
      isDemo: true,
    };
  }

  try {
    const auth = await getAuthenticatedClientForAccount(accountId);
    const gmail = google.gmail({ version: 'v1', auth });

    const [inboxLabel, sentLabel] = await Promise.all([
      gmail.users.labels.get({ userId: 'me', id: 'INBOX' }).catch(() => null),
      gmail.users.labels.get({ userId: 'me', id: 'SENT' }).catch(() => null),
    ]);

    const inboxTotal = inboxLabel?.data.messagesTotal || 0;
    const unreadTotal = inboxLabel?.data.messagesUnread || 0;
    const sentTotal = sentLabel?.data.messagesTotal || 0;

    // Update account lastSyncAt
    const account = Storage.getAccount(accountId);
    if (account) {
      account.lastSyncAt = new Date().toISOString();
      account.status = 'connected';
      Storage.saveAccount(account);
    }

    return {
      inboxTotal,
      unreadTotal,
      sentTotal,
      lastChecked: new Date().toISOString(),
      status: 'connected',
      isDemo: false,
    };
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    let status: GmailStats['status'] = 'error';

    if (errMsg.includes('invalid_grant') || errMsg.includes('NO_CREDENTIALS')) {
      status = 'auth_required';
    } else if (errMsg.includes('accessNotConfigured') || errMsg.includes('disabled')) {
      status = 'api_disabled';
    }

    // Update account status if needed
    const account = Storage.getAccount(accountId);
    if (account && status === 'auth_required') {
      account.status = 'expired';
      Storage.saveAccount(account);
    }

    return {
      inboxTotal: 0,
      unreadTotal: 0,
      sentTotal: 0,
      lastChecked: new Date().toISOString(),
      status,
      errorMessage: errMsg,
      isDemo: false,
    };
  }
}

/**
 * List Gmail messages for an account with filters and pagination
 */
export async function listGmailMessages(
  accountId: string,
  options: {
    folder?: 'inbox' | 'sent' | 'all';
    q?: string;
    maxResults?: number;
    pageToken?: string;
  } = {},
  isDemo: boolean = false
): Promise<{ messages: GmailMessageSummary[]; nextPageToken?: string; totalEstimated?: number }> {
  if (isDemo || accountId.startsWith('demo-')) {
    let list = [...DEMO_GMAIL_MESSAGES];

    if (options.folder && options.folder !== 'all') {
      list = list.filter(m => m.folder === options.folder);
    }

    if (options.q && options.q.trim()) {
      const q = options.q.toLowerCase().trim();
      list = list.filter(m =>
        m.subject.toLowerCase().includes(q) ||
        m.from.toLowerCase().includes(q) ||
        m.snippet.toLowerCase().includes(q)
      );
    }

    const summaries: GmailMessageSummary[] = list.map(m => ({
      id: m.id,
      threadId: m.threadId,
      subject: m.subject,
      from: m.from,
      to: m.to,
      date: m.date,
      snippet: m.snippet,
      labels: m.labels,
      isUnread: m.isUnread,
      hasAttachments: m.hasAttachments,
      folder: m.folder,
      isDemo: true,
    }));

    return {
      messages: summaries,
      totalEstimated: summaries.length,
    };
  }

  const auth = await getAuthenticatedClientForAccount(accountId);
  const gmail = google.gmail({ version: 'v1', auth });

  const labelIds: string[] = [];
  if (options.folder === 'inbox') labelIds.push('INBOX');
  else if (options.folder === 'sent') labelIds.push('SENT');

  const maxResults = options.maxResults || 20;

  const response = await gmail.users.messages.list({
    userId: 'me',
    labelIds: labelIds.length > 0 ? labelIds : undefined,
    q: options.q || undefined,
    maxResults,
    pageToken: options.pageToken || undefined,
  });

  const messageItems = response.data.messages || [];
  const summaries: GmailMessageSummary[] = [];

  // Fetch summaries concurrently in small batches
  const batchSize = 10;
  for (let i = 0; i < messageItems.length; i += batchSize) {
    const batch = messageItems.slice(i, i + batchSize);
    const details = await Promise.all(
      batch.map(async m => {
        if (!m.id) return null;
        try {
          const detail = await gmail.users.messages.get({
            userId: 'me',
            id: m.id,
            format: 'metadata',
            metadataHeaders: ['Subject', 'From', 'To', 'Date'],
          });
          return parseMessageSummary(detail.data);
        } catch {
          return null;
        }
      })
    );
    for (const d of details) {
      if (d) summaries.push(d);
    }
  }

  return {
    messages: summaries,
    nextPageToken: response.data.nextPageToken || undefined,
    totalEstimated: response.data.resultSizeEstimate || summaries.length,
  };
}

/**
 * Fetch a single message detail on demand (NEVER permanently stored)
 */
export async function getGmailMessageDetail(
  accountId: string,
  messageId: string,
  isDemo: boolean = false
): Promise<GmailMessageDetail> {
  if (isDemo || accountId.startsWith('demo-') || messageId.startsWith('demo-')) {
    const found = DEMO_GMAIL_MESSAGES.find(m => m.id === messageId);
    if (found) return found;
    throw new Error('DEMO_MESSAGE_NOT_FOUND');
  }

  const auth = await getAuthenticatedClientForAccount(accountId);
  const gmail = google.gmail({ version: 'v1', auth });

  const response = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });

  const msg = response.data;
  const summary = parseMessageSummary(msg);

  let bodyHtml = '';
  let bodyText = '';

  // Extract body parts recursively
  function extractParts(part?: gmail_v1.Schema$MessagePart) {
    if (!part) return;
    if (part.mimeType === 'text/html' && part.body?.data) {
      bodyHtml = Buffer.from(part.body.data, 'base64url').toString('utf-8');
    } else if (part.mimeType === 'text/plain' && part.body?.data) {
      bodyText = Buffer.from(part.body.data, 'base64url').toString('utf-8');
    }
    if (part.parts && Array.isArray(part.parts)) {
      for (const p of part.parts) {
        extractParts(p);
      }
    }
  }

  if (msg.payload) {
    if (msg.payload.body?.data) {
      if (msg.payload.mimeType === 'text/html') {
        bodyHtml = Buffer.from(msg.payload.body.data, 'base64url').toString('utf-8');
      } else {
        bodyText = Buffer.from(msg.payload.body.data, 'base64url').toString('utf-8');
      }
    }
    if (msg.payload.parts) {
      for (const p of msg.payload.parts) {
        extractParts(p);
      }
    }
  }

  return {
    ...summary,
    bodyHtml: bodyHtml || undefined,
    bodyText: bodyText || undefined,
  };
}

function parseMessageSummary(msg: gmail_v1.Schema$Message): GmailMessageSummary {
  const headers = msg.payload?.headers || [];
  let subject = '(No Subject)';
  let from = 'Unknown Sender';
  let to = '';
  let date = msg.internalDate ? new Date(parseInt(msg.internalDate, 10)).toISOString() : new Date().toISOString();

  for (const h of headers) {
    if (!h.name) continue;
    const name = h.name.toLowerCase();
    if (name === 'subject') subject = h.value || subject;
    else if (name === 'from') from = h.value || from;
    else if (name === 'to') to = h.value || to;
    else if (name === 'date') {
      try {
        const d = new Date(h.value || '');
        if (!isNaN(d.getTime())) date = d.toISOString();
      } catch {
        // keep fallback
      }
    }
  }

  const labels = msg.labelIds || [];
  const isUnread = labels.includes('UNREAD');
  const folder = labels.includes('SENT') ? 'sent' : labels.includes('INBOX') ? 'inbox' : 'other';

  return {
    id: msg.id || 'unknown',
    threadId: msg.threadId || 'unknown',
    subject,
    from,
    to,
    date,
    snippet: msg.snippet || '',
    labels,
    isUnread,
    hasAttachments: (msg.payload?.parts || []).some(p => !!p.filename),
    folder,
  };
}
