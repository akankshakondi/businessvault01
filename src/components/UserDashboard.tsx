import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Lock,
  Unlock,
  Copy,
  Check,
  Search,
  Download,
  PlusCircle,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  Wallet,
  PiggyBank,
  Briefcase,
  LineChart,
  ShieldCheck,
} from 'lucide-react';
import { Account, Transaction } from '../types/index.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface UserDashboardProps {
  onOpenTransfer: () => void;
  onOpenNewAccount: () => void;
  onNavigateToTab: (tab: any) => void;
  onOpenAddTransaction: () => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  onOpenTransfer,
  onOpenNewAccount,
  onNavigateToTab,
  onOpenAddTransaction,
}) => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSensitiveBalances, setShowSensitiveBalances] = useState(true);
  const [copiedAccId, setCopiedAccId] = useState<string | null>(null);
  const [txSearch, setTxSearch] = useState('');
  const [txFilter, setTxFilter] = useState('ALL');
  const [activeAccountCardIndex, setActiveAccountCardIndex] = useState(0);

  const loadDashboardData = async () => {
    const token = localStorage.getItem('bv_auth_token');
    if (!user || !token) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const [accRes, txRes] = await Promise.all([
        api.accounts.list(),
        api.accounts.getTransactions(),
      ]);
      setAccounts(accRes.accounts || []);
      setTransactions(txRes.transactions || []);
    } catch (err: any) {
      console.warn('Dashboard data notice:', err?.message || err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const totalBalance = accounts.reduce((acc, curr) => acc + curr.balance, 0);
  const totalAvailable = accounts.reduce((acc, curr) => acc + curr.available, 0);

  const monthlyInflows = transactions
    .filter((t) => t.amount > 0)
    .reduce((acc, curr) => acc + curr.amount, 0);

  const monthlyOutflows = transactions
    .filter((t) => t.amount < 0)
    .reduce((acc, curr) => acc + Math.abs(curr.amount), 0);

  const handleCopyAccount = (num: string, id: string) => {
    navigator.clipboard.writeText(num.replace(/\s+/g, ''));
    setCopiedAccId(id);
    setTimeout(() => setCopiedAccId(null), 2000);
  };

  const handleToggleFreeze = async (accountId: string) => {
    try {
      const res = await api.accounts.toggleFreeze(accountId);
      setAccounts((prev) =>
        prev.map((a) => (a.id === accountId ? { ...a, isCardFrozen: res.isCardFrozen } : a))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to toggle card lock.');
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    const matchesFilter = txFilter === 'ALL' || tx.type === txFilter;
    const matchesSearch =
      tx.description.toLowerCase().includes(txSearch.toLowerCase()) ||
      tx.referenceId.toLowerCase().includes(txSearch.toLowerCase()) ||
      (tx.counterparty && tx.counterparty.toLowerCase().includes(txSearch.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const exportTransactionsCsv = () => {
    const headers = ['Reference ID', 'Date', 'Type', 'Amount', 'Currency', 'Status', 'Description', 'Counterparty'];
    const rows = filteredTransactions.map((t) => [
      t.referenceId,
      new Date(t.createdAt).toLocaleDateString(),
      t.type,
      t.amount,
      t.currency,
      t.status,
      `"${t.description.replace(/"/g, '""')}"`,
      `"${(t.counterparty || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BalanceVault_Transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeAccount = accounts[activeAccountCardIndex] || accounts[0];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Welcome & Summary Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, {user?.firstName || 'Valued Client'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Here is your simple overview of accounts, balances, and recent money movements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateToTab('account-requests')}
            className="flex items-center gap-2 rounded-xl bg-[#E8F3EE] px-3.5 py-2 text-xs font-semibold text-[#18533F] border border-[#CDE8D9] hover:bg-[#DDF0E5] transition-colors"
          >
            <ShieldCheck className="h-4 w-4 text-[#1E6B51]" />
            <span>Tier: {user?.kycTier ? user.kycTier.replace('_', ' ') : 'Verified'}</span>
          </button>

          <button
            onClick={() => setShowSensitiveBalances(!showSensitiveBalances)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Toggle visibility"
          >
            {showSensitiveBalances ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span className="hidden sm:inline">{showSensitiveBalances ? 'Hide Numbers' : 'Show Numbers'}</span>
          </button>
        </div>
      </div>

      {/* Hero 3-Card Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Total Balance Card */}
        <div className="rounded-3xl bg-gradient-to-br from-[#0F261F] via-[#15382E] to-[#1E4D40] p-6 text-white shadow-lg border border-[#194034] flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 h-32 w-32 rounded-full bg-[#3FB98B]/20 blur-2xl" />
          <div>
            <div className="flex items-center justify-between text-xs text-[#7FBCA6] font-medium">
              <span>TOTAL VAULT CUSTODY</span>
              <span className="font-mono text-[#85CEB7]">INR (₹)</span>
            </div>
            <div className="mt-3 text-3xl sm:text-4xl font-serif tracking-tight font-normal">
              {showSensitiveBalances
                ? `₹${totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : '••••••••••'}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-[#52D4A3] font-medium">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>+5.5% annualized interest & yield</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#1F4C3E] flex items-center justify-between text-xs">
            <span className="text-[#8FB7A9]">Available to Spend:</span>
            <span className="font-bold text-white font-mono">
              {showSensitiveBalances
                ? `₹${totalAvailable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                : '••••••••'}
            </span>
          </div>
        </div>

        {/* Quick Inflows Card */}
        <div className="rounded-3xl bg-white p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>MONTHLY MONEY IN</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <ArrowDownLeft className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
              +₹{monthlyInflows.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Salary credits, client payments & interest
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Reserve APY:</span>
            <span className="font-bold text-emerald-600 font-mono">5.50% p.a.</span>
          </div>
        </div>

        {/* Quick Outflows Card */}
        <div className="rounded-3xl bg-white p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>MONTHLY MONEY OUT</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
              -₹{monthlyOutflows.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Bills, rent, online purchases & transfers
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Active Accounts:</span>
            <span className="font-bold text-[#1A4337]">{accounts.length} Custody Accounts</span>
          </div>
        </div>
      </div>

      {/* Quick Action Bar */}
      <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Quick Actions:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenAddTransaction}
            className="flex items-center gap-2 rounded-xl bg-[#1A4337] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#13362C] active:scale-95 transition-all"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add Transaction</span>
          </button>

          <button
            onClick={onOpenTransfer}
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all shadow-2xs"
          >
            <ArrowUpRight className="h-4 w-4 text-[#1A4337]" />
            <span>Send Money</span>
          </button>

          <button
            onClick={onOpenNewAccount}
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all shadow-2xs"
          >
            <PlusCircle className="h-4 w-4 text-[#1A4337]" />
            <span>Open Account</span>
          </button>

          <button
            onClick={() => onNavigateToTab('accounts')}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <span>View Routing & Details</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Middle Section: Realistic Virtual Card & Accounts List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Realistic Virtual Debit Card */}
        <div className="flex flex-col justify-between rounded-3xl bg-white p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Primary Vault Card
            </span>
            <button
              onClick={() => activeAccount && handleToggleFreeze(activeAccount.id)}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${
                activeAccount?.isCardFrozen
                  ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {activeAccount?.isCardFrozen ? (
                <>
                  <Lock className="h-3.5 w-3.5" />
                  <span>Card Locked</span>
                </>
              ) : (
                <>
                  <Unlock className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Card Active</span>
                </>
              )}
            </button>
          </div>

          {/* Realistic physical card representation */}
          <div className="mt-4 relative h-48 w-full rounded-2xl bg-gradient-to-tr from-[#0D211B] via-[#15382E] to-[#235848] p-5 text-white shadow-xl flex flex-col justify-between overflow-hidden border border-[#2D6E5A]/40">
            {/* Card glossy lines */}
            <div className="absolute -right-8 -bottom-8 h-40 w-40 rounded-full bg-[#3FB98B]/20 blur-xl" />
            
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs tracking-wider uppercase text-[#88CEB7] font-sans">
                BalanceVault
              </span>
              <span className="text-[10px] font-mono tracking-widest text-[#B5DFD1] uppercase">
                {activeAccount?.type || 'CHECKING'}
              </span>
            </div>

            {/* EMV Chip and contactless icon */}
            <div className="flex items-center gap-3">
              <div className="h-7 w-9 rounded-md bg-[#ECC358] border border-[#D4A73B] shadow-xs flex items-center justify-center">
                <div className="h-3 w-5 border border-[#9A741B]/70 rounded-xs" />
              </div>
              <span className="text-xs text-[#88CEB7] font-mono">)))</span>
            </div>

            {/* Masked Card Number */}
            <div>
              <div className="font-mono text-base sm:text-lg tracking-widest text-white font-semibold">
                {showSensitiveBalances
                  ? `4892 •••• •••• ${activeAccount ? activeAccount.accountNumber.slice(-4) : '9201'}`
                  : '•••• •••• •••• ••••'}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-[#A2D3C4]">
                <div>
                  <span className="text-[8px] uppercase tracking-wider block text-[#74AFA0] font-semibold">
                    Cardholder
                  </span>
                  <span className="font-bold tracking-wider text-white">
                    {user ? `${user.firstName.toUpperCase()} ${user.lastName.toUpperCase()}` : 'KONDI AKANKSHA'}
                  </span>
                </div>
                <div>
                  <span className="text-[8px] uppercase tracking-wider block text-[#74AFA0] font-semibold">
                    Expires
                  </span>
                  <span className="font-mono font-bold text-white">09/29</span>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-500 text-center">
            Tap the button above to instantly freeze or unfreeze your physical & virtual debit card.
          </p>
        </div>

        {/* Accounts List on the Right */}
        <div className="lg:col-span-2 rounded-3xl bg-white p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Your Bank Accounts</h3>
                <p className="text-xs text-slate-500">Click any account to view or copy details</p>
              </div>
              <button
                onClick={onOpenNewAccount}
                className="flex items-center gap-1 text-xs font-bold text-[#1A4337] hover:text-[#123128]"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Open Account</span>
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {accounts.map((acc, index) => {
                const isSelected = activeAccountCardIndex === index;
                const isSavings = acc.type === 'SAVINGS';
                const isBusiness = acc.type === 'BUSINESS';
                const isInvestment = acc.type === 'INVESTMENT';

                return (
                  <div
                    key={acc.id}
                    onClick={() => setActiveAccountCardIndex(index)}
                    className={`cursor-pointer rounded-2xl p-4 border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-[#1A4337] bg-[#F2F7F4] shadow-xs ring-1 ring-[#1A4337]'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-xs ${
                          isSavings
                            ? 'bg-[#1A4337]'
                            : isBusiness
                            ? 'bg-[#1D3557]'
                            : isInvestment
                            ? 'bg-[#2A9D8F]'
                            : 'bg-slate-800'
                        }`}
                      >
                        {isSavings && <PiggyBank className="h-5 w-5" />}
                        {isBusiness && <Briefcase className="h-5 w-5" />}
                        {isInvestment && <LineChart className="h-5 w-5" />}
                        {!isSavings && !isBusiness && !isInvestment && <Wallet className="h-5 w-5" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{acc.name}</h4>
                          {isSavings && (
                            <span className="rounded-md bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
                              4.85% APY
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span className="font-mono text-[11px]">{acc.accountNumber}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyAccount(acc.accountNumber, acc.id);
                            }}
                            className="text-slate-400 hover:text-[#1A4337]"
                            title="Copy number"
                          >
                            {copiedAccId === acc.id ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-extrabold text-slate-900 font-sans">
                        {showSensitiveBalances
                          ? `₹${acc.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                          : '••••••••'}
                      </div>
                      <span className="text-[11px] font-medium text-slate-400">
                        {acc.isCardFrozen ? 'Locked' : 'Available'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>IFSC / Routing Transit Code: <strong className="font-mono text-slate-800">BVLT0002100</strong></span>
            <button
              onClick={() => onNavigateToTab('accounts')}
              className="text-[#1A4337] font-bold hover:underline"
            >
              Full Account Management →
            </button>
          </div>
        </div>
      </div>

      {/* Simple Cash Flow Bar */}
      <div className="rounded-3xl bg-white p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">Monthly Cash Inflows vs. Outflows</h3>
            <p className="text-xs text-slate-500">A clear summary of where your money came from and went this month</p>
          </div>
          <span className="text-xs font-semibold text-slate-400">Current Month</span>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-100">
            <span className="font-semibold text-emerald-800">Total Inflow</span>
            <p className="text-xl font-extrabold text-emerald-900 mt-1">
              +₹{monthlyInflows.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-emerald-700 mt-0.5">Salary, deposits, revenue & interest</p>
          </div>

          <div className="rounded-2xl bg-rose-50 p-4 border border-rose-100">
            <span className="font-semibold text-rose-800">Total Spent</span>
            <p className="text-xl font-extrabold text-rose-900 mt-1">
              -₹{monthlyOutflows.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-rose-700 mt-0.5">Bills, rent, shopping & payments</p>
          </div>

          <div className="rounded-2xl bg-[#EBF3EF] p-4 border border-[#CDE8D9]">
            <span className="font-semibold text-[#144234]">Net Balance Retained</span>
            <p className="text-xl font-extrabold text-[#10362A] mt-1">
              ₹{(monthlyInflows - monthlyOutflows).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-[#2D6656] mt-0.5">Surplus saved this billing cycle</p>
          </div>
        </div>

        <div className="mt-5">
          <div className="h-3 w-full rounded-full bg-slate-100 flex overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all"
              style={{
                width: monthlyInflows + monthlyOutflows > 0
                  ? `${Math.round((monthlyInflows / (monthlyInflows + monthlyOutflows)) * 100)}%`
                  : '50%',
              }}
              title="Inflow"
            />
            <div
              className="bg-rose-400 h-full transition-all"
              style={{
                width: monthlyInflows + monthlyOutflows > 0
                  ? `${Math.round((monthlyOutflows / (monthlyInflows + monthlyOutflows)) * 100)}%`
                  : '50%',
              }}
              title="Outflow"
            />
          </div>
        </div>
      </div>

      {/* Clean Recent Transactions Table */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Transactions</h3>
            <p className="text-xs text-slate-500">Every deposit, transfer, and payout with full details</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenAddTransaction}
              className="flex items-center gap-1.5 rounded-xl bg-[#1A4337] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#13362C] transition-colors shadow-2xs"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Add Transaction</span>
            </button>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search recipient or note..."
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:border-[#1A4337] focus:outline-hidden w-40 sm:w-52"
              />
            </div>

            <select
              value={txFilter}
              onChange={(e) => setTxFilter(e.target.value)}
              className="text-xs rounded-xl border border-slate-200 px-3 py-1.5 text-slate-700 focus:border-[#1A4337] focus:outline-hidden"
            >
              <option value="ALL">All Types</option>
              <option value="DEPOSIT">Deposits (+)</option>
              <option value="PAYMENT">Payments (-)</option>
              <option value="TRANSFER_OUT">Transfers (-)</option>
              <option value="INTEREST">Interest (+)</option>
            </select>

            <button
              onClick={exportTransactionsCsv}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-6 py-3.5">Transaction</th>
                <th className="px-6 py-3.5">Recipient / Source</th>
                <th className="px-6 py-3.5">Category</th>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <p className="font-semibold text-slate-700 text-sm">No transactions recorded yet</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Use the "Add Transaction" option above to record realistic deposits, payments, or salary credits.
                    </p>
                    <button
                      onClick={onOpenAddTransaction}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#1A4337] px-4 py-2 text-xs font-semibold text-white hover:bg-[#13362C] transition-colors"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      <span>Add First Transaction</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isPositive = tx.amount > 0;
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{tx.description}</div>
                        <div className="font-mono text-[10px] text-slate-400 mt-0.5">{tx.referenceId}</div>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-700">
                        {tx.counterparty || 'BalanceVault Clearing'}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {tx.category || 'General'}
                      </td>
                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            tx.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : tx.status === 'FLAGGED'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-right font-mono font-bold text-sm ${isPositive ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {isPositive ? '+' : '-'}₹{Math.abs(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
