import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, Clock, AlertCircle, ChevronDown, Check, Shield } from 'lucide-react';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const AccountRequestView: React.FC = () => {
  const { user } = useAuth();
  const [accountType, setAccountType] = useState('Personal');
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadRequests = async () => {
    const token = localStorage.getItem('bv_auth_token');
    if (!token || !user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.accounts.getRequests();
      setRequests(res.requests || []);
    } catch (err: any) {
      console.warn('Load requests notice:', err?.message || err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadRequests();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage(null);

    try {
      const res = await api.accounts.submitRequest(accountType);
      setSuccessMessage(`Account request for ${accountType} submitted successfully.`);
      await loadRequests();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to submit account request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      {/* Editorial Header matching reference screenshot */}
      <div>
        <p className="text-[11px] font-bold tracking-widest uppercase text-[#5A7369] font-sans">
          ONBOARDING
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-serif text-[#102922] font-normal tracking-tight">
          Account request
        </h1>
        <p className="mt-2 text-sm text-[#4E665D]">
          Customer accounts are opened after administrator review.
        </p>
      </div>

      {/* Main Request Form Card matching screenshot */}
      <div className="rounded-2xl bg-white p-6 sm:p-8 border border-[#E2EAE5] shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">
              Requested account type
            </label>
            <div className="relative">
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                className="w-full appearance-none rounded-xl border border-[#D5E0DB] bg-white px-4 py-3 text-sm font-medium text-slate-800 focus:border-[#1E4D40] focus:ring-1 focus:ring-[#1E4D40] focus:outline-hidden"
              >
                <option value="Personal">Personal</option>
                <option value="Business">Business</option>
                <option value="High-Yield Savings (4.85% APY)">High-Yield Savings (4.85% APY)</option>
                <option value="Treasury & Investment">Treasury & Investment</option>
              </select>
              <div className="pointer-events-none absolute right-4 top-3.5 text-slate-400">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-[#1A4337] py-3.5 text-sm font-semibold text-white shadow-xs hover:bg-[#13362C] active:scale-[0.99] transition-all disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting request...' : 'Submit request'}
          </button>
        </form>

        {successMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#E8F5EE] p-3 text-xs font-semibold text-[#18533F] border border-[#CDE8D9]">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1B634B]" />
            <span>{successMessage}</span>
          </div>
        )}
      </div>

      {/* Your Requests Section matching screenshot */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 font-sans">Your requests</h2>

        {requests.length === 0 ? (
          /* Empty State exactly as shown in screenshot */
          <div className="rounded-2xl bg-white border border-[#E2EAE5] py-14 px-6 text-center shadow-xs">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg text-[#859B92]">
              <CreditCard className="h-6 w-6 stroke-[1.5]" />
            </div>
            <h3 className="mt-3 text-xs font-bold text-slate-800">No requests yet</h3>
            <p className="mt-1 text-xs text-[#6B8279]">
              Submitted account requests and their decisions appear here.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-[#E2EAE5] divide-y divide-[#EDF3F0] overflow-hidden shadow-xs">
            {requests.map((req) => {
              const isApproved = req.status === 'APPROVED';
              const isPending = req.status === 'SUBMITTED' || req.status === 'UNDER_REVIEW';
              const isRejected = req.status === 'REJECTED';

              return (
                <div key={req.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-[#F9FBFA] transition-colors">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EBF3EF] text-[#1B4B3D]">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {req.legalName} • {req.employmentStatus || 'Account Request'}
                      </p>
                      <p className="text-xs text-[#5D756C] mt-0.5">
                        Ref: <span className="font-mono font-medium">{req.applicationNumber}</span> • Submitted on{' '}
                        {new Date(req.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                        isApproved
                          ? 'bg-[#E2F5EB] text-[#13633C]'
                          : isPending
                          ? 'bg-[#FEF5E7] text-[#9A6700]'
                          : 'bg-[#FDE8E8] text-[#9B1C1C]'
                      }`}
                    >
                      {isApproved && <CheckCircle2 className="h-3.5 w-3.5" />}
                      {isPending && <Clock className="h-3.5 w-3.5" />}
                      {isRejected && <AlertCircle className="h-3.5 w-3.5" />}
                      <span>{isApproved ? 'Approved' : isPending ? 'Pending review' : 'Rejected'}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer matching reference design */}
      <footer className="pt-8 border-t border-[#E2EAE5] flex flex-col sm:flex-row items-center justify-between text-xs text-[#6B8279] gap-2">
        <p>BalanceVault · Financial clarity, by design.</p>
        <p className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-[#517568]" />
          <span>Secure session</span>
        </p>
      </footer>
    </div>
  );
};
