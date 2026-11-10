import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Search,
  Filter,
  Shield,
  Eye,
  Check,
  X,
} from 'lucide-react';
import { OnboardingApplication } from '../types/index.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface ApplicationApprovalsProps {
  onRefreshPending: () => void;
}

export const ApplicationApprovals: React.FC<ApplicationApprovalsProps> = ({
  onRefreshPending,
}) => {
  const { user, isAdmin, isComplianceOfficer } = useAuth();
  const [applications, setApplications] = useState<OnboardingApplication[]>([]);
  const [selectedApp, setSelectedApp] = useState<OnboardingApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadApplications = async () => {
    const token = localStorage.getItem('bv_auth_token');
    if (!token || !user || (!isAdmin && !isComplianceOfficer)) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.admin.getApplications();
      setApplications(res.applications);
      if (res.applications.length > 0 && !selectedApp) {
        setSelectedApp(res.applications[0]);
      }
      onRefreshPending();
    } catch (err: any) {
      console.warn('Applications load notification:', err?.message || err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && (isAdmin || isComplianceOfficer)) {
      loadApplications();
    }
  }, [user, isAdmin, isComplianceOfficer]);

  const handleDecision = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!selectedApp) return;

    const confirmMsg =
      decision === 'APPROVED'
        ? `Approve ${selectedApp.legalName}'s application for ${selectedApp.requestedTier}? This activates their account and provisions their initial checking account.`
        : `Reject ${selectedApp.legalName}'s application?`;

    if (!confirm(confirmMsg)) return;

    setIsSubmitting(true);
    try {
      const res = await api.admin.reviewApplication(selectedApp.id, decision, reviewNotes);
      setSelectedApp(res.application);
      setReviewNotes('');
      await loadApplications();
      alert(`Application ${selectedApp.applicationNumber} has been ${decision.toLowerCase()}.`);
    } catch (err: any) {
      alert(err.message || 'Review submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredApps = applications.filter((app) => {
    const matchesFilter = statusFilter === 'ALL' || app.status === statusFilter;
    const matchesSearch =
      app.legalName.toLowerCase().includes(search.toLowerCase()) ||
      app.applicationNumber.toLowerCase().includes(search.toLowerCase()) ||
      app.employmentStatus.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Title & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              KYC & Account Application Approvals
            </h2>
            <span className="rounded-md bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-800">
              Compliance Review Desk
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Audit identity verifications, inspect source of funds, evaluate AML risk scores, and approve tier promotions
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search applicant or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:border-purple-500 focus:outline-hidden w-48 sm:w-60"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:border-purple-500 focus:outline-hidden"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUBMITTED">Pending / Submitted</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Two-column layout: Applications queue on Left, Review desk on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Queue Column */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            Applications ({filteredApps.length})
          </h3>

          {filteredApps.map((app) => {
            const isSelected = selectedApp?.id === app.id;
            const isPending = app.status === 'SUBMITTED' || app.status === 'UNDER_REVIEW';
            const isApproved = app.status === 'APPROVED';

            return (
              <div
                key={app.id}
                onClick={() => setSelectedApp(app)}
                className={`cursor-pointer rounded-2xl p-4 sm:p-5 border transition-all ${
                  isSelected
                    ? 'border-purple-600 bg-purple-50/40 shadow-sm ring-1 ring-purple-600'
                    : 'border-slate-200 bg-white hover:border-purple-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        isApproved
                          ? 'bg-emerald-100 text-emerald-800'
                          : isPending
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {app.status}
                    </span>
                    <h4 className="mt-2 text-sm font-bold text-slate-900">{app.legalName}</h4>
                    <p className="font-mono text-[11px] text-slate-500">{app.applicationNumber}</p>
                  </div>

                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      app.riskScore < 30
                        ? 'bg-emerald-100 text-emerald-700'
                        : app.riskScore < 60
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    Risk: {app.riskScore}/100
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>{app.requestedTier.replace('TIER_', 'Tier ')}</span>
                  <span>${app.annualIncome.toLocaleString()}/yr</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Applicant Inspection & Decision Desk */}
        {selectedApp ? (
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-3xl bg-white p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900">{selectedApp.legalName}</h3>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        selectedApp.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : selectedApp.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {selectedApp.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-mono">
                    ID: {selectedApp.applicationNumber} • Submitted on{' '}
                    {new Date(selectedApp.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Risk score badge */}
                <div
                  className={`rounded-2xl p-3 border text-right ${
                    selectedApp.riskScore < 30
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : selectedApp.riskScore < 60
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-75">AML Risk Assessment</p>
                  <p className="text-lg font-extrabold font-mono mt-0.5">{selectedApp.riskScore} / 100</p>
                </div>
              </div>

              {/* Applicant Identity & Financial Profile Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80">
                  <span className="font-semibold text-slate-400 uppercase text-[10px] block">
                    Legal Identity
                  </span>
                  <p className="font-bold text-slate-900 mt-1">{selectedApp.legalName}</p>
                  <p className="text-slate-600 mt-0.5">DOB: {selectedApp.dateOfBirth}</p>
                  <p className="text-slate-600 font-mono mt-0.5">Tax ID: {selectedApp.taxId}</p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80">
                  <span className="font-semibold text-slate-400 uppercase text-[10px] block">
                    Residential Address
                  </span>
                  <p className="font-bold text-slate-900 mt-1">{selectedApp.addressStreet}</p>
                  <p className="text-slate-600 mt-0.5">
                    {selectedApp.addressCity}, {selectedApp.addressState} {selectedApp.addressZip}
                  </p>
                  <p className="text-slate-600 mt-0.5">{selectedApp.country}</p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80">
                  <span className="font-semibold text-slate-400 uppercase text-[10px] block">
                    Profession & Compensation
                  </span>
                  <p className="font-bold text-slate-900 mt-1">{selectedApp.employmentStatus}</p>
                  <p className="text-slate-600 font-mono mt-0.5">
                    Annual Income: ₹{selectedApp.annualIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80">
                  <span className="font-semibold text-slate-400 uppercase text-[10px] block">
                    Wealth Source & Target Tier
                  </span>
                  <p className="font-bold text-slate-900 mt-1">{selectedApp.sourceOfWealth}</p>
                  <p className="text-purple-700 font-semibold mt-0.5">
                    Requested: {selectedApp.requestedTier}
                  </p>
                </div>
              </div>

              {/* Uploaded Document Simulation Card */}
              <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-purple-600 p-2.5 text-white">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {selectedApp.documentType} Verification File
                    </p>
                    <p className="font-mono text-[11px] text-purple-700">{selectedApp.documentRef}</p>
                  </div>
                </div>
                <span className="rounded-md bg-white px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200 shadow-2xs">
                  OCR Verified ✓
                </span>
              </div>

              {/* Existing Officer notes */}
              {selectedApp.adminNotes && (
                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 text-xs">
                  <p className="font-bold text-slate-700 mb-1">Previous Review Audit Trail:</p>
                  <p className="text-slate-600">{selectedApp.adminNotes}</p>
                  {selectedApp.reviewedBy && (
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                      Officer: {selectedApp.reviewedBy} • {selectedApp.reviewedAt ? new Date(selectedApp.reviewedAt).toLocaleString() : ''}
                    </p>
                  )}
                </div>
              )}

              {/* Action Decision Form */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Compliance Officer Determination
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Compliance Notes & Justification (Recorded in Audit Trail)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter compliance rationale, risk review remarks, or stipulations..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-purple-500 focus:outline-hidden"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3">
                  <button
                    onClick={() => handleDecision('REJECTED')}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50 transition-colors"
                  >
                    <X className="h-4 w-4" />
                    <span>Reject Application</span>
                  </button>

                  <button
                    onClick={() => handleDecision('APPROVED')}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-600/20 hover:bg-purple-700 disabled:opacity-50 transition-all"
                  >
                    <Check className="h-4 w-4" />
                    <span>Approve & Provision Account</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 flex h-64 items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-400">
            Select an application to review identity documents and take action.
          </div>
        )}
      </div>
    </div>
  );
};
