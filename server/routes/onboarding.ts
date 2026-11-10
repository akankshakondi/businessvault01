import { Router, Response } from 'express';
import { db } from '../db.ts';
import { authenticateToken, AuthenticatedRequest } from '../auth.ts';
import { createRateLimiter } from '../rateLimiter.ts';
import { OnboardingApplicationRecord, KycTier } from '../types.ts';

const router = Router();

router.use(createRateLimiter({ windowMs: 60000, maxRequests: 60, prefix: 'onboarding_api' }));
router.use(authenticateToken);

/**
 * Get current user onboarding / KYC status
 */
router.get('/status', (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return;
  const user = db.findUserById(req.user.userId);
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const application = db.findApplicationByUserId(user.id);
  res.json({
    userStatus: user.status,
    currentTier: user.kycTier,
    application: application || null,
  });
});

/**
 * Submit onboarding KYC application
 */
router.post('/submit', (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return;
    const {
      legalName,
      dateOfBirth,
      taxId,
      addressStreet,
      addressCity,
      addressState,
      addressZip,
      country = 'United States',
      employmentStatus,
      annualIncome,
      sourceOfWealth,
      documentType,
      documentRef,
      requestedTier = 'TIER_2_VERIFIED',
    } = req.body;

    if (!legalName || !dateOfBirth || !taxId || !addressStreet || !employmentStatus || !annualIncome || !documentType) {
      res.status(400).json({ error: 'All primary KYC information and verification fields are required.' });
      return;
    }

    const incomeNumber = parseFloat(annualIncome);
    if (isNaN(incomeNumber) || incomeNumber <= 0) {
      res.status(400).json({ error: 'Annual income must be a valid positive amount.' });
      return;
    }

    // Calculate synthetic AML risk score (1-100; lower is safer)
    let riskScore = 12;
    if (incomeNumber > 1000000) riskScore += 10;
    if (requestedTier === 'TIER_3_INSTITUTIONAL') riskScore += 15;
    if (documentType.toLowerCase().includes('foreign')) riskScore += 25;
    if (sourceOfWealth.toLowerCase().includes('crypto') || sourceOfWealth.toLowerCase().includes('offshore')) riskScore += 20;

    const appId = `app_kyc_${Date.now()}`;
    const appNumber = `KYC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowIso = new Date().toISOString();

    // Mask tax ID for security (keep last 4)
    const sanitizedTaxId = taxId.replace(/\D/g, '');
    const maskedTaxId = sanitizedTaxId.length >= 4 ? `***-**-${sanitizedTaxId.slice(-4)}` : '***-**-0000';

    const newApplication: OnboardingApplicationRecord = {
      id: appId,
      userId: req.user.userId,
      applicationNumber: appNumber,
      status: 'SUBMITTED',
      requestedTier: requestedTier as KycTier,
      legalName: legalName.trim(),
      dateOfBirth,
      taxId: maskedTaxId,
      addressStreet: addressStreet.trim(),
      addressCity: addressCity.trim(),
      addressState: addressState.trim(),
      addressZip: addressZip.trim(),
      country,
      employmentStatus: employmentStatus.trim(),
      annualIncome: incomeNumber,
      sourceOfWealth: sourceOfWealth.trim(),
      documentType,
      documentRef: documentRef || `${documentType.toUpperCase()}-SYN-${Math.floor(100000 + Math.random() * 900000)}`,
      riskScore,
      adminNotes: riskScore > 50 ? 'Automated Risk Engine: Elevated compliance scrutiny recommended.' : 'Automated Risk Engine: Standard tier clearance.',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    db.createApplication(newApplication);

    // Update user status
    db.updateUser(req.user.userId, { status: 'PENDING_VERIFICATION' });

    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    db.addAuditLog({
      action: 'KYC_APPLICATION_SUBMITTED',
      entity: 'OnboardingApplication',
      entityId: newApplication.id,
      details: `User submitted KYC verification application ${appNumber} for ${requestedTier}. Risk score: ${riskScore}/100.`,
      severity: riskScore > 50 ? 'WARN' : 'INFO',
      ipAddress: ip,
      userAgent: req.headers['user-agent'],
      actorId: req.user.userId,
      actorEmail: req.user.email,
      actorRole: req.user.role,
    });

    res.status(201).json({
      message: 'KYC application submitted successfully. Pending compliance review.',
      application: newApplication,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to submit onboarding application.' });
  }
});

export default router;
