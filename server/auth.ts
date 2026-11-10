import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Role, UserRecord } from './types.ts';
import { db } from './db.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'balance_vault_enterprise_secure_token_key_2026';
const SALT_ROUNDS = 10;

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
}

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, SALT_ROUNDS);
}

export async function comparePassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

export function generateToken(user: UserRecord): string {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Authentication required. Missing Bearer token.' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err || !decoded) {
      res.status(403).json({ error: 'Invalid or expired session token.' });
      return;
    }

    req.user = decoded as TokenPayload;
    next();
  });
}

export function requireRole(allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized: User not authenticated.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      // Record security audit trail for unauthorized RBAC access attempt
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      db.addAuditLog({
        action: 'RBAC_ACCESS_DENIED',
        entity: 'SystemRoute',
        entityId: req.originalUrl,
        details: `User ${req.user.email} (${req.user.role}) attempted unauthorized access to ${req.method} ${req.originalUrl}. Required: [${allowedRoles.join(', ')}]`,
        severity: 'SECURITY_ALERT',
        ipAddress: ip,
        userAgent: req.headers['user-agent'],
        actorId: req.user.userId,
        actorEmail: req.user.email,
        actorRole: req.user.role,
      });

      res.status(403).json({
        error: `Access Denied: Insufficient permissions. Required role: ${allowedRoles.join(' or ')}.`,
      });
      return;
    }

    next();
  };
}
