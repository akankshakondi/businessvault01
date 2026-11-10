# BalanceVault – Financial Account Management System

Enterprise-grade multi-account banking and treasury management system built with React, Node.js/Express, PostgreSQL (Prisma ORM), JWT authentication, bcrypt password hashing, and Redis rate limiting.

Reference UI Design: [https://balance-vault.vercel.app/dashboard](https://balance-vault.vercel.app/dashboard)

---

## 🏛️ Project Architecture & Modules

The application is structured into 8 core modules:

1. **User Registration & Login**: Public user registration with automatic checking account issuance, bcrypt password hashing (10 rounds), and JWT session issuance. Public admin registration is strictly disabled.
2. **User Dashboard**: High-yield treasury portfolio net worth card, APY yield metrics (+14.2%), multi-currency accounts overview, cash-flow analytics breakdown, and recent transactions ledger with CSV export.
3. **Account Management**: Custody view for Checking, High-Yield Savings (4.85% APY), Equities, and Business accounts; ABA routing number copy, daily transfer limits adjustment, and instant debit card lock/freeze toggle.
4. **Account Onboarding (KYC)**: Multi-step regulatory onboarding wizard (legal identity, financial profile, employment, source of funds, tier selection, and document upload simulation).
5. **Admin Dashboard**: System-wide oversight displaying Total Assets Under Custody ($673.7K+), active accounts, 24h settlement volume, suspicious transaction queue, and Redis sliding-window telemetry.
6. **Admin User Management**: Complete user directory with status toggles (Active vs. Suspended), and Role-Based Access Control (RBAC) role reassignment.
7. **Application Approvals & Rejections**: Compliance review desk with synthetic document preview, automated AML risk score assessment (1-100), compliance notes, and automated checking account provisioning upon approval.
8. **Audit Logs**: Cryptographic, immutable security audit trail capturing every system event (`AUTH_LOGIN`, `TRANSFER_EXECUTED`, `USER_SUSPENDED`, `KYC_APPROVED`, `RBAC_ACCESS_DENIED`, `ADMIN_BOOTSTRAP`) with actor email, role, and IP address.

---

## 🚀 Building & Running the Project in Stages

### Stage 1: Frontend & Dashboard Interface
- **Components**: `src/components/UserDashboard.tsx`, `Sidebar.tsx`, `Header.tsx`, `AccountManagement.tsx`
- **Design System**: Dark navy sidebar (`#0B132B`), purple accents (`#7C3AED`, `#8B5CF6`), responsive cards, clean typography (Plus Jakarta Sans).
- **How to Run**:
  ```bash
  npm run dev
  ```
  Open `http://localhost:3000` to interact with the responsive dashboard, trigger demo persona switching, execute transfers, or inspect cards.

---

### Stage 2: Node.js & Express API Backend
- **Entry point**: `server.ts`
- **Routing**:
  - `POST /api/auth/login` & `POST /api/auth/register` (JWT tokens, bcrypt verification)
  - `POST /api/auth/bootstrap-admin` (one-time or token-secured admin initialization)
  - `GET /api/accounts` & `POST /api/accounts/transfer` (real-time balance deductions, transaction records)
  - `POST /api/onboarding/submit` (AML risk engine & application intake)
  - `GET /api/admin/metrics`, `GET /api/admin/users`, `POST /api/admin/applications/:id/review`
- **Rate Limiting**: Sliding-window rate limiter in `server/rateLimiter.ts` emitting `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers.
- **How to Test API**:
  ```bash
  curl http://localhost:3000/api/health
  ```

---

### Stage 3: PostgreSQL Database & Prisma ORM Migrations
- **Prisma Schema**: `prisma/schema.prisma`
- **Migration SQL**: `prisma/migrations/20261110000001_init/migration.sql`
- **Models**: `User`, `Account`, `Transaction`, `OnboardingApplication`, `AuditLog`
- **How to Run Migrations in PostgreSQL**:
  ```bash
  # Configure DATABASE_URL in .env:
  # DATABASE_URL="postgresql://user:password@localhost:5432/balancevault?schema=public"

  npx prisma migrate dev --name init
  npx prisma generate
  ```

---

### Stage 4: Secure First-Admin Bootstrap & RBAC Security Verification
- **Policy**: Public registration of `ADMIN` accounts is strictly blocked.
- **Bootstrap CLI**: `scripts/bootstrap-admin.ts`
- **How to Run Admin Bootstrap**:
  ```bash
  npx tsx scripts/bootstrap-admin.ts \
    --email=admin.sarah@balancevault.com \
    --first=Sarah \
    --last=Chen \
    --pass=AdminSecurePassword123!
  ```
- **RBAC Enforcement**: Calling any `/api/admin/*` endpoint as a user without `ADMIN` or `COMPLIANCE_OFFICER` returns HTTP 403 Forbidden and writes a `RBAC_ACCESS_DENIED` entry to the audit log.

---

## 🔑 Pre-Seeded Demo Credentials

For testing all modules instantly:

| Persona | Email | Password | Role | Features |
|---|---|---|---|---|
| **Alex Morgan** | `alex.morgan@balancevault.com` | `User123!` | `USER` | Checking, Savings (4.85% APY), Wire Transfers, KYC Tier 2 |
| **Sarah Chen** | `sarah.chen@balancevault.com` | `Admin123!` | `ADMIN` | User Directory, Role Reassignment, Suspend Accounts, Redis Monitor |
| **Marcus Vance** | `marcus.vance@balancevault.com` | `Compliance123!` | `COMPLIANCE_OFFICER` | Review KYC Queue, Approve/Reject Applications, Audit Logs |

*Use the 1-click Quick Persona Switcher in the top header or sidebar to toggle between roles without manual typing.*
