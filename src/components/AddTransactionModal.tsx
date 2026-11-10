import React, { useState } from 'react';
import { X, PlusCircle, ArrowDownLeft, ArrowUpRight, ShoppingBag, Receipt, CheckCircle2, AlertCircle } from 'lucide-react';
import { Account } from '../types/index.ts';
import { api } from '../services/api.ts';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onTransactionAdded: () => void;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  accounts,
  onTransactionAdded,
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');
  const [type, setType] = useState<'DEPOSIT' | 'TRANSFER_OUT' | 'PAYMENT' | 'INTEREST'>('DEPOSIT');
  const [amount, setAmount] = useState<string>('');
  const [counterparty, setCounterparty] = useState<string>('');
  const [category, setCategory] = useState<string>('General');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  const presets = [
    {
      label: 'Salary Credit',
      type: 'DEPOSIT' as const,
      amount: '75000',
      counterparty: 'Tata Consultancy Services',
      category: 'Salary',
      description: 'Monthly payroll salary credit',
    },
    {
      label: 'Amazon Shopping',
      type: 'PAYMENT' as const,
      amount: '2499',
      counterparty: 'Amazon India Retail',
      category: 'Shopping',
      description: 'Electronics & stationery order',
    },
    {
      label: 'Electricity Bill',
      type: 'PAYMENT' as const,
      amount: '1850',
      counterparty: 'State Electricity Board',
      category: 'Utilities',
      description: 'Monthly power utility bill',
    },
    {
      label: 'Food Delivery',
      type: 'PAYMENT' as const,
      amount: '680',
      counterparty: 'Zomato Food Delivery',
      category: 'Dining',
      description: 'Dinner delivery order',
    },
    {
      label: 'Mutual Fund SIP',
      type: 'TRANSFER_OUT' as const,
      amount: '10000',
      counterparty: 'Zerodha Broking Ltd',
      category: 'Investments',
      description: 'Automated index mutual fund SIP',
    },
  ];

  const applyPreset = (p: typeof presets[0]) => {
    setType(p.type);
    setAmount(p.amount);
    setCounterparty(p.counterparty);
    setCategory(p.category);
    setDescription(p.description);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than ₹0.');
      return;
    }

    if (!selectedAccountId && accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
    }

    const targetAccId = selectedAccountId || accounts[0]?.id;
    if (!targetAccId) {
      setError('No active account available.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.accounts.recordTransaction({
        accountId: targetAccId,
        type,
        amount: numAmount,
        counterparty: counterparty.trim() || undefined,
        category: category.trim() || undefined,
        description: description.trim() || (type === 'DEPOSIT' ? 'Deposit' : 'Payment'),
      });

      onTransactionAdded();
      onClose();
      // Reset fields
      setAmount('');
      setCounterparty('');
      setDescription('');
    } catch (err: any) {
      setError(err.message || 'Failed to record transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-[#DCE6E1]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#EDF3F0]">
          <div>
            <h3 className="text-xl font-serif text-[#102922] font-semibold">Record Transaction</h3>
            <p className="text-xs text-[#5D756C] mt-0.5">
              Add a realistic deposit, payment, or expense in Indian Rupees (₹)
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="mt-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#637C72] block mb-2">
            Quick 1-Click Realistic Presets:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(p)}
                className="rounded-lg border border-[#D5E0DB] bg-[#F8FAF9] px-2.5 py-1 text-[11px] font-medium text-[#1A4337] hover:border-[#1A4337] hover:bg-[#EBF3EF] transition-all"
              >
                {p.label} (₹{Number(p.amount).toLocaleString('en-IN')})
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Account Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Target Account</label>
            <select
              value={selectedAccountId || currentAccount?.id}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full rounded-xl border border-[#D5E0DB] px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#1A4337] focus:outline-hidden"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.accountNumber}) — Bal: ₹{acc.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </option>
              ))}
            </select>
          </div>

          {/* Type Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Transaction Flow</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType('DEPOSIT')}
                className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition-all ${
                  type === 'DEPOSIT'
                    ? 'border-[#1A4337] bg-[#EBF3EF] text-[#144234]'
                    : 'border-[#D5E0DB] text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" />
                <span>Deposit (+)</span>
              </button>

              <button
                type="button"
                onClick={() => setType('PAYMENT')}
                className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition-all ${
                  type === 'PAYMENT'
                    ? 'border-[#1A4337] bg-[#EBF3EF] text-[#144234]'
                    : 'border-[#D5E0DB] text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Receipt className="h-3.5 w-3.5 text-rose-600" />
                <span>Payment (-)</span>
              </button>

              <button
                type="button"
                onClick={() => setType('TRANSFER_OUT')}
                className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition-all ${
                  type === 'TRANSFER_OUT'
                    ? 'border-[#1A4337] bg-[#EBF3EF] text-[#144234]'
                    : 'border-[#D5E0DB] text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowUpRight className="h-3.5 w-3.5 text-amber-600" />
                <span>Transfer (-)</span>
              </button>
            </div>
          </div>

          {/* Amount input in Rupees */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Amount (INR)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-500 font-bold text-sm">₹</span>
              <input
                type="number"
                step="any"
                required
                min="1"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-[#D5E0DB] pl-8 pr-3.5 py-2.5 text-sm font-semibold font-mono text-slate-900 focus:border-[#1A4337] focus:ring-1 focus:ring-[#1A4337] focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Counterparty / Merchant */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Merchant / Recipient
              </label>
              <input
                type="text"
                placeholder="e.g. Amazon, TCS, Swiggy"
                value={counterparty}
                onChange={(e) => setCounterparty(e.target.value)}
                className="w-full rounded-xl border border-[#D5E0DB] px-3.5 py-2 text-xs text-slate-900 focus:border-[#1A4337] focus:outline-hidden"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-[#D5E0DB] px-3.5 py-2 text-xs text-slate-900 focus:border-[#1A4337] focus:outline-hidden"
              >
                <option value="Salary">Salary & Income</option>
                <option value="Shopping">Shopping & Retail</option>
                <option value="Dining">Food & Dining</option>
                <option value="Utilities">Utilities & Bills</option>
                <option value="Investments">Investments & SIP</option>
                <option value="Transfer">Bank Transfer</option>
                <option value="General">General Expenses</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Description / Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Monthly cloud subscription or groceries"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-[#D5E0DB] px-3.5 py-2 text-xs text-slate-900 focus:border-[#1A4337] focus:outline-hidden"
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#1A4337] py-3 text-sm font-semibold text-white shadow-xs hover:bg-[#13362C] active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Recording transaction...' : `Add Transaction (₹${amount ? Number(amount).toLocaleString('en-IN') : '0'})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
