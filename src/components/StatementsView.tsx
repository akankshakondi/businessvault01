import React, { useState, useEffect } from 'react';
import { Download, Search, FileText, ArrowUpRight, ArrowDownLeft, Calendar } from 'lucide-react';
import { Transaction } from '../types/index.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface StatementsViewProps {
  onOpenAddTransaction?: () => void;
}

export const StatementsView: React.FC<StatementsViewProps> = ({ onOpenAddTransaction }) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  const loadTransactions = async () => {
    const token = localStorage.getItem('bv_auth_token');
    if (!token || !user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.accounts.getTransactions();
      setTransactions(res.transactions || []);
    } catch (err: any) {
      console.warn('Statements load notice:', err?.message || err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadTransactions();
    }
  }, [user]);

  const filtered = transactions.filter((t) => {
    const matchesFilter = filterType === 'ALL' || t.type === filterType;
    const matchesSearch =
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.referenceId.toLowerCase().includes(search.toLowerCase()) ||
      (t.counterparty && t.counterparty.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const exportCsv = () => {
    const headers = ['Reference ID', 'Date', 'Type', 'Amount (INR)', 'Currency', 'Description', 'Counterparty', 'Status'];
    const rows = filtered.map((t) => [
      t.referenceId,
      new Date(t.createdAt).toLocaleDateString('en-IN'),
      t.type,
      t.amount,
      'INR',
      `"${t.description.replace(/"/g, '""')}"`,
      `"${(t.counterparty || '').replace(/"/g, '""')}"`,
      t.status,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BalanceVault_INR_Statement_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Title */}
      <div>
        <p className="text-[11px] font-bold tracking-widest uppercase text-[#5A7369] font-sans">
          ACTIVITY & REPORTS
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-serif text-[#102922] font-normal tracking-tight">
          Statements
        </h1>
        <p className="mt-2 text-sm text-[#4E665D]">
          Audited statements and clearing records in Indian Rupees (₹) for all your custody accounts.
        </p>
      </div>

      {/* Filter and Export Bar */}
      <div className="rounded-2xl bg-white p-4 border border-[#E2EAE5] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search statements..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#D5E0DB] bg-white focus:border-[#1E4D40] focus:outline-hidden w-52 sm:w-64"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs rounded-xl border border-[#D5E0DB] bg-white px-3 py-1.5 text-slate-700 focus:border-[#1E4D40] focus:outline-hidden"
          >
            <option value="ALL">All Entries</option>
            <option value="DEPOSIT">Inflows (+)</option>
            <option value="PAYMENT">Payments (-)</option>
            <option value="TRANSFER_OUT">Outflows (-)</option>
            <option value="INTEREST">Interest (+)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {onOpenAddTransaction && (
            <button
              onClick={onOpenAddTransaction}
              className="flex items-center gap-1.5 rounded-xl bg-[#1A4337] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#13362C] transition-colors shadow-2xs"
            >
              <span>+ Add Transaction</span>
            </button>
          )}

          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 rounded-xl border border-[#D5E0DB] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#18483B] hover:bg-[#F2F7F4] transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Statements Records Table */}
      <div className="rounded-2xl bg-white border border-[#E2EAE5] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] text-[#607D72] uppercase tracking-wider text-[10px] border-b border-[#E2EAE5] font-semibold">
              <tr>
                <th className="px-6 py-3.5">Record Description</th>
                <th className="px-6 py-3.5">Counterparty</th>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Settlement (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF3EF]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-[#688278]">
                    <p className="font-semibold text-slate-700">No statement records found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      You can add realistic deposits or payments using the "Add Transaction" option.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((t) => {
                  const isPositive = t.amount > 0;
                  return (
                    <tr key={t.id} className="hover:bg-[#F9FBFA] transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{t.description}</div>
                        <div className="font-mono text-[10px] text-[#718A81] mt-0.5">{t.referenceId}</div>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-700">
                        {t.counterparty || 'Clearing Engine'}
                      </td>
                      <td className="px-6 py-4 text-[#5E796E] whitespace-nowrap">
                        {new Date(t.createdAt).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span className="rounded-full bg-[#E5F3EC] px-2.5 py-0.5 text-[10px] font-bold text-[#145C3C]">
                          {t.status}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-right font-mono font-bold text-sm ${isPositive ? 'text-[#166542]' : 'text-slate-900'}`}>
                        {isPositive ? '+' : '-'}₹{Math.abs(t.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
