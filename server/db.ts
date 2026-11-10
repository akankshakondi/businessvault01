import bcrypt from 'bcryptjs';
import {
  UserRecord,
  AccountRecord,
  TransactionRecord,
  OnboardingApplicationRecord,
  AuditLogRecord,
  Role,
  UserStatus,
  KycTier,
} from './types.ts';

// Precomputed bcrypt hashes for fast deterministic bootstrap
// 'User123!' -> $2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1p0u3b8Yk7fD9x9lXmE1wM8M8VmV4u
// 'Admin123!' -> $2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
const USER_HASH = bcrypt.hashSync('User123!', 10);
const ADMIN_HASH = bcrypt.hashSync('Admin123!', 10);
const COMPLIANCE_HASH = bcrypt.hashSync('Compliance123!', 10);

class InMemoryDatabase {
  public users: Map<string, UserRecord> = new Map();
  public accounts: Map<string, AccountRecord> = new Map();
  public transactions: Map<string, TransactionRecord> = new Map();
  public applications: Map<string, OnboardingApplicationRecord> = new Map();
  public auditLogs: AuditLogRecord[] = [];

  constructor() {
    this.seedDefaults();
  }

  public seedDefaults() {
    this.users.clear();
    this.accounts.clear();
    this.transactions.clear();
    this.applications.clear();
    this.auditLogs = [];

    const now = new Date();
    const isoNow = now.toISOString();

    // 1. Fresh Users for Kondi Akanksha and Root Admin
    const userAkanksha: UserRecord = {
      id: 'usr_akanksha_001',
      email: 'akankshakondi4@gmail.com',
      passwordHash: USER_HASH,
      firstName: 'Kondi',
      lastName: 'Akanksha',
      phone: '+91 98765 43210',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      role: 'USER',
      status: 'ACTIVE',
      kycTier: 'TIER_2_VERIFIED',
      createdAt: isoNow,
      updatedAt: isoNow,
    };

    const adminUser: UserRecord = {
      id: 'usr_admin_001',
      email: 'admin@balancevault.com',
      passwordHash: ADMIN_HASH,
      firstName: 'System',
      lastName: 'Administrator',
      phone: '+91 98111 22233',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
      role: 'ADMIN',
      status: 'ACTIVE',
      kycTier: 'TIER_3_INSTITUTIONAL',
      createdAt: isoNow,
      updatedAt: isoNow,
    };

    this.users.set(userAkanksha.id, userAkanksha);
    this.users.set(adminUser.id, adminUser);

    // 2. Fresh INR Accounts for Kondi Akanksha
    const accSavings: AccountRecord = {
      id: 'acc_svg_01',
      userId: userAkanksha.id,
      accountNumber: '9021 4482 1092',
      routingNumber: 'BVLT0002100',
      name: 'Primary Savings Vault',
      type: 'SAVINGS',
      currency: 'INR',
      balance: 150000.0,
      available: 150000.0,
      status: 'ACTIVE',
      interestRate: 0.055, // 5.5% APY
      dailyLimit: 200000.0,
      isCardFrozen: false,
      createdAt: isoNow,
      updatedAt: isoNow,
    };

    const accCurrent: AccountRecord = {
      id: 'acc_chk_02',
      userId: userAkanksha.id,
      accountNumber: '4820 9912 3341',
      routingNumber: 'BVLT0002100',
      name: 'Operating Current Account',
      type: 'CHECKING',
      currency: 'INR',
      balance: 85000.0,
      available: 85000.0,
      status: 'ACTIVE',
      interestRate: 0.0,
      dailyLimit: 500000.0,
      isCardFrozen: false,
      createdAt: isoNow,
      updatedAt: isoNow,
    };

    this.accounts.set(accSavings.id, accSavings);
    this.accounts.set(accCurrent.id, accCurrent);

    // 3. Transactions start completely clean and empty as requested
    // (Users can easily record realistic transactions via the "Add Transaction" UI)

    // 4. Initial Audit Logs for fresh system
    const initialLogs: AuditLogRecord[] = [
      {
        id: 'aud_001',
        action: 'SYSTEM_INITIALIZED',
        entity: 'SystemSecurity',
        details: 'BalanceVault Indian Rupee Ledger core initialized with dual-key authentication.',
        severity: 'INFO',
        ipAddress: '127.0.0.1',
        userAgent: 'BalanceVault-Engine/v2.0 Linux-x86_64',
        createdAt: isoNow,
        actorId: adminUser.id,
        actorEmail: adminUser.email,
        actorRole: 'ADMIN',
      },
      {
        id: 'aud_002',
        action: 'ACCOUNT_PROVISIONED',
        entity: 'Account',
        entityId: accSavings.id,
        details: `Primary Savings Vault (${accSavings.accountNumber}) provisioned in INR for holder Kondi Akanksha.`,
        severity: 'INFO',
        ipAddress: '127.0.0.1',
        userAgent: 'BalanceVault-Engine/v2.0',
        createdAt: isoNow,
        actorId: userAkanksha.id,
        actorEmail: userAkanksha.email,
        actorRole: 'USER',
      },
    ];

    this.auditLogs = initialLogs;
  }

