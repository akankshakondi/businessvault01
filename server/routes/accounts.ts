import { Router, Response } from 'express';
import { db } from '../db.ts';
import { authenticateToken, AuthenticatedRequest } from '../auth.ts';
import { createRateLimiter } from '../rateLimiter.ts';
import { AccountRecord, TransactionRecord } from '../types.ts';

const router = Router();

// Standard API rate limiter: 120 reqs / min
router.use(createRateLimiter({ windowMs: 60000, maxRequests: 120, prefix: 'acc_api' }));
router.use(authenticateToken);

/**
 * Get accounts for authenticated user
 */
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return;
  const accounts = db.findAccountsByUserId(req.user.userId);
  res.json({ accounts });
});

/**
 * Open a new account
 */
router.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return;
    const { name, type, currency = 'USD', initialDeposit = 0 } = req.body;

    if (!name || !type) {
      res.status(400).json({ error: 'Account name and type are required.' });
      return;
    }

    const validTypes = ['CHECKING', 'SAVINGS', 'INVESTMENT', 'BUSINESS'];
    if (!validTypes.includes(type)) {
      res.status(400).json({ error: `Invalid account type. Allowed: ${validTypes.join(', ')}` });
      return;
    }

    const parsedDeposit = Number(initialDeposit) || 0;
    if (parsedDeposit < 0) {
      res.status(400).json({ error: 'Initial deposit cannot be negative.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const accNumber = `${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`;
    const interestRate = type === 'SAVINGS' ? 0.0485 : type === 'BUSINESS' ? 0.021 : 0.005;
    const dailyLimit = type === 'BUSINESS' ? 250000.0 : type === 'INVESTMENT' ? 100000.0 : 25000.0;

    const newAccount: AccountRecord = {
      id: `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: req.user.userId,
      accountNumber: accNumber,
      routingNumber: '021000021',
      name: name.trim(),
      type,
      currency,
      balance: parsedDeposit,
      available: parsedDeposit,
      status: 'ACTIVE',
      interestRate,
      dailyLimit,
      isCardFrozen: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    db.createAccount(newAccount);

    if (parsedDeposit > 0) {
      db.addTransaction({
        id: `tx_${Date.now()}_dep`,
        accountId: newAccount.id,
        referenceId: `TX-DEP-${Math.floor(100000 + Math.random() * 900000)}`,
        amount: parsedDeposit,
        currency,
        type: 'DEPOSIT',
        status: 'COMPLETED',
        description: `Initial funding deposit for ${newAccount.name}`,
        counterparty: 'External Bank Transfer',
        category: 'Funding',
        fee: 0,
        createdAt: nowIso,
      });
    }

    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    db.addAuditLog({
      action: 'ACCOUNT_OPENED',
      entity: 'Account',
      entityId: newAccount.id,
      details: `User created account "${newAccount.name}" (${newAccount.type}) with initial deposit of $${parsedDeposit.toFixed(2)}.`,
      severity: 'INFO',
      ipAddress: ip,
      userAgent: req.headers['user-agent'],
      actorId: req.user.userId,
      actorEmail: req.user.email,
      actorRole: req.user.role,
    });

    res.status(201).json({ message: 'Account successfully created.', account: newAccount });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create account.' });
  }
});

/**
 * Execute transfer (internal or external ACH/wire)
 */
router.post('/transfer', (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return;
    const { sourceAccountId, destinationType, targetAccountId, recipientName, routingNumber, accountNumber, amount, note } = req.body;

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      res.status(400).json({ error: 'Transfer amount must be a positive number.' });
      return;
    }

    const sourceAccount = db.findAccountById(sourceAccountId);
    if (!sourceAccount) {
      res.status(404).json({ error: 'Source account not found.' });
      return;
    }

    if (sourceAccount.userId !== req.user.userId && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'You do not own this source account.' });
      return;
    }

    if (sourceAccount.status === 'FROZEN' || sourceAccount.isCardFrozen) {
      res.status(400).json({ error: 'Account or card is currently locked/frozen.' });
      return;
    }

    if (sourceAccount.available < numericAmount) {
      res.status(400).json({
        error: `Insufficient available funds. Available: $${sourceAccount.available.toFixed(2)}, Requested: $${numericAmount.toFixed(2)}`,
      });
      return;
    }

    const nowIso = new Date().toISOString();
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const refCode = `TX-TRF-${Math.floor(100000 + Math.random() * 900000)}`;

    if (destinationType === 'INTERNAL') {
      const destAccount = db.findAccountById(targetAccountId);
      if (!destAccount) {
        res.status(404).json({ error: 'Destination account not found.' });
        return;
      }

      if (destAccount.id === sourceAccount.id) {
        res.status(400).json({ error: 'Source and destination accounts cannot be identical.' });
        return;
      }

      // Deduct from source
      sourceAccount.balance -= numericAmount;
      sourceAccount.available -= numericAmount;
      db.updateAccount(sourceAccount.id, {
        balance: sourceAccount.balance,
        available: sourceAccount.available,
      });

      // Credit destination
      destAccount.balance += numericAmount;
      destAccount.available += numericAmount;
      db.updateAccount(destAccount.id, {
        balance: destAccount.balance,
        available: destAccount.available,
      });

      // Create ledger transactions
      db.addTransaction({
        id: `tx_${Date.now()}_out`,
        accountId: sourceAccount.id,
        referenceId: `${refCode}-OUT`,
        amount: -numericAmount,
        currency: sourceAccount.currency,
        type: 'TRANSFER_OUT',
        status: 'COMPLETED',
        description: `Internal transfer to ${destAccount.name} (${destAccount.accountNumber.slice(-4)}) ${note ? `- ${note}` : ''}`,
        counterparty: destAccount.name,
        category: 'Internal Transfer',
        fee: 0,
        createdAt: nowIso,
      });

      db.addTransaction({
        id: `tx_${Date.now()}_in`,
        accountId: destAccount.id,
        referenceId: `${refCode}-IN`,
        amount: numericAmount,
        currency: destAccount.currency,
        type: 'TRANSFER_IN',
        status: 'COMPLETED',
        description: `Internal transfer from ${sourceAccount.name} (${sourceAccount.accountNumber.slice(-4)}) ${note ? `- ${note}` : ''}`,
        counterparty: sourceAccount.name,
        category: 'Internal Transfer',
        fee: 0,
        createdAt: nowIso,
      });

      db.addAuditLog({
        action: 'TRANSFER_EXECUTED',
        entity: 'Account',
        entityId: sourceAccount.id,
        details: `Internal transfer of $${numericAmount.toFixed(2)} from ${sourceAccount.accountNumber} to ${destAccount.accountNumber}.`,
        severity: 'INFO',
        ipAddress: ip,
        userAgent: req.headers['user-agent'],
        actorId: req.user.userId,
        actorEmail: req.user.email,
        actorRole: req.user.role,
      });

      res.json({
        message: 'Internal transfer executed successfully.',
        referenceId: refCode,
        transferredAmount: numericAmount,
        newSourceBalance: sourceAccount.balance,
      });
    } else {
      // External ACH / Wire Transfer
      const fee = numericAmount > 5000 ? 15.0 : 0.0;
      const totalDeduction = numericAmount + fee;

      if (sourceAccount.available < totalDeduction) {
        res.status(400).json({
          error: `Insufficient funds to cover transfer amount + processing fee ($${fee.toFixed(2)}).`,
        });
        return;
      }

      sourceAccount.balance -= totalDeduction;
      sourceAccount.available -= totalDeduction;
      db.updateAccount(sourceAccount.id, {
        balance: sourceAccount.balance,
        available: sourceAccount.available,
      });

      // If very large transfer, mark as pending verification for compliance
      const isLargeTransfer = numericAmount >= 50000;
      const txStatus = isLargeTransfer ? 'FLAGGED' : 'COMPLETED';

      db.addTransaction({
        id: `tx_${Date.now()}_ext`,
        accountId: sourceAccount.id,
        referenceId: refCode,
        amount: -numericAmount,
        currency: sourceAccount.currency,
        type: 'TRANSFER_OUT',
        status: txStatus,
        description: `Wire transfer to ${recipientName || 'External Recipient'} (${accountNumber ? accountNumber.slice(-4) : 'ACH'}) ${note ? `- ${note}` : ''}`,
        counterparty: recipientName || 'External Beneficiary',
        category: 'Wire Transfer',
        fee,
        metadata: {
          routingNumber,
          accountNumberMasked: accountNumber ? `***${accountNumber.slice(-4)}` : undefined,
          complianceFlag: isLargeTransfer ? 'High value wire requires AML review' : undefined,
        },
        createdAt: nowIso,
      });

      db.addAuditLog({
        action: isLargeTransfer ? 'SUSPICIOUS_TRANSFER_FLAGGED' : 'TRANSFER_EXECUTED',
        entity: 'Account',
        entityId: sourceAccount.id,
        details: `External transfer of $${numericAmount.toFixed(2)} to ${recipientName || 'External'} (fee: $${fee.toFixed(2)}). Status: ${txStatus}.`,
        severity: isLargeTransfer ? 'WARN' : 'INFO',
        ipAddress: ip,
        userAgent: req.headers['user-agent'],
        actorId: req.user.userId,
        actorEmail: req.user.email,
        actorRole: req.user.role,
      });

      res.json({
        message: isLargeTransfer
          ? 'Transfer submitted and held for compliance verification.'
          : 'Wire transfer processed successfully.',
        referenceId: refCode,
        transferredAmount: numericAmount,
        fee,
        status: txStatus,
        newSourceBalance: sourceAccount.balance,
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Transfer failed.' });
  }
});

/**
 * Toggle card freeze / lock
 */
router.post('/:id/toggle-freeze', (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return;
  const account = db.findAccountById(req.params.id);
  if (!account) {
    res.status(404).json({ error: 'Account not found.' });
    return;
  }

  if (account.userId !== req.user.userId && req.user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Access denied.' });
    return;
  }

  const updated = db.updateAccount(account.id, { isCardFrozen: !account.isCardFrozen });
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

  db.addAuditLog({
    action: updated?.isCardFrozen ? 'CARD_FROZEN' : 'CARD_UNFROZEN',
    entity: 'Account',
    entityId: account.id,
    details: `Debit card for account ${account.accountNumber} was ${updated?.isCardFrozen ? 'frozen' : 'unfrozen'}.`,
    severity: 'INFO',
    ipAddress: ip,
    userAgent: req.headers['user-agent'],
    actorId: req.user.userId,
    actorEmail: req.user.email,
    actorRole: req.user.role,
  });

  res.json({ message: `Card ${updated?.isCardFrozen ? 'locked' : 'unlocked'}.`, isCardFrozen: updated?.isCardFrozen });
});

/**
 * Get transactions for user
 */
router.get('/transactions/all', (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return;
  const { accountId, type, search } = req.query;

  let txs: TransactionRecord[] = [];
  if (req.user.role === 'ADMIN' && !accountId) {
    txs = db.listAllTransactions();
  } else if (accountId) {
    const acc = db.findAccountById(accountId as string);
    if (!acc || (acc.userId !== req.user.userId && req.user.role !== 'ADMIN')) {
      res.status(403).json({ error: 'Access denied to this account.' });
      return;
    }
    txs = db.listTransactionsByAccountId(accountId as string);
  } else {
    txs = db.listTransactionsForUser(req.user.userId);
  }

  if (type && type !== 'ALL') {
    txs = txs.filter((t) => t.type === type);
  }

  if (search) {
    const q = (search as string).toLowerCase();
    txs = txs.filter(
      (t) =>
        t.description.toLowerCase().includes(q) ||
        t.referenceId.toLowerCase().includes(q) ||
        (t.counterparty && t.counterparty.toLowerCase().includes(q))
    );
  }

  res.json({ transactions: txs });
});

/**
 * Get Account Requests (submitted requests)
 */
router.get('/requests', (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return;
  const user = db.findUserById(req.user.userId);
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const allApps = db.listApplications();
  const userApps = req.user.role === 'ADMIN' ? allApps : allApps.filter((a) => a.userId === req.user?.userId);
  res.json({ requests: userApps });
});

/**
 * Submit a new Account Request (from the /account-requests page)
 */
router.post('/requests', (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return;
    const { requestedAccountType } = req.body;
    const user = db.findUserById(req.user.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const typeStr = requestedAccountType || 'Personal';
    const nowIso = new Date().toISOString();
    const reqNumber = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;

    const newRequest = db.createApplication({
      id: `app_req_${Date.now()}`,
      userId: user.id,
      applicationNumber: reqNumber,
      status: 'SUBMITTED',
      requestedTier: typeStr === 'Business' ? 'TIER_3_INSTITUTIONAL' : 'TIER_2_VERIFIED',
      legalName: `${user.firstName} ${user.lastName}`,
      dateOfBirth: '1994-08-12',
      taxId: '***-**-8492',
      addressStreet: '100 Financial Way',
      addressCity: 'New York',
      addressState: 'NY',
      addressZip: '10005',
      country: 'United States',
      employmentStatus: `${typeStr} Account Holder`,
      annualIncome: 180000,
      sourceOfWealth: 'Employment & Capital Assets',
      documentType: 'Government Identity Proof',
      documentRef: `ID-${Math.floor(100000 + Math.random() * 900000)}`,
      riskScore: 12,
      adminNotes: `Account Request: ${typeStr} account awaiting administrator review.`,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    db.addAuditLog({
      action: 'ACCOUNT_REQUEST_SUBMITTED',
      entity: 'OnboardingApplication',
      entityId: newRequest.id,
      details: `User ${user.email} submitted account request (${typeStr}) - Reference: ${reqNumber}.`,
      severity: 'INFO',
      ipAddress: ip,
      userAgent: req.headers['user-agent'],
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
    });

    res.status(201).json({
      message: 'Account request submitted successfully. Awaiting administrator review.',
      request: newRequest,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to submit account request.' });
  }
});

/**
 * Record a new realistic transaction (Inflow/Outflow/Payment)
 */
router.post('/transactions', (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return;
    const { accountId, type, amount, description, counterparty, category } = req.body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({ error: 'Please enter a valid positive amount in ₹ Rupees.' });
      return;
    }

    if (!accountId) {
      res.status(400).json({ error: 'Please select an account.' });
      return;
    }

    const account = db.findAccountById(accountId);
    if (!account) {
      res.status(404).json({ error: 'Selected account was not found.' });
      return;
    }

    if (account.userId !== req.user.userId && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Access denied to this account.' });
      return;
    }

    const validTypes = ['DEPOSIT', 'TRANSFER_OUT', 'PAYMENT', 'INTEREST', 'TRANSFER_IN'];
    const txType = validTypes.includes(type) ? type : 'DEPOSIT';
    const isOutflow = txType === 'TRANSFER_OUT' || txType === 'PAYMENT';

    if (isOutflow && account.available < numAmount) {
      res.status(400).json({
        error: `Insufficient available funds. Available: ₹${account.available.toLocaleString('en-IN')}, Requested: ₹${numAmount.toLocaleString('en-IN')}`,
      });
      return;
    }

    // Live update ledger balance
    if (isOutflow) {
      account.balance -= numAmount;
      account.available -= numAmount;
    } else {
      account.balance += numAmount;
      account.available += numAmount;
    }

    db.updateAccount(account.id, {
      balance: account.balance,
      available: account.available,
    });

    const nowIso = new Date().toISOString();
    const refCode = `TX-INR-${Math.floor(100000 + Math.random() * 900000)}`;

    const newTx: TransactionRecord = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      accountId: account.id,
      referenceId: refCode,
      amount: isOutflow ? -numAmount : numAmount,
      currency: 'INR',
      type: txType as any,
      status: 'COMPLETED',
      description: (description || (isOutflow ? 'Payment Record' : 'Direct Deposit')).trim(),
      counterparty: (counterparty || (isOutflow ? 'Merchant / Vendor' : 'Bank Credit')).trim(),
      category: (category || (isOutflow ? 'Expenses' : 'Income')).trim(),
      fee: 0,
      createdAt: nowIso,
    };

    db.addTransaction(newTx);

    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    db.addAuditLog({
      action: 'TRANSACTION_RECORDED',
      entity: 'Transaction',
      entityId: newTx.id,
      details: `${txType} of ₹${numAmount.toLocaleString('en-IN')} recorded for ${account.name}.`,
      severity: 'INFO',
      ipAddress: ip,
      userAgent: req.headers['user-agent'],
      actorId: req.user.userId,
      actorEmail: req.user.email,
      actorRole: req.user.role,
    });

    res.status(201).json({
      message: 'Transaction successfully recorded.',
      transaction: newTx,
      updatedAccount: account,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to record transaction.' });
  }
});

export default router;
