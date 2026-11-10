import React, { useState } from 'react';
import { X, Database, Terminal, FileCode, Copy, Check, Server, Shield } from 'lucide-react';

interface DatabaseSchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseSchemaModal: React.FC<DatabaseSchemaModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'prisma' | 'sql' | 'bootstrap' | 'architecture'>('prisma');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const prismaSchemaCode = `// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  USER
  ADMIN
  COMPLIANCE_OFFICER
}

enum UserStatus {
  ACTIVE
  SUSPENDED
  PENDING_VERIFICATION
}

enum AccountType {
  CHECKING
  SAVINGS
  INVESTMENT
  BUSINESS
}

model User {
  id           String                 @id @default(uuid())
  email        String                 @unique
  passwordHash String
  firstName    String
  lastName     String
  role         Role                   @default(USER)
  status       UserStatus             @default(PENDING_VERIFICATION)
  kycTier      KycTier                @default(TIER_1_BASIC)
  accounts     Account[]
  applications OnboardingApplication[]
  createdAt    DateTime               @default(now())
}

model Account {
  id            String        @id @default(uuid())
  accountNumber String        @unique
  routingNumber String        @default("021000021")
  name          String
  type          AccountType   @default(CHECKING)
  currency      String        @default("USD")
  balance       Decimal       @db.Decimal(14, 2)
  available     Decimal       @db.Decimal(14, 2)
  status        AccountStatus @default(ACTIVE)
  interestRate  Decimal       @default(0.0000)
  dailyLimit    Decimal       @default(5000.00)
  userId        String
  user          User          @relation(fields: [userId], references: [id])
  transactions  Transaction[]
}

model Transaction {
  id          String            @id @default(uuid())
  referenceId String            @unique
  amount      Decimal           @db.Decimal(14, 2)
  type        TransactionType
  status      TransactionStatus @default(COMPLETED)
  description String
  accountId   String
  account     Account           @relation(fields: [accountId], references: [id])
  createdAt   DateTime          @default(now())
}

model AuditLog {
  id         String   @id @default(uuid())
  action     String
  entity     String
  details    String
  severity   String
  ipAddress  String
  actorEmail String?
  createdAt  DateTime @default(now())
}`;

  const sqlMigrationCode = `-- PostgreSQL Migration: 20261110000001_init/migration.sql
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'COMPLIANCE_OFFICER');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION');
CREATE TYPE "AccountType" AS ENUM ('CHECKING', 'SAVINGS', 'INVESTMENT', 'BUSINESS');
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT', 'FEE', 'INTEREST');
CREATE TYPE "TransactionStatus" AS ENUM ('COMPLETED', 'PENDING', 'FAILED', 'FLAGGED');

CREATE TABLE "User" (
    "id" TEXT PRIMARY KEY,
    "email" TEXT UNIQUE NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "kycTier" TEXT NOT NULL DEFAULT 'TIER_1_BASIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Account" (
    "id" TEXT PRIMARY KEY,
    "accountNumber" TEXT UNIQUE NOT NULL,
    "routingNumber" TEXT NOT NULL DEFAULT '021000021',
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "balance" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "available" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "userId" TEXT REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE "Transaction" (
    "id" TEXT PRIMARY KEY,
    "referenceId" TEXT UNIQUE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "type" "TransactionType" NOT NULL,
    "description" TEXT NOT NULL,
    "accountId" TEXT REFERENCES "Account"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "AuditLog" (
    "id" TEXT PRIMARY KEY,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "actorEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);`;

  const bootstrapCode = `# Stage 1: Install Dependencies
npm install

# Stage 2: Database Setup & Migration (PostgreSQL)
npx prisma migrate dev --name init
npx prisma generate

# Stage 3: Secure First-Admin CLI Bootstrap
# (Public registration of admins is strictly disabled by policy)
npx tsx scripts/bootstrap-admin.ts \\
  --email=admin.sarah@balancevault.com \\
  --first=Sarah \\
  --last=Chen \\
  --pass=AdminSecurePassword123!

# Stage 4: Run Application Dev Server
npm run dev
# Server running at http://0.0.0.0:3000`;

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
      <div className="flex h-[88vh] w-full max-w-4xl flex-col rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-purple-600 p-2 text-white">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Database Schema & Architecture Documentation</h3>
              <p className="text-xs text-slate-500">Prisma ORM • PostgreSQL DDL Migrations • First-Admin Bootstrap</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 px-6 bg-white gap-2">
          <button
            onClick={() => setActiveTab('prisma')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'prisma'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            prisma/schema.prisma
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'sql'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            PostgreSQL DDL Migration
          </button>
          <button
            onClick={() => setActiveTab('bootstrap')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'bootstrap'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Admin Bootstrap CLI
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'architecture'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Stack & Stages
          </button>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950 text-slate-200 font-mono text-xs">
          {activeTab === 'prisma' && (
            <div>
              <div className="flex justify-between items-center mb-3 text-slate-400 font-sans text-xs">
                <span>Prisma 5 / PostgreSQL Relational Models</span>
                <button
                  onClick={() => copyText(prismaSchemaCode)}
                  className="flex items-center gap-1 text-purple-400 hover:text-purple-300"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>Copy Code</span>
                </button>
              </div>
              <pre className="overflow-x-auto leading-relaxed">{prismaSchemaCode}</pre>
            </div>
          )}

          {activeTab === 'sql' && (
            <div>
              <div className="flex justify-between items-center mb-3 text-slate-400 font-sans text-xs">
                <span>PostgreSQL Migration Script</span>
                <button
                  onClick={() => copyText(sqlMigrationCode)}
                  className="flex items-center gap-1 text-purple-400 hover:text-purple-300"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>Copy SQL</span>
                </button>
              </div>
              <pre className="overflow-x-auto leading-relaxed">{sqlMigrationCode}</pre>
            </div>
          )}

          {activeTab === 'bootstrap' && (
            <div>
              <div className="flex justify-between items-center mb-3 text-slate-400 font-sans text-xs">
                <span>CLI Execution & Run Instructions</span>
                <button
                  onClick={() => copyText(bootstrapCode)}
                  className="flex items-center gap-1 text-purple-400 hover:text-purple-300"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>Copy Commands</span>
                </button>
              </div>
              <pre className="overflow-x-auto leading-relaxed text-emerald-400">{bootstrapCode}</pre>
            </div>
          )}

          {activeTab === 'architecture' && (
            <div className="font-sans space-y-4 text-xs text-slate-300">
              <h4 className="text-sm font-bold text-white">BalanceVault 4-Stage Architecture</h4>

              <div className="rounded-2xl bg-slate-900 p-4 border border-slate-800 space-y-2">
                <span className="font-bold text-purple-400">Stage 1: Frontend (React 19 + Tailwind v4)</span>
                <p className="text-slate-400">
                  Built to match https://balance-vault.vercel.app/dashboard with dark navy sidebar (#0B132B), purple accents,
                  responsive financial cards, account limits, and instant persona switching.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900 p-4 border border-slate-800 space-y-2">
                <span className="font-bold text-purple-400">Stage 2: Backend (Node.js + Express)</span>
                <p className="text-slate-400">
                  Standard Express server mounted via server.ts on port 3000. Implements REST APIs for authentication,
                  account provisioning, inter-account transfers with balance verification, and KYC onboarding.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900 p-4 border border-slate-800 space-y-2">
                <span className="font-bold text-purple-400">Stage 3: Security & Rate Limiting</span>
                <p className="text-slate-400">
                  JWT authentication with 24h expiration, bcrypt password hashing (10 rounds), Redis-compatible sliding-window
                  rate limiting, and strict RBAC checking preventing unauthorized role escalation.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900 p-4 border border-slate-800 space-y-2">
                <span className="font-bold text-purple-400">Stage 4: Database & Audit Trail</span>
                <p className="text-slate-400">
                  PostgreSQL schema managed via Prisma ORM with initial migration SQL. Immutable audit trail logging
                  every login, role change, money transfer, and KYC decision with actor email, role, and client IP.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
