import React, { useState, useEffect } from 'react';
import {
  ScrollText,
  Search,
  Filter,
  Download,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Info,
  RefreshCw,
  Terminal,
} from 'lucide-react';
import { AuditLog } from '../types/index.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const AuditLogsView: React.FC = () => {
  const { user, isAdmin, isComplianceOfficer } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const loadLogs = async () => {
    const token = localStorage.getItem('bv_auth_token');
    if (!token || !user || (!isAdmin && !isComplianceOfficer)) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.admin.getAuditLogs();
      setLogs(res.auditLogs);
    } catch (err: any) {
      console.warn('Audit logs load notification:', err?.message || err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && (isAdmin || isComplianceOfficer)) {
      loadLogs();
    }
  }, [user, isAdmin, isComplianceOfficer]);

  const filteredLogs = logs.filter((log) => {
    const matchesSeverity = severityFilter === 'ALL' || log.severity === severityFilter;
    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
    const matchesSearch =
      log.details.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      (log.actorEmail && log.actorEmail.toLowerCase().includes(search.toLowerCase())) ||
      log.ipAddress.includes(search);
    return matchesSeverity && matchesAction && matchesSearch;
  });

  const exportCsv = () => {
    const headers = ['Timestamp', 'Action', 'Severity', 'Actor Email', 'Actor Role', 'IP Address', 'Details'];
    const rows = filteredLogs.map((l) => [
      l.createdAt,
      l.action,
      l.severity,
      `"${l.actorEmail || 'System'}"`,
      l.actorRole || 'SYSTEM',
      l.ipAddress,
      `"${l.details.replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BalanceVault_AuditTrail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Security & Audit Logs</h2>
            <span className="rounded-md bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-800">
              Immutable Trail
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Real-time regulatory compliance recording, RBAC enforcement telemetry, and IP audit records
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={loadLogs}
            disabled={isLoading}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
            title="Refresh logs"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search action, actor, IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:border-purple-500 focus:outline-hidden w-48 sm:w-60"
            />
          </div>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:border-purple-500 focus:outline-hidden"
          >
            <option value="ALL">All Severities</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="SECURITY_ALERT">SECURITY ALERT</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>

          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-bold">Severity</th>
                <th className="px-6 py-4 font-bold">Timestamp</th>
                <th className="px-6 py-4 font-bold">Action Event</th>
                <th className="px-6 py-4 font-bold">Actor</th>
                <th className="px-6 py-4 font-bold">IP Address</th>
                <th className="px-6 py-4 font-bold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No audit records match the current filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isCrit = log.severity === 'CRITICAL' || log.severity === 'SECURITY_ALERT';
                  const isWarn = log.severity === 'WARN';

                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            isCrit
                              ? 'bg-rose-100 text-rose-800'
                              : isWarn
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isCrit && <ShieldAlert className="h-3 w-3" />}
                          {isWarn && <AlertTriangle className="h-3 w-3" />}
                          {!isCrit && !isWarn && <Info className="h-3 w-3" />}
                          {log.severity}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>

                      <td className="px-6 py-4 font-mono font-bold text-slate-900">
                        {log.action}
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{log.actorEmail || 'System Core'}</div>
                        {log.actorRole && (
                          <span className="font-mono text-[10px] text-purple-700">[{log.actorRole}]</span>
                        )}
                      </td>

                      <td className="px-6 py-4 font-mono text-[11px] text-slate-500">
                        {log.ipAddress}
                      </td>

                      <td className="px-6 py-4 text-slate-700 max-w-md truncate" title={log.details}>
                        {log.details}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Detail Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-purple-600" />
                <h3 className="text-base font-bold text-slate-900">Audit Record Inspector</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>

            <div className="rounded-2xl bg-slate-900 p-4 text-slate-200 font-mono text-xs overflow-x-auto max-h-80">
              <pre>{JSON.stringify(selectedLog, null, 2)}</pre>
            </div>

            <p className="text-xs text-slate-500">
              This cryptographic log entry is permanently bound to the transaction ledger and cannot be altered or purged.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
