import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Upload,
  ArrowRight,
  ArrowLeft,
  Building,
  User,
  CreditCard,
  Lock,
} from 'lucide-react';
import { OnboardingApplication, KycTier } from '../types/index.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const AccountOnboarding: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [existingApp, setExistingApp] = useState<OnboardingApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    legalName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
    dateOfBirth: '1992-06-15',
    taxId: '***-**-4819',
    addressStreet: '100 Montgomery St, Suite 1800',
    addressCity: 'San Francisco',
    addressState: 'CA',
    addressZip: '94104',
    country: 'United States',
    employmentStatus: 'Technology Executive / Founder',
    annualIncome: '350000',
    sourceOfWealth: 'Executive Compensation & Capital Gains',
    documentType: 'US Passport',
    requestedTier: 'TIER_2_VERIFIED' as KycTier,
  });

  const loadStatus = async () => {
    const token = localStorage.getItem('bv_auth_token');
    if (!token || !user) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const res = await api.onboarding.getStatus();
      setExistingApp(res.application);
    } catch (err: any) {
      console.warn('Onboarding status fetch notification:', err?.message || err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadStatus();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await api.onboarding.submit(formData);
      setExistingApp(res.application);
      await refreshUser();
    } catch (err: any) {
      setError(err.message || 'Failed to submit application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Top Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#0B132B] via-[#151D3B] to-[#251A4A] p-6 sm:p-8 text-white border border-slate-800 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600/30 text-purple-300 ring-1 ring-purple-500/50">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Enterprise KYC Verification</h2>
              <p className="text-xs text-purple-300/80">
                Regulatory AML compliance, identity verification, and tier management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto rounded-xl bg-slate-800/80 px-3.5 py-1.5 text-xs border border-slate-700">
            <span className="text-slate-400">Current Level:</span>
            <span className="font-bold text-purple-400 font-mono">
              {user?.kycTier ? user.kycTier.replace('_', ' ') : 'Tier 1'}
            </span>
          </div>
        </div>
      </div>

      {/* Existing Application Tracker (if already submitted) */}
      {existingApp ? (
        <div className="rounded-3xl bg-white p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Application Tracking
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-1">{existingApp.applicationNumber}</h3>
              <p className="text-xs text-slate-500">
                Submitted on {new Date(existingApp.createdAt).toLocaleDateString()} for {existingApp.requestedTier}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  existingApp.status === 'APPROVED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : existingApp.status === 'REJECTED'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {existingApp.status === 'APPROVED' && 'APPROVED & VERIFIED'}
                {existingApp.status === 'REJECTED' && 'APPLICATION REJECTED'}
                {(existingApp.status === 'SUBMITTED' || existingApp.status === 'UNDER_REVIEW') && 'UNDER COMPLIANCE REVIEW'}
              </span>
            </div>
          </div>

          {/* Stepper visualization */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-100">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
                <CheckCircle2 className="h-4 w-4" />
                <span>1. Identity Submission</span>
              </div>
              <p className="text-[11px] text-emerald-600 mt-1">Verified via {existingApp.documentType}</p>
            </div>

            <div
              className={`rounded-2xl p-4 border ${
                existingApp.status === 'APPROVED'
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                  : 'bg-amber-50 border-amber-100 text-amber-800'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs">
                {existingApp.status === 'APPROVED' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
                <span>2. AML Risk Screening</span>
              </div>
              <p className="text-[11px] mt-1 opacity-90">
                Automated Risk Score: {existingApp.riskScore}/100 ({existingApp.riskScore < 30 ? 'Low Risk' : 'Scrutiny'})
              </p>
            </div>

            <div
              className={`rounded-2xl p-4 border ${
                existingApp.status === 'APPROVED'
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                  : existingApp.status === 'REJECTED'
                  ? 'bg-rose-50 border-rose-100 text-rose-800'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs">
                {existingApp.status === 'APPROVED' && <CheckCircle2 className="h-4 w-4" />}
                {existingApp.status === 'REJECTED' && <AlertTriangle className="h-4 w-4" />}
                {existingApp.status !== 'APPROVED' && existingApp.status !== 'REJECTED' && <Clock className="h-4 w-4" />}
                <span>3. Officer Final Determination</span>
              </div>
              <p className="text-[11px] mt-1 opacity-90">
                {existingApp.reviewedBy ? `Signed by ${existingApp.reviewedBy}` : 'Pending assignment'}
              </p>
            </div>
          </div>

          {/* Admin notes */}
          {existingApp.adminNotes && (
            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 text-xs">
              <span className="font-bold text-slate-700 block mb-1">Compliance Notes:</span>
              <p className="text-slate-600">{existingApp.adminNotes}</p>
            </div>
          )}

          {existingApp.status === 'REJECTED' && (
            <button
              onClick={() => setExistingApp(null)}
              className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700"
            >
              Submit New Application
            </button>
          )}
        </div>
      ) : (
        /* Multi-step Application Wizard */
        <div className="rounded-3xl bg-white p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          {/* Step Progress indicators */}
          <div className="flex items-center justify-between pb-6 border-b border-slate-100">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    step === s
                      ? 'bg-purple-600 text-white'
                      : step > s
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {step > s ? '✓' : s}
                </span>
                <span className={`text-xs font-semibold hidden sm:inline ${step === s ? 'text-slate-900' : 'text-slate-400'}`}>
                  {s === 1 && 'Legal Identity'}
                  {s === 2 && 'Financial Profile'}
                  {s === 3 && 'Tier & Documents'}
                </span>
              </div>
            ))}
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 1 && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-900">Step 1: Legal Name & Residential Address</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full Legal Name</label>
                    <input
                      type="text"
                      required
                      value={formData.legalName}
                      onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-purple-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      required
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-purple-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tax ID / SSN</label>
                    <input
                      type="text"
                      required
                      value={formData.taxId}
                      onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-mono focus:border-purple-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Country of Primary Tax Residence</label>
                    <input
                      type="text"
                      required
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-purple-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Street Address</label>
                  <input
                    type="text"
                    required
                    value={formData.addressStreet}
                    onChange={(e) => setFormData({ ...formData, addressStreet: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-purple-500 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      required
                      value={formData.addressCity}
                      onChange={(e) => setFormData({ ...formData, addressCity: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-purple-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                    <input
                      type="text"
                      required
                      value={formData.addressState}
                      onChange={(e) => setFormData({ ...formData, addressState: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-purple-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Zip Code</label>
                    <input
                      type="text"
                      required
                      value={formData.addressZip}
                      onChange={(e) => setFormData({ ...formData, addressZip: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-purple-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-purple-700"
                  >
                    <span>Next: Financial Profile</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-900">Step 2: Source of Wealth & Employment Profile</h4>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Current Profession / Title</label>
                  <input
                    type="text"
                    required
                    value={formData.employmentStatus}
                    onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-purple-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Annual Compensation (USD)</label>
                  <input
                    type="number"
                    required
                    value={formData.annualIncome}
                    onChange={(e) => setFormData({ ...formData, annualIncome: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-purple-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Source of Wealth</label>
                  <select
                    value={formData.sourceOfWealth}
                    onChange={(e) => setFormData({ ...formData, sourceOfWealth: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-purple-500 focus:outline-hidden"
                  >
                    <option value="Executive Compensation & Capital Gains">Executive Compensation & Capital Gains</option>
                    <option value="Business Ownership & Dividends">Business Ownership & Dividends</option>
                    <option value="Inheritance & Trust Distributions">Inheritance & Trust Distributions</option>
                    <option value="Crypto & Digital Asset Liquidations">Crypto & Digital Asset Liquidations</option>
                  </select>
                </div>

                <div className="pt-4 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-purple-700"
                  >
                    <span>Next: Tier & Verification</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-900">Step 3: Account Tier & Document Upload</h4>

                {/* Tier Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Requested Account Tier</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      onClick={() => setFormData({ ...formData, requestedTier: 'TIER_2_VERIFIED' })}
                      className={`cursor-pointer rounded-2xl p-4 border transition-all ${
                        formData.requestedTier === 'TIER_2_VERIFIED'
                          ? 'border-purple-600 bg-purple-50/50 ring-1 ring-purple-600'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <p className="font-bold text-xs text-slate-900">Tier 2: Verified Premium</p>
                      <p className="text-[11px] text-slate-500 mt-1">Daily Limit: $25,000.00 • 4.85% APY Vault</p>
                    </div>

                    <div
                      onClick={() => setFormData({ ...formData, requestedTier: 'TIER_3_INSTITUTIONAL' })}
                      className={`cursor-pointer rounded-2xl p-4 border transition-all ${
                        formData.requestedTier === 'TIER_3_INSTITUTIONAL'
                          ? 'border-purple-600 bg-purple-50/50 ring-1 ring-purple-600'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <p className="font-bold text-xs text-slate-900">Tier 3: Institutional</p>
                      <p className="text-[11px] text-slate-500 mt-1">Daily Limit: $250,000.00 • Dedicated Officer</p>
                    </div>
                  </div>
                </div>

                {/* Document Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Document Type</label>
                  <select
                    value={formData.documentType}
                    onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-purple-500 focus:outline-hidden"
                  >
                    <option value="US Passport">US Passport</option>
                    <option value="State Driver License">State Driver's License</option>
                    <option value="National Identity Card">National Identity Card</option>
                  </select>
                </div>

                {/* Simulated Document Preview Card */}
                <div className="rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50/40 p-5 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <p className="mt-2 text-xs font-bold text-slate-900">
                    Synthetic Document Proof Attached
                  </p>
                  <p className="text-[11px] font-mono text-purple-700 mt-0.5">
                    {formData.documentType.toUpperCase()}-VERIFIED-KYC.PDF
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    SHA-256 Checksum verified • Ready for compliance officer review
                  </p>
                </div>

                <div className="pt-4 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-purple-700 shadow-md shadow-purple-600/30 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Transmitting to Compliance...' : 'Submit Application'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
};
