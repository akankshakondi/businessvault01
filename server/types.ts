export type Role = 'USER' | 'ADMIN' | 'COMPLIANCE_OFFICER';

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';

export type AccountType = 'CHECKING' | 'SAVINGS' | 'INVESTMENT' | 'BUSINESS';

export type AccountStatus = 'ACTIVE' | 'FROZEN' | 'CLOSED';

export type TransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'FEE' | 'INTEREST';

export type TransactionStatus = 'COMPLETED' | 'PENDING' | 'FAILED' | 'FLAGGED';

export type ApplicationStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

export type KycTier = 'TIER_1_BASIC' | 'TIER_2_VERIFIED' | 'TIER_3_INSTITUTIONAL';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  role: Role;
  status: UserStatus;
  kycTier: KycTier;
  createdAt: string;
  updatedAt: string;
}

export interface AccountRecord {
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
  interestRate: number; // e.g. 0.048 for 4.8%
  dailyLimit: number;
  isCardFrozen: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionRecord {
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

export interface OnboardingApplicationRecord {
  id: string;
  userId: string;
  applicationNumber: string;
  status: ApplicationStatus;
  requestedTier: KycTier;
  legalName: string;
  dateOfBirth: string;
  taxId: string; // masked
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

export interface AuditLogRecord {
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
