import { Request, Response, NextFunction } from 'express';
import { hashPassword, verifyPassword, verifyAdminToken, signAdminToken } from './crypto.ts';

// Configured Administrator Credentials
export const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || 'admin').trim();
export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'hillssinaitab20@gmail.com').trim().toLowerCase();
const DEFAULT_PASSWORD = process.env.ADMIN_PASSWORD || 'Zetta@admin';

// Store hashed password in memory / runtime
let adminPasswordRecord = hashPassword(DEFAULT_PASSWORD);

export function getAdminCredentialsInfo() {
  return {
    username: ADMIN_USERNAME,
    email: ADMIN_EMAIL,
    isDefaultPassword: verifyPassword('Zetta@admin', adminPasswordRecord.hash, adminPasswordRecord.salt),
  };
}

export function updateAdminPassword(newPassword: string): void {
  adminPasswordRecord = hashPassword(newPassword);
}

export function authenticateAdminCredentials(
  identifier: string,
  passwordAttempt: string
): { success: boolean; admin?: any } {
  const cleanId = (identifier || '').trim().toLowerCase();
  const matchesUser = cleanId === ADMIN_USERNAME.toLowerCase() || cleanId === ADMIN_EMAIL.toLowerCase();

  if (!matchesUser) {
    return { success: false };
  }

  const passwordMatches = verifyPassword(passwordAttempt, adminPasswordRecord.hash, adminPasswordRecord.salt);
  if (!passwordMatches) {
    return { success: false };
  }

  const admin = {
    uid: 'admin-primary-uid',
    username: ADMIN_USERNAME,
    email: ADMIN_EMAIL,
    displayName: 'Command Administrator',
    role: 'admin',
    emailVerified: true,
  };

  return { success: true, admin };
}

export interface AuthenticatedUser {
  uid: string;
  email: string;
  username?: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}

declare global {
  namespace Express {
    interface Request {
      adminUser?: AuthenticatedUser;
    }
  }
}

/**
 * Server-side authorization middleware
 * Strictly verifies that the request originates from the single authorized administrator session.
 */
export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const sessionToken = (req.cookies && req.cookies['acc_admin_token']) || (req.headers['x-admin-token'] as string);

  let rawToken = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    rawToken = authHeader.substring(7).trim();
  } else if (sessionToken) {
    rawToken = sessionToken.trim();
  }

  if (!rawToken) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Administrator authentication required. Please sign in with your administrator username and password.',
    });
    return;
  }

  // Verify signed token
  const tokenCheck = verifyAdminToken(rawToken);

  if (!tokenCheck.valid) {
    if (tokenCheck.expired) {
      res.status(401).json({
        error: 'SESSION_EXPIRED',
        message: 'Administrator session has expired. Please log in again.',
      });
      return;
    }

    res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Failed to verify administrator authentication session.',
    });
    return;
  }

  // Token is valid
  const payload = tokenCheck.payload;
  req.adminUser = {
    uid: payload.uid || 'admin-primary',
    email: payload.email || ADMIN_EMAIL,
    username: payload.username || ADMIN_USERNAME,
    emailVerified: true,
    name: payload.name || payload.displayName || 'Command Administrator',
    picture: payload.picture || undefined,
  };

  next();
}
