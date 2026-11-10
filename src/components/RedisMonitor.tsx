import React, { useState, useEffect } from 'react';
import { Activity, Shield, RefreshCw, Zap, Clock, KeyRound, AlertCircle } from 'lucide-react';
import { RedisMetrics } from '../types/index.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const RedisMonitor: React.FC = () => {
  const { user, isAdmin, isComplianceOfficer } = useAuth();
  const [redisData, setRedisData] = useState<RedisMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRedisMetrics = async () => {
    const token = localStorage.getItem('bv_auth_token');
    if (!token || !user || (!isAdmin && !isComplianceOfficer)) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.admin.getMetrics();
      setRedisData(res.redis);
    } catch (err: any) {
      console.warn('Redis metrics fetch notification:', err?.message || err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && (isAdmin || isComplianceOfficer)) {
      fetchRedisMetrics();
      const interval = setInterval(fetchRedisMetrics, 5000);
      return () => clearInterval(interval);
    }
  }, [user, isAdmin, isComplianceOfficer]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Redis Rate Limiter Monitor</h2>
            <span className="rounded-md bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-800">
              Live In-Memory Cache
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Sliding window rate limit telemetry, API route throttling metrics, and active IP keys
          </p>
        </div>

        <button
          onClick={fetchRedisMetrics}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="rounded-3xl bg-white p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Active Keys in Cache</span>
            <div className="rounded-xl bg-purple-50 p-2 text-purple-600">
              <KeyRound className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-slate-900 font-mono">
            {redisData?.activeKeysCount || 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Sliding expiration per IP/route</p>
        </div>

        <div className="rounded-3xl bg-white p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Requests Evaluated</span>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
              <Zap className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-slate-900 font-mono">
            {redisData?.totalRequestsTracked || 0}
          </p>
          <p className="text-[11px] text-emerald-600 mt-1 font-semibold">100% throughput passed</p>
        </div>

        <div className="rounded-3xl bg-white p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Rate Limit Violations</span>
            <div className="rounded-xl bg-rose-50 p-2 text-rose-600">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-rose-600 font-mono">
            {redisData?.totalBlockedRequests || 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">HTTP 429 Too Many Requests</p>
        </div>

        <div className="rounded-3xl bg-white p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Simulated Redis Latency</span>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-slate-900 font-mono">
            {redisData?.redisAvgLatencyMs || 0.74} ms
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Sub-millisecond token checking</p>
        </div>
      </div>

      {/* Active Redis Keys Table */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Current Sliding Window Keyspace</h3>
            <p className="text-xs text-slate-500">Live active bucket entries in the Redis rate limiting store</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 font-mono text-xs text-slate-700">
            Auto-refreshes every 5s
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-200 font-sans">
              <tr>
                <th className="px-6 py-3 font-bold">Redis Key Identifier</th>
                <th className="px-6 py-3 font-bold">Hits in Current Window</th>
                <th className="px-6 py-3 font-bold">Expires in (TTL)</th>
                <th className="px-6 py-3 font-bold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!redisData?.sampleKeys || redisData.sampleKeys.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400 font-sans text-xs">
                    No active rate limit keys in current window.
                  </td>
                </tr>
              ) : (
                redisData.sampleKeys.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-6 py-3.5 text-purple-700 font-bold">{item.key}</td>
                    <td className="px-6 py-3.5 text-slate-900">{item.hits} calls</td>
                    <td className="px-6 py-3.5 text-slate-600">{item.expiresInSeconds}s</td>
                    <td className="px-6 py-3.5 text-right font-sans">
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        NORMAL
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
