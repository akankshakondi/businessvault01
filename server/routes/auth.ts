import { Router, Response } from 'express';
import { db } from '../db.ts';
import {
  comparePassword,
  hashPassword,
  generateToken,
  authenticateToken,
  AuthenticatedRequest,
} from '../auth.ts';
import { createRateLimiter } from '../rateLimiter.ts';
import { UserRecord, AccountRecord } from '../types.ts';

const router = Router();

// Rate limiter for auth endpoints: 30 requests per minute
const authLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  prefix: 'auth_rate_limit',
  message: 'Too many authentication attempts. Please wait 1 minute before retrying.',
});

router.use(authLimiter);

/**
 * Public User Registration
 * Note: Never allows public admin registration. Role is locked to 'USER'.
 */
router.post('/register', async (req, res: Response) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

    if (!email || !password || !firstName || !lastName) {
      res.status(400).json({ error: 'Missing required registration fields.' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      return;
    }

    // Security check: Never allow role escalation via public registration
    if (req.body.role && req.body.role !== 'USER') {
      db.addAuditLog({
        action: 'PRIVILEGE_ESCALATION_ATTEMPT',
        entity: 'User',
        details: `Registration payload attempted to assign role ${req.body.role} to email ${email}. Rejected.`,
        severity: 'SECURITY_ALERT',
        ipAddress: ip,
        userAgent: req.headers['user-agent'],
      });
      res.status(403).json({ error: 'Public registration of privileged roles (ADMIN) is strictly prohibited.' });
      return;
    }

    const existingUser = db.findUserByEmail(email);
    if (existingUser) {
      res.status(409).json({ error: 'An account with this email address already exists.' });
      return;
    }

    const passwordHash = await hashPassword(password);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    const newUser: UserRecord = {
      id: userId,
      email: email.trim().toLowerCase(),
      passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone ? phone.trim() : undefined,
      role: 'USER',
      status: 'PENDING_VERIFICATION',
      kycTier: 'TIER_1_BASIC',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    db.createUser(newUser);

    // Automatically provision initial checking account
    const accNumber = `${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`;
    const initialAccount: AccountRecord = {
      id: `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: newUser.id,
      accountNumber: accNumber,
      routingNumber: '021000021',
      name: `${newUser.firstName}'s Personal Checking`,
      type: 'CHECKING',
      currency: 'USD',
      balance: 1000.0, // Welcome synthetic demo balance
      available: 1000.0,
      status: 'ACTIVE',
      interestRate: 0.005,
      dailyLimit: 5000.0,
      isCardFrozen: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    db.createAccount(initialAccount);

    // Create welcome deposit transaction
    db.addTransaction({
      id: `tx_${Date.now()}_init`,
      accountId: initialAccount.id,
      referenceId: `TX-INIT-${Math.floor(100000 + Math.random() * 900000)}`,
      amount: 1000.0,
      currency: 'USD',
      type: 'DEPOSIT',
      status: 'COMPLETED',
      description: 'Initial Deposit - BalanceVault Welcome Bonus',
      counterparty: 'BalanceVault Federal Reserve',
      category: 'Deposit',
      fee: 0,
      createdAt: nowIso,
    });

    // Record audit log
    db.addAuditLog({
      action: 'USER_REGISTERED',
      entity: 'User',
      entityId: newUser.id,
      details: `New user ${newUser.email} registered. Initial account ${accNumber} created.`,
      severity: 'INFO',
      ipAddress: ip,
      userAgent: req.headers['user-agent'],
      actorId: newUser.id,
      actorEmail: newUser.email,
      actorRole: 'USER',
    });

    const token = generateToken(newUser);
    const { passwordHash: _, ...safeUser } = newUser;

    res.status(201).json({
      message: 'Registration successful.',
      token,
      user: safeUser,
      primaryAccount: initialAccount,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message || 'Server error during registration.' });
  }
});

/**
 * User & Admin Login
 */
router.post('/login', async (req, res: Response) => {
  try {
    const { email, password } = req.body;
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

    if (!email || !password) {
      res.status(400).json({ error: 'Please enter both email and password.' });
      return;
    }

    const user = db.findUserByEmail(email);
    if (!user) {
      db.addAuditLog({
        action: 'AUTH_FAILED',
        entity: 'Session',
        details: `Failed login attempt for unknown email: ${email}`,
        severity: 'WARN',
        ipAddress: ip,
        userAgent: req.headers['user-agent'],
      });
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    // Check account status
    if (user.status === 'SUSPENDED') {
      db.addAuditLog({
        action: 'AUTH_BLOCKED_SUSPENDED',
        entity: 'User',
        entityId: user.id,
        details: `Suspended user ${user.email} attempted login. Blocked.`,
        severity: 'SECURITY_ALERT',
        ipAddress: ip,
        userAgent: req.headers['user-agent'],
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
      });
      res.status(403).json({
        error: 'Your account is suspended due to compliance review. Please contact customer security.',
      });
      return;
    }

    const passwordValid = await comparePassword(password, user.passwordHash);
    if (!passwordValid) {
      db.addAuditLog({
        action: 'AUTH_FAILED',
        entity: 'User',
        entityId: user.id,
        details: `Incorrect password entered for ${user.email}`,
        severity: 'WARN',
        ipAddress: ip,
        userAgent: req.headers['user-agent'],
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
      });
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    // Issue JWT
    const token = generateToken(user);

    db.addAuditLog({
      action: 'AUTH_LOGIN',
      entity: 'Session',
      entityId: user.id,
      details: `Successful authenticated login for ${user.email} (${user.role}).`,
      severity: 'INFO',
      ipAddress: ip,
      userAgent: req.headers['user-agent'],
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
    });

    const { passwordHash: _, ...safeUser } = user;
    res.json({
      message: 'Login successful.',
      token,
      user: safeUser,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || 'Server error during login.' });
  }
});

/**
 * Get Current Authenticated Profile
 */
router.get('/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  const user = db.findUserById(req.user.userId);
  if (!user) {
    res.status(404).json({ error: 'User profile not found.' });
    return;
  }

  const accounts = db.findAccountsByUserId(user.id);
  const totalBalance = accounts.reduce((acc, curr) => acc + curr.balance, 0);

  const { passwordHash: _, ...safeUser } = user;
  res.json({
    user: safeUser,
    accountsCount: accounts.length,
    totalBalance,
  });
});

/**
 * Secure First-Admin Bootstrap Process
 * Protected by secret key BOOTSTRAP_SECRET_KEY or allowed once if zero admins exist.
 */
router.post('/bootstrap-admin', async (req, res: Response) => {
  try {
    const { email, password, firstName, lastName, secretKey } = req.body;
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

    const systemAdmins = db.listUsers().filter((u) => u.role === 'ADMIN');
    const expectedSecret = process.env.BOOTSTRAP_SECRET_KEY || 'vault_admin_master_secret_2026';

    // If an admin already exists, the master secret key is strictly required
    if (systemAdmins.length > 0 && secretKey !== expectedSecret) {
      db.addAuditLog({
        action: 'BOOTSTRAP_REJECTED',
        entity: 'SystemSecurity',
        details: `Unauthorized attempt to execute bootstrap-admin endpoint with invalid secret key.`,
        severity: 'CRITICAL',
        ipAddress: ip,
        userAgent: req.headers['user-agent'],
      });
      res.status(403).json({
        error: 'Admin bootstrap is locked. Valid BOOTSTRAP_SECRET_KEY is required to provision additional admins.',
      });
      return;
    }

    if (!email || !password || !firstName || !lastName) {
      res.status(400).json({ error: 'Missing required admin fields (email, password, firstName, lastName).' });
      return;
    }

    const existingUser = db.findUserByEmail(email);
    if (existingUser) {
      res.status(409).json({ error: 'A user with this email already exists.' });
      return;
    }

    const passwordHash = await hashPassword(password);
    const adminId = `usr_admin_${Date.now()}`;
    const nowIso = new Date().toISOString();

    const newAdmin: UserRecord = {
      id: adminId,
      email: email.trim().toLowerCase(),
      passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: 'ADMIN',
      status: 'ACTIVE',
      kycTier: 'TIER_3_INSTITUTIONAL',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    db.createUser(newAdmin);

    db.addAuditLog({
      action: 'ADMIN_BOOTSTRAP',
      entity: 'User',
      entityId: newAdmin.id,
      details: `New administrator ${newAdmin.email} successfully provisioned via secure bootstrap protocol.`,
      severity: 'INFO',
      ipAddress: ip,
      userAgent: req.headers['user-agent'],
      actorId: newAdmin.id,
      actorEmail: newAdmin.email,
      actorRole: 'ADMIN',
    });

    const token = generateToken(newAdmin);
    const { passwordHash: _, ...safeAdmin } = newAdmin;

    res.status(201).json({
      message: 'Admin account successfully bootstrapped.',
      token,
      user: safeAdmin,
    });
  } catch (error: any) {
    console.error('Bootstrap admin error:', error);
    res.status(500).json({ error: error.message || 'Server error during bootstrap.' });
  }
});

export default router;