  // --- User Operations ---
  public findUserByEmail(email: string): UserRecord | undefined {
    return Array.from(this.users.values()).find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );
  }

  public findUserById(id: string): UserRecord | undefined {
    return this.users.get(id);
  }

  public createUser(user: UserRecord): UserRecord {
    this.users.set(user.id, user);
    return user;
  }

  public updateUser(id: string, updates: Partial<UserRecord>): UserRecord | undefined {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...updates, updatedAt: new Date().toISOString() };
    this.users.set(id, updated);
    return updated;
  }

  public listUsers(): UserRecord[] {
    return Array.from(this.users.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // --- Account Operations ---
  public findAccountsByUserId(userId: string): AccountRecord[] {
    return Array.from(this.accounts.values()).filter((a) => a.userId === userId);
  }

  public findAccountById(id: string): AccountRecord | undefined {
    return this.accounts.get(id);
  }

  public createAccount(account: AccountRecord): AccountRecord {
    this.accounts.set(account.id, account);
    return account;
  }

  public updateAccount(id: string, updates: Partial<AccountRecord>): AccountRecord | undefined {
    const acc = this.accounts.get(id);
    if (!acc) return undefined;
    const updated = { ...acc, ...updates, updatedAt: new Date().toISOString() };
    this.accounts.set(id, updated);
    return updated;
  }

  public listAllAccounts(): AccountRecord[] {
    return Array.from(this.accounts.values());
  }

  // --- Transaction Operations ---
  public listTransactionsByAccountId(accountId: string): TransactionRecord[] {
    return Array.from(this.transactions.values())
      .filter((t) => t.accountId === accountId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public listTransactionsForUser(userId: string): TransactionRecord[] {
    const userAccIds = new Set(this.findAccountsByUserId(userId).map((a) => a.id));
    return Array.from(this.transactions.values())
      .filter((t) => userAccIds.has(t.accountId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public listAllTransactions(): TransactionRecord[] {
    return Array.from(this.transactions.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public addTransaction(tx: TransactionRecord): TransactionRecord {
    this.transactions.set(tx.id, tx);
    return tx;
  }

  // --- Onboarding Application Operations ---
  public findApplicationById(id: string): OnboardingApplicationRecord | undefined {
    return this.applications.get(id);
  }

  public findApplicationByUserId(userId: string): OnboardingApplicationRecord | undefined {
    return Array.from(this.applications.values())
      .filter((a) => a.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  }

  public listApplications(): OnboardingApplicationRecord[] {
    return Array.from(this.applications.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public createApplication(app: OnboardingApplicationRecord): OnboardingApplicationRecord {
    this.applications.set(app.id, app);
    return app;
  }

  public updateApplication(
    id: string,
    updates: Partial<OnboardingApplicationRecord>
  ): OnboardingApplicationRecord | undefined {
    const app = this.applications.get(id);
    if (!app) return undefined;
    const updated = { ...app, ...updates, updatedAt: new Date().toISOString() };
    this.applications.set(id, updated);
    return updated;
  }

  // --- Audit Log Operations ---
  public addAuditLog(log: Omit<AuditLogRecord, 'id' | 'createdAt'>): AuditLogRecord {
    const record: AuditLogRecord = {
      ...log,
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    this.auditLogs.unshift(record); // Newest first
    if (this.auditLogs.length > 500) {
      this.auditLogs.pop();
    }
    return record;
  }

  public listAuditLogs(): AuditLogRecord[] {
    return [...this.auditLogs];
  }
}

export const db = new InMemoryDatabase();
