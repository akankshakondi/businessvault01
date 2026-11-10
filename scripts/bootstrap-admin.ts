/**
 * BalanceVault – First Admin CLI Bootstrap Script
 *
 * Usage:
 *   npx tsx scripts/bootstrap-admin.ts --email=admin@balancevault.com --first=Root --last=Admin --pass=AdminPassword123!
 */

import { db } from '../server/db.ts';
import { hashPassword } from '../server/auth.ts';
import { UserRecord } from '../server/types.ts';

async function main() {
  const args = process.argv.slice(2);
  const getArg = (name: string) => {
    const found = args.find((a) => a.startsWith(`--${name}=`));
    return found ? found.split('=')[1] : null;
  };

  const email = getArg('email') || 'admin.root@balancevault.com';
  const firstName = getArg('first') || 'Security';
  const lastName = getArg('last') || 'Administrator';
  const password = getArg('pass') || 'VaultSecureRoot2026!';

  console.log('--------------------------------------------------');
  console.log('BalanceVault Secure Root Admin Provisioning Script');
  console.log('--------------------------------------------------');

  const existing = db.findUserByEmail(email);
  if (existing) {
    console.error(`[ERROR] User with email ${email} already exists.`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const nowIso = new Date().toISOString();
  const adminId = `usr_admin_root_${Date.now()}`;

  const adminUser: UserRecord = {
    id: adminId,
    email,
    passwordHash,
    firstName,
    lastName,
    role: 'ADMIN',
    status: 'ACTIVE',
    kycTier: 'TIER_3_INSTITUTIONAL',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  db.createUser(adminUser);

  db.addAuditLog({
    action: 'ADMIN_BOOTSTRAP_CLI',
    entity: 'User',
    entityId: adminUser.id,
    details: `Root admin account ${email} provisioned directly via CLI execution.`,
    severity: 'INFO',
    ipAddress: '127.0.0.1 (CLI)',
    userAgent: 'BalanceVault-AdminCLI/1.0',
    actorId: adminUser.id,
    actorEmail: adminUser.email,
    actorRole: 'ADMIN',
  });

  console.log(`[SUCCESS] Admin account created successfully!`);
  console.log(`Email:    ${email}`);
  console.log(`Role:     ADMIN`);
  console.log(`Status:   ACTIVE`);
  console.log(`User ID:  ${adminId}`);
  console.log('--------------------------------------------------');
  console.log('Keep these credentials secure. Public admin registration is disabled.');
}

main().catch((err) => {
  console.error('[FATAL] Bootstrap script failed:', err);
  process.exit(1);
});
