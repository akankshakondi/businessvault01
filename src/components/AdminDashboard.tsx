import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  ShieldAlert,
  FileCheck2,
  Activity,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { AdminMetrics, RedisMetrics } from '../types/index.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface AdminDashboardProps {
  onNavigateTab: (tab: any) => void;
  onRefreshGlobalCounts: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigateTab,
  onRefreshGlobalCounts,
}) => {
  const { user, isAdmin, isComplianceOfficer } = useAuth();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [redis, setRedis] = useState<RedisMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  const loadData = async () => {
    const token = localStorage.getItem('bv_auth_token');
    if (!token || !user || (!isAdmin && !isComplianceOfficer)) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.admin.getMetrics();
      setMetrics(res.metrics);
      setRedis(res.redis);
      onRefreshGlobalCounts();
    } catch (err: any) {
      console.warn('Admin metrics fetch notification:', err?.message || err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && (isAdmin || isComplianceOfficer)) {
      loadData();
    }
  }, [user, isAdmin, isComplianceOfficer]);

  const handleResetDemo = async () => {
    if (!confirm('Reset synthetic database to baseline? This restores demo users, accounts, and clean audit trail.')) {
      return;
    }
    try {
      setIsResetting(true);
      await api.admin.resetDemo();
      await loadData();
      alert('System demo dataset has been reset successfully.');
    } catch (err: any) {
      alert(err.message || 'Reset failed.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Admin Title bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Enterprise Admin Overview</h2>
            <span className="rounded-md bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-800 border border-purple-200">
              RBAC Protected
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Real-time multi-account banking oversight, AML alerts, KYC pipeline, and Redis telemetry
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Telemetry</span>
          </button>

          <button
            onClick={handleResetDemo}
            disabled={isResetting}
            className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Demo DB</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="rounded-3xl bg-white p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Assets Under Custody</span>
            <div className="rounded-xl bg-purple-50 p-2 text-purple-600">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-slate-900 font-sans">
            ₹{metrics?.totalAssetsUnderCustody.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
          </p>
          <div className="mt-2 flex items-center text-xs font-medium text-emerald-600">
            <TrendingUp className="h-3.5 w-3.5 mr-1" />
            <span>Across {metrics?.activeAccountsCount || 0} active client accounts</span>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Pending KYC Approvals</span>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
              <FileCheck2 className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-amber-600 font-sans">
            {metrics?.pendingKycCount || 0}
          </p>
          <button
            onClick={() => onNavigateTab('admin-approvals')}
            className="mt-2 text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1"
          >
            <span>Review Applications Queue</span>
            <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>

        <div className="rounded-3xl bg-white p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Registered System Users</span>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-slate-900 font-sans">
            {metrics?.totalUsersCount || 0}
          </p>
          <button
            onClick={() => onNavigateTab('admin-users')}
            className="mt-2 text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1"
          >
            <span>Manage User Directory & Roles</span>
            <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>

        <div className="rounded-3xl bg-white p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">24h Settlement Volume</span>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-slate-900 font-sans">
            ${metrics?.volume24h.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
          </p>
          <div className="mt-2 text-xs text-slate-400">
            <span>{metrics?.totalTransactionsCount || 0} total ledger events</span>
          </div>
        </div>
      </div>

      {/* Middle Section: Quick Review Queue + Redis Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Review Desk callout */}
        <div className="lg:col-span-2 rounded-3xl bg-white p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">AML Risk & Compliance Actions</h3>
              <p className="text-xs text-slate-500">Applications and high-value transactions flagged for attention</p>
            </div>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 border border-amber-200">
              {metrics?.flaggedTxCount || 0} Flagged Transactions
            </span>
          </div>

          <div className="mt-5 space-y-3">
            <div className="rounded-2xl bg-amber-50/70 p-4 border border-amber-200/80 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-amber-500 p-2 text-white shrink-0 mt-0.5">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-950">
                    Cross-Border Outbound Wire to DBS Bank Ltd Singapore ($980.25)
                  </p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Triggered automated foreign entity scrutiny checklist. Reference: TX-882187
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('admin-audit-logs')}
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 shrink-0"
              >
                Inspect
              </button>
            </div>

            <div className="rounded-2xl bg-purple-50/70 p-4 border border-purple-200/80 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-purple-600 p-2 text-white shrink-0 mt-0.5">
                  <FileCheck2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-purple-950">
                    Elena Rostova - Tier 2 KYC Application Submitted
                  </p>
                  <p className="text-[11px] text-purple-800 mt-0.5">
                    CTO at Tech Corp • Income: $240,000.00 • Low Risk Score: 18/100
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('admin-approvals')}
                className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-700 shrink-0"
              >
                Review
              </button>
            </div>
          </div>
        </div>

        {/* Redis Rate Limiter Live Panel */}
        <div className="rounded-3xl bg-[#0B132B] p-6 text-white border border-slate-800 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Redis Rate Limiter</h3>
              </div>
              <span className="font-mono text-[11px] text-emerald-400 font-semibold">
                ● Live
              </span>
            </div>

            <div className="mt-4 space-y-3 font-mono text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 font-sans">Engine:</span>
                <span className="text-purple-300">Redis Slotted Token Bucket</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 font-sans">Avg Latency:</span>
                <span className="text-emerald-400">{redis?.redisAvgLatencyMs || 0.74} ms</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 font-sans">Active IP Keys:</span>
                <span className="text-white">{redis?.activeKeysCount || 0}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400 font-sans">Requests Tracked:</span>
                <span className="text-white">{redis?.totalRequestsTracked || 0}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800">
            <button
              onClick={() => onNavigateTab('admin-redis')}
              className="w-full rounded-xl bg-purple-600/30 py-2.5 text-xs font-bold text-purple-300 hover:bg-purple-600/50 border border-purple-500/40 transition-colors text-center block"
            >
              Open Full Redis Inspector
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
