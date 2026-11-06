import crypto from 'crypto';

// Ensure 32-byte key for AES-256-GCM
const rawKey = process.env.TOKEN_ENCRYPTION_KEY || 'acc-cmd-center-production-aes-256-secret-key-salt-32b!';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(rawKey).digest();
const ALGORITHM = 'aes-256-gcm';

export interface EncryptedData {
  encryptedData: string;
  iv: string;
  authTag: string;
}

/**
 * Encrypt sensitive plain text using AES-256-GCM
 */
export function encryptToken(text: string): EncryptedData {
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  return {
    encryptedData: encrypted,
    iv: iv.toString('hex'),
    authTag,
  };
}

/**
 * Decrypt AES-256-GCM cipher text
 */
export function decryptToken(encryptedData: string, ivHex: string, authTagHex: string): string {
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Deterministic fingerprint for Takeout entries to prevent duplicate imports
 */
export function generateRecordFingerprint(parts: (string | undefined | null)[]): string {
  const cleanStr = parts.map(p => (p || '').trim().toLowerCase()).join('::');
  return crypto.createHash('sha256').update(cleanStr).digest('hex').slice(0, 32);
}

/**
 * Secure OAuth state generator with HMAC signature and 10-minute validity
 */
const STATE_SECRET = process.env.SESSION_SECRET || 'acc-oauth-state-signing-secret-key-2026';

export function createOAuthState(redirectPath: string = '/accounts'): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  const payload = JSON.stringify({ nonce, expiresAt, redirectPath });
  const signature = crypto.createHmac('sha256', STATE_SECRET).update(payload).digest('hex');
  return Buffer.from(JSON.stringify({ payload, signature })).toString('base64url');
}

export function verifyOAuthState(stateString: string): { valid: boolean; redirectPath?: string } {
  try {
    const raw = Buffer.from(stateString, 'base64url').toString('utf8');
    const { payload, signature } = JSON.parse(raw);
    const expectedSig = crypto.createHmac('sha256', STATE_SECRET).update(payload).digest('hex');
    
    // Constant-time comparison
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return { valid: false };
    }
    
    const data = JSON.parse(payload);
    if (Date.now() > data.expiresAt) {
      return { valid: false };
    }
    
    return { valid: true, redirectPath: data.redirectPath };
  } catch {
    return { valid: false };
  }
}

/**
 * Password Hashing & Verification (scrypt with salt)
 */
export function hashPassword(password: string, customSalt?: string): { hash: string; salt: string } {
  const salt = customSalt || crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return {
    hash: derivedKey.toString('hex'),
    salt,
  };
}

export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  try {
    const keyToTest = crypto.scryptSync(password, salt, 64);
    const storedKey = Buffer.from(storedHash, 'hex');
    if (keyToTest.length !== storedKey.length) {
      return false;
    }
    return crypto.timingSafeEqual(keyToTest, storedKey);
  } catch {
    return false;
  }
}

/**
 * Administrator Session Token (Signed JWT-compatible HMAC token)
 */
export function signAdminToken(adminData: { uid: string; email: string; username: string; name?: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24-hour expiration
  const payload = Buffer.from(JSON.stringify({
    ...adminData,
    role: 'admin',
    email_verified: true,
    exp,
    iat: Math.floor(Date.now() / 1000),
  })).toString('base64url');
  
  const toSign = `${header}.${payload}`;
  const signature = crypto.createHmac('sha256', STATE_SECRET).update(toSign).digest('base64url');
  return `${toSign}.${signature}`;
}

export function verifyAdminToken(token: string): { valid: boolean; payload?: any; expired?: boolean } {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false };
    }
    const [header, payloadB64, signature] = parts;
    const toSign = `${header}.${payloadB64}`;
    const expectedSig = crypto.createHmac('sha256', STATE_SECRET).update(toSign).digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return { valid: false };
    }

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return { valid: false, expired: true };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}
