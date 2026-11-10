import { Router, Response } from 'express';
import { db } from '../db.ts';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../auth.ts';
import { redisLimiterStore, createRateLimiter } from '../rateLimiter.ts';
import { UserStatus, Role, AccountRecord } from '../types.ts';

const router = Router();

// Rate limiter for admin operations: 80 requests per minute
router.use(createRateLimiter({ windowMs: 60000, maxRequests: 80, prefix: 'admin_api' }));
router.use(authenticateToken);
// Enforce RBAC: Only ADMIN or COMPLIANCE_OFFICER allowed
router.use(requireRole(['ADMIN', 'COMPLIANCE_OFFICER']));

/**
 * Admin Dashboard System Overview & Metrics
 */
router.get('/metrics', (_req: AuthenticatedRequest, res: Response) => {
  const users = db.listUsers();
  const accounts = db.listAllAccounts();
  const transactions = db.listAllTransactions();
  const applications = db.listApplications();

  const totalAssets = accounts.reduce((acc, curr) => acc + curr.balance, 0);
  const pendingKycCount = applications.filter((a) => a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW').length;
  const activeAccountsCount = accounts.filter((a) => a.status === 'ACTIVE').length;
  const flaggedTxCount = transactions.filter((t) => t.status === 'FLAGGED').length;

  // 24h volume
  const oneDayAgo = Date.now() - 24 * 3600 * 1000;
  const volume24h = transactions
    .filter((t) => new Date(t.createdAt).getTime() >= oneDayAgo)
    .reduce((acc, curr) => acc + Math.abs(curr.amount), 0);

  const redisMetrics = redisLimiterStore.getMetrics();

  res.json({
    metrics: {
      totalAssetsUnderCustody: totalAssets,
      activeAccountsCount,
      totalUsersCount: users.length,
      pendingKycCount,
      flaggedTxCount,
      volume24h,
      totalTransactionsCount: transactions.length,
    },
    redis: redisMetrics,
  });
});

/**
 * Admin User Management: List all users
 */
router.get('/users', (_req: AuthenticatedRequest, res: Response) => {
  const users = db.listUsers();
  const accounts = db.listAllAccounts();

  const userSummaries = users.map((u) => {
    const userAccs = accounts.filter((a) => a.userId === u.id);
    const balance = userAccs.reduce((sum, a) => sum + a.balance, 0);
    const { passwordHash: _, ...safeUser } = u;
    return {
      ...safeUser,
      accountsCount: userAccs.length,
      totalBalance: balance,
    };
  });

  res.json({ users: userSummaries });
});

/**
 * Admin User Management: Update User Status (Activate/Suspend)
 */
router.patch('/users/:id/status', (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return;
    const { status, reason } = req.body;
    const targetUserId = req.params.id;

    if (!['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'].includes(status)) {
      res.status(400).json({ error: 'Invalid user status.' });
      return;
    }

    const targetUser = db.findUserById(targetUserId);
    if (!targetUser) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    // Safety: Prevent self-suspension of the currently logged in admin
    if (targetUser.id === req.user.userId && status === 'SUSPENDED') {
      res.status(400).json({ error: 'You cannot suspend your own administrative account.' });
      return;
    }

    const prevStatus = targetUser.status;
    const updated = db.updateUser(targetUserId, { status: status as UserStatus });

    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    db.addAuditLog({
      action: status === 'SUSPENDED' ? 'USER_SUSPENDED' : 'USER_STATUS_UPDATED',
      entity: 'User',
      entityId: targetUser.id,
      details: `User ${targetUser.email} status changed from ${prevStatus} to ${status}. Reason: ${reason || 'Administrative action'}`,
      severity: status === 'SUSPENDED' ? 'SECURITY_ALERT' : 'INFO',
      ipAddress: ip,
      userAgent: req.headers['user-agent'],
      actorId: req.user.userId,
      actorEmail: req.user.email,
      actorRole: req.user.role,
    });

    const { passwordHash: _, ...safeUser } = updated!;
    res.json({ message: `User status changed to ${status}.`, user: safeUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update user status.' });
  }
});

/**
 * Admin User Management: Update Role (RBAC)
 */
router.patch('/users/:id/role', (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return;
    const { role } = req.body;
    const targetUserId = req.params.id;

    // Only full ADMIN can change roles
    if (req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Only full administrators can assign system roles.' });
      return;
    }

    if (!['USER', 'ADMIN', 'COMPLIANCE_OFFICER'].includes(role)) {
      res.status(400).json({ error: 'Invalid role.' });
      return;
    }

    const targetUser = db.findUserById(targetUserId);
    if (!targetUser) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    // Prevent demoting self
    if (targetUser.id === req.user.userId && role !== 'ADMIN') {
      res.status(400).json({ error: 'You cannot revoke your own administrator privileges.' });
      return;
    }

    const prevRole = targetUser.role;
    const updated = db.updateUser(targetUserId, { role: role as Role });

    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    db.addAuditLog({
      action: 'ROLE_MODIFIED',
      entity: 'User',
      entityId: targetUser.id,
      details: `User ${targetUser.email} role transitioned from ${prevRole} to ${role}.`,
      severity: 'WARN',
      ipAddress: ip,
      userAgent: req.headers['user-agent'],
      actorId: req.user.userId,
      actorEmail: req.user.email,
      actorRole: req.user.role,
    });

    const { passwordHash: _, ...safeUser } = updated!;
    res.json({ message: `Role updated to ${role}.`, user: safeUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update role.' });
  }
});

/**
 * Application Approvals & Rejections: List applications
 */
router.get('/applications', (_req: AuthenticatedRequest, res: Response) => {
  const apps = db.listApplications();
  res.json({ applications: apps });
});

/**
 * Application Approvals & Rejections: Review (Approve / Reject)
 */
router.post('/applications/:id/review', (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return;
    const { decision, notes } = req.body;
    const appId = req.params.id;

    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      res.status(400).json({ error: 'Decision must be either APPROVED or REJECTED.' });
      return;
    }

    const application = db.findApplicationById(appId);
    if (!application) {
      res.status(404).json({ error: 'Application not found.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const updatedApp = db.updateApplication(appId, {
      status: decision,
      adminNotes: notes || (decision === 'APPROVED' ? 'Approved by compliance officer.' : 'Declined per policy requirements.'),
      reviewedAt: nowIso,
      reviewedBy: req.user.email,
    });

    const targetUser = db.findUserById(application.userId);
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

    if (decision === 'APPROVED') {
      // Upgrade user KYC tier and activate user
      if (targetUser) {
        db.updateUser(targetUser.id, {
          status: 'ACTIVE',
          kycTier: application.requestedTier,
        });

        // Check if user has accounts; if not, provision default accounts
        const userAccounts = db.findAccountsByUserId(targetUser.id);
        if (userAccounts.length === 0) {
          const accNumber = `${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`;
          const newAccount: AccountRecord = {
            id: `acc_${Date.now()}_prov`,
            userId: targetUser.id,
            accountNumber: accNumber,
            routingNumber: '021000021',
            name: `${targetUser.firstName}'s Primary Checking`,
            type: 'CHECKING',
            currency: 'USD',
            balance: 5000.0,
            available: 5000.0,
            status: 'ACTIVE',
            interestRate: 0.005,
            dailyLimit: 25000.0,
            isCardFrozen: false,
            createdAt: nowIso,
            updatedAt: nowIso,
          };
          db.createAccount(newAccount);

          db.addTransaction({
            id: `tx_${Date.now()}_init_bonus`,
            accountId: newAccount.id,
            referenceId: `TX-KYC-BONUS-${Math.floor(100000 + Math.random() * 900000)}`,
            amount: 5000.0,
            currency: 'USD',
            type: 'DEPOSIT',
            status: 'COMPLETED',
            description: 'Approved KYC Tier 2 Liquidity Grant',
            counterparty: 'BalanceVault Treasury',
            category: 'Grant',
            fee: 0,
            createdAt: nowIso,
          });
        }
      }

      db.addAuditLog({
        action: 'KYC_APPROVED',
        entity: 'OnboardingApplication',
        entityId: application.id,
        details: `Application ${application.applicationNumber} APPROVED by ${req.user.email}. Tier upgraded to ${application.requestedTier}.`,
        severity: 'INFO',
        ipAddress: ip,
        userAgent: req.headers['user-agent'],
        actorId: req.user.userId,
        actorEmail: req.user.email,
        actorRole: req.user.role,
      });
    } else {
      // REJECTED
      db.addAuditLog({
        action: 'KYC_REJECTED',
        entity: 'OnboardingApplication',
        entityId: application.id,
        details: `Application ${application.applicationNumber} REJECTED by ${req.user.email}. Reason: ${notes || 'Compliance criteria not met'}.`,
        severity: 'WARN',
        ipAddress: ip,
        userAgent: req.headers['user-agent'],
        actorId: req.user.userId,
        actorEmail: req.user.email,
        actorRole: req.user.role,
      });
    }

    res.json({
      message: `Application ${decision.toLowerCase()} successfully.`,
      application: updatedApp,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to review application.' });
  }
});

/**
 * Audit Logs: Retrieve system audit trail
 */
router.get('/audit-logs', (req: AuthenticatedRequest, res: Response) => {
  const { search, severity, action } = req.query;
  let logs = db.listAuditLogs();

  if (severity && severity !== 'ALL') {
    logs = logs.filter((l) => l.severity === severity);
  }

  if (action && action !== 'ALL') {
    logs = logs.filter((l) => l.action === action);
  }

  if (search) {
    const q = (search as string).toLowerCase();
    logs = logs.filter(
      (l) =>
        l.details.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        (l.actorEmail && l.actorEmail.toLowerCase().includes(q)) ||
        l.ipAddress.includes(q)
    );
  }

  res.json({ auditLogs: logs });
});

/**
 * System Demo Reset
 */
router.post('/system/reset-demo', (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return;
  db.seedDefaults();

  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  db.addAuditLog({
    action: 'DEMO_DATA_RESET',
    entity: 'System',
    details: `Admin ${req.user.email} triggered synthetic demo dataset reset.`,
    severity: 'WARN',
    ipAddress: ip,
    userAgent: req.headers['user-agent'],
    actorId: req.user.userId,
    actorEmail: req.user.email,
    actorRole: req.user.role,
  });

  res.json({ message: 'Synthetic dataset successfully reset to initial baseline.' });
});

export default router;
