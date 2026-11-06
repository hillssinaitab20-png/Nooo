import { google } from 'googleapis';
import { encryptToken, decryptToken, createOAuthState, verifyOAuthState } from './crypto.ts';
import { Storage } from './storage.ts';
import { ConnectedAccount, PrivateCredential } from './types.ts';

export const OAUTH_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/gmail.readonly',
];

export interface GoogleOAuthStatus {
  isConfigured: boolean;
  clientIdConfigured: boolean;
  clientSecretConfigured: boolean;
  redirectUri: string;
  scopes: string[];
}

export function getOAuthRedirectUri(reqBaseUrl?: string): string {
  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI;
  }
  if (process.env.APP_URL) {
    const cleanAppUrl = process.env.APP_URL.replace(/\/+$/, '');
    return `${cleanAppUrl}/api/auth/google/callback`;
  }
  if (reqBaseUrl) {
    return `${reqBaseUrl}/api/auth/google/callback`;
  }
  return 'http://localhost:3000/api/auth/google/callback';
}

export function getOAuthStatus(reqBaseUrl?: string): GoogleOAuthStatus {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const isConfigured = !!(clientId && clientSecret && !clientId.startsWith('your-') && !clientSecret.startsWith('your-'));
  
  return {
    isConfigured,
    clientIdConfigured: !!(clientId && !clientId.startsWith('your-')),
    clientSecretConfigured: !!(clientSecret && !clientSecret.startsWith('your-')),
    redirectUri: getOAuthRedirectUri(reqBaseUrl),
    scopes: OAUTH_SCOPES,
  };
}

export function createOAuth2Client(reqBaseUrl?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const redirectUri = getOAuthRedirectUri(reqBaseUrl);

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );
}

/**
 * Initiates the Google OAuth 2.0 authorization code flow
 */
export function getAuthorizationUrl(reqBaseUrl?: string, redirectPath: string = '/accounts'): { url: string; state: string } {
  const oauth2Client = createOAuth2Client(reqBaseUrl);
  const state = createOAuthState(redirectPath);

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Requests refresh_token for background sync
    prompt: 'consent select_account', // Always prompt account picker so admin selects target account
    scope: OAUTH_SCOPES,
    state,
    include_granted_scopes: true,
  });

  return { url, state };
}

/**
 * Handles OAuth callback, exchanges code for tokens, verifies profile, encrypts refresh token
 */
export async function handleOAuthCallback(
  code: string,
  state: string,
  reqBaseUrl?: string
): Promise<{ account: ConnectedAccount; isNew: boolean }> {
  const stateCheck = verifyOAuthState(state);
  if (!stateCheck.valid) {
    throw new Error('INVALID_OAUTH_STATE: State token mismatch or expired. Potential CSRF blocked.');
  }

  const oauth2Client = createOAuth2Client(reqBaseUrl);
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  // Fetch Google User Info using the validated access token
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const userInfoResponse = await oauth2.userinfo.get();
  const userInfo = userInfoResponse.data;

  if (!userInfo.id || !userInfo.email) {
    throw new Error('MISSING_USER_INFO: Unable to retrieve Google account ID or email from Google API.');
  }

  const accountId = userInfo.id;
  const email = userInfo.email;
  const name = userInfo.name || email.split('@')[0];
  const picture = userInfo.picture || undefined;

  const nowIso = new Date().toISOString();
  const existingAccount = Storage.getAccount(accountId);
  const isNew = !existingAccount;

  // Encrypt refresh token if provided (Google only sends refresh_token on initial consent)
  if (tokens.refresh_token) {
    const encrypted = encryptToken(tokens.refresh_token);
    const credential: PrivateCredential = {
      accountId,
      encryptedRefreshToken: encrypted.encryptedData,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      accessToken: tokens.access_token || undefined,
      tokenExpiry: tokens.expiry_date || undefined,
      updatedAt: nowIso,
    };
    Storage.saveCredential(credential);
  } else if (existingAccount) {
    // Keep existing refresh token, update access token cache
    const existingCred = Storage.getCredential(accountId);
    if (existingCred) {
      existingCred.accessToken = tokens.access_token || undefined;
      existingCred.tokenExpiry = tokens.expiry_date || undefined;
      existingCred.updatedAt = nowIso;
      Storage.saveCredential(existingCred);
    }
  }

  const account: ConnectedAccount = {
    accountId,
    email,
    name,
    picture,
    status: 'connected',
    scope: tokens.scope || OAUTH_SCOPES.join(' '),
    connectedAt: existingAccount?.connectedAt || nowIso,
    lastSyncAt: nowIso,
    services: ['gmail', 'youtube', 'search'],
  };

  Storage.saveAccount(account);
  Storage.logActivity({
    type: 'connect_account',
    accountEmail: email,
    status: 'success',
    summary: `Google account ${email} authorized via OAuth 2.0 flow`,
  });

  return { account, isNew };
}

/**
 * Revokes Google OAuth token and disconnects account
 */
export async function disconnectGoogleAccount(accountId: string): Promise<boolean> {
  const account = Storage.getAccount(accountId, true);
  if (!account) return false;

  const credential = Storage.getCredential(accountId);
  if (credential && credential.encryptedRefreshToken) {
    try {
      const refreshToken = decryptToken(
        credential.encryptedRefreshToken,
        credential.iv,
        credential.authTag
      );
      // Revoke token with Google
      const oauth2Client = createOAuth2Client();
      await oauth2Client.revokeToken(refreshToken);
    } catch (err) {
      console.warn('Revoke token warning (may already be revoked):', err);
    }
  }

  // Remove credential from storage
  Storage.deleteCredential(accountId);

  // Update status or remove account
  account.status = 'disconnected';
  Storage.saveAccount(account);

  Storage.logActivity({
    type: 'disconnect_account',
    accountEmail: account.email,
    status: 'info',
    summary: `Disconnected Google account ${account.email} and revoked OAuth credentials`,
  });

  return true;
}

/**
 * Gets an authenticated OAuth2Client for an account using decrypted refresh token
 */
export async function getAuthenticatedClientForAccount(accountId: string) {
  const credential = Storage.getCredential(accountId);
  if (!credential) {
    throw new Error('NO_CREDENTIALS: No stored authorization token for this account. Reconnection required.');
  }

  const refreshToken = decryptToken(
    credential.encryptedRefreshToken,
    credential.iv,
    credential.authTag
  );

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
    access_token: credential.accessToken,
    expiry_date: credential.tokenExpiry,
  });

  return oauth2Client;
}
