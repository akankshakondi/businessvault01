import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  PlusCircle,
  Lock,
  Unlock,
  Copy,
  Check,
  Building,
  ArrowUpRight,
  ArrowDownLeft,
  Settings,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { Account, Transaction } from '../types/index.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface AccountManagementProps {
  onOpenTransfer: () => void;
  onOpenNewAccount: () => void;
}

export const AccountManagement: React.FC<AccountManagementProps> = ({
  onOpenTransfer,
  onOpenNewAccount,
}) => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [accountTransactions, setAccountTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const loadAccounts = async () => {
    const token = localStorage.getItem('bv_auth_token');
    if (!token || !user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.accounts.list();
      setAccounts(res.accounts);
      if (res.accounts.length > 0 && !selectedAccount) {
        setSelectedAccount(res.accounts[0]);
      }
    } catch (err: any) {
      console.warn('Account load notification:', err?.message || err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadAccounts();
    }
  }, [user]);

  useEffect(() => {
    if (selectedAccount) {
      api.accounts
        .getTransactions({ accountId: selectedAccount.id })
        .then((res) => setAccountTransactions(res.transactions))
        .catch(console.error);
    }
  }, [selectedAccount]);

  const handleToggleFreeze = async (accountId: string) => {
    try {
      const res = await api.accounts.toggleFreeze(accountId);
      setAccounts((prev) =>
        prev.map((a) => (a.id === accountId ? { ...a, isCardFrozen: res.isCardFrozen } : a))
      );
      if (selectedAccount?.id === accountId) {
        setSelectedAccount((prev) => (prev ? { ...prev, isCardFrozen: res.isCardFrozen } : null));
      }
    } catch (err: any) {
      alert(err.message || 'Error toggling lock');
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Account Management</h2>
          <p className="text-xs text-slate-500">
            View account numbers, routing information, lock debit cards, and adjust transfer limits
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenTransfer}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            Transfer Funds
          </button>
          <button
            onClick={onOpenNewAccount}
            className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-600/20 hover:bg-purple-700 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Open Account</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Accounts List on Left, Selected Account Detail on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Account Cards */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            Your Accounts ({accounts.length})
          </h3>

          {accounts.map((acc) => {
            const isSelected = selectedAccount?.id === acc.id;
            return (
              <div
                key={acc.id}
                onClick={() => setSelectedAccount(acc)}
                className={`cursor-pointer rounded-2xl p-5 border transition-all ${
                  isSelected
                    ? 'border-purple-600 bg-purple-50/40 shadow-sm ring-1 ring-purple-600'
                    : 'border-slate-200 bg-white hover:border-purple-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-800">
                      {acc.type}
                    </span>
                    <h4 className="mt-2 text-sm font-bold text-slate-900">{acc.name}</h4>
                    <p className="font-mono text-xs text-slate-500 mt-0.5">{acc.accountNumber}</p>
                  </div>
                  {acc.isCardFrozen && (
                    <span className="flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                      <Lock className="h-3 w-3" /> Locked
                    </span>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                  <span className="text-xs text-slate-500">Balance</span>
                  <span className="text-base font-bold text-slate-900 font-sans">
                    ₹{acc.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Selected Account Deep-Dive */}
        {selectedAccount ? (
          <div className="lg:col-span-2 space-y-6">
            {/* Account Details & Routing Card */}
            <div className="rounded-3xl bg-white p-6 sm:p-7 border border-slate-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-[#1A4337] px-2.5 py-0.5 text-xs font-bold uppercase text-white">
                      {selectedAccount.type}
                    </span>
                    <h3 className="text-xl font-bold text-slate-900">{selectedAccount.name}</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Created on {new Date(selectedAccount.createdAt).toLocaleDateString('en-IN')} • Currency: {selectedAccount.currency} (INR)
                  </p>
                </div>

                <button
                  onClick={() => handleToggleFreeze(selectedAccount.id)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                    selectedAccount.isCardFrozen
                      ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm'
                      : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {selectedAccount.isCardFrozen ? (
                    <>
                      <Unlock className="h-4 w-4" />
                      <span>Unlock Account & Card</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 text-slate-400" />
                      <span>Freeze Account / Card</span>
                    </>
                  )}
                </button>
              </div>

              {/* Wire & ACH Details */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Account Number
                  </span>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-slate-900">
                      {selectedAccount.accountNumber}
                    </span>
                    <button
                      onClick={() => copyToClipboard(selectedAccount.accountNumber, 'account')}
                      className="text-slate-400 hover:text-[#1A4337]"
                    >
                      {copiedField === 'account' ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    IFSC / Routing Transit Code
                  </span>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-slate-900">
                      {selectedAccount.routingNumber}
                    </span>
                    <button
                      onClick={() => copyToClipboard(selectedAccount.routingNumber, 'routing')}
                      className="text-slate-400 hover:text-[#1A4337]"
                    >
                      {copiedField === 'routing' ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Balances & Limits */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl bg-[#EBF3EF] p-4 border border-[#CDE8D9]">
                  <span className="text-xs font-semibold text-[#144234]">Ledger Balance</span>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    ₹{selectedAccount.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80">
                  <span className="text-xs font-semibold text-slate-600">Available to Withdraw</span>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    ₹{selectedAccount.available.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="rounded-2xl bg-emerald-50/70 p-4 border border-emerald-100">
                  <span className="text-xs font-semibold text-emerald-700">Daily Transfer Limit</span>
                  <p className="text-2xl font-bold text-emerald-800 mt-1">
                    ₹{selectedAccount.dailyLimit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            {/* Account Specific Ledger */}
            <div className="rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Account Transaction History</h4>
                  <p className="text-xs text-slate-500">Audited statements for {selectedAccount.name}</p>
                </div>
                <span className="text-xs font-medium text-slate-400">
                  {accountTransactions.length} records
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {accountTransactions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No transactions recorded for this account yet.
                  </div>
                ) : (
                  accountTransactions.map((tx) => (
                    <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60">
                      <div>
                        <p className="text-xs font-bold text-slate-900">{tx.description}</p>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                          {tx.referenceId} • {new Date(tx.createdAt).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-xs font-mono font-bold ${
                            tx.amount > 0 ? 'text-emerald-600' : 'text-slate-900'
                          }`}
                        >
                          {tx.amount > 0 ? '+' : '-'}₹{Math.abs(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                        <p className="text-[10px] text-slate-400 uppercase">{tx.status}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 flex h-64 items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-400">
            Select an account on the left to inspect its details and wire instructions.
          </div>
        )}
      </div>
    </div>
  );
};
