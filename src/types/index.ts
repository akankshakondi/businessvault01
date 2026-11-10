export type Role = 'USER' | 'ADMIN' | 'COMPLIANCE_OFFICER';

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';

export type AccountType = 'CHECKING' | 'SAVINGS' | 'INVESTMENT' | 'BUSINESS';

export type AccountStatus = 'ACTIVE' | 'FROZEN' | 'CLOSED';

export type TransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'FEE' | 'INTEREST';

export type TransactionStatus = 'COMPLETED' | 'PENDING' | 'FAILED' | 'FLAGGED';

export type ApplicationStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

export type KycTier = 'TIER_1_BASIC' | 'TIER_2_VERIFIED' | 'TIER_3_INSTITUTIONAL';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  role: Role;
  status: UserStatus;
  kycTier: KycTier;
  createdAt: string;
  updatedAt: string;
  accountsCount?: number;
  totalBalance?: number;
}

export interface Account {
  id: string;
  userId: string;
  accountNumber: string;
  routingNumber: string;
  name: string;
  type: AccountType;
  currency: string;
  balance: number;
  available: number;
  status: AccountStatus;
  interestRate: number;
  dailyLimit: number;
  isCardFrozen: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  referenceId: string;
  amount: number;
  currency: string;
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  counterparty?: string;
  category?: string;
  metadata?: Record<string, any>;
  fee: number;
  createdAt: string;
}

export interface OnboardingApplication {
  id: string;
  userId: string;
  applicationNumber: string;
  status: ApplicationStatus;
  requestedTier: KycTier;
  legalName: string;
  dateOfBirth: string;
  taxId: string;
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
  country: string;
  employmentStatus: string;
  annualIncome: number;
  sourceOfWealth: string;
  documentType: string;
  documentRef: string;
  riskScore: number;
  adminNotes?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  details: string;
  severity: 'INFO' | 'WARN' | 'SECURITY_ALERT' | 'CRITICAL';
  ipAddress: string;
  userAgent?: string;
  createdAt: string;
  actorId?: string;
  actorEmail?: string;
  actorRole?: Role;
}

export interface AdminMetrics {
  totalAssetsUnderCustody: number;
  activeAccountsCount: number;
  totalUsersCount: number;
  pendingKycCount: number;
  flaggedTxCount: number;
  volume24h: number;
  totalTransactionsCount: number;
}

export interface RedisMetrics {
  engine: string;
  activeKeysCount: number;
  totalRequestsTracked: number;
  totalBlockedRequests: number;
  redisAvgLatencyMs: number;
  sampleKeys: Array<{
    key: string;
    hits: number;
    expiresInSeconds: number;
  }>;
}
