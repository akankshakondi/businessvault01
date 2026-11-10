import React, { useState } from 'react';
import { X, PlusCircle, CreditCard, Sparkles, AlertCircle } from 'lucide-react';
import { AccountType } from '../types/index.ts';
import { api } from '../services/api.ts';

interface NewAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountCreated: () => void;
}

export const NewAccountModal: React.FC<NewAccountModalProps> = ({
  isOpen,
  onClose,
  onAccountCreated,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('SAVINGS');
  const [currency, setCurrency] = useState('USD');
  const [initialDeposit, setInitialDeposit] = useState('5000');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide a name for this account.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.accounts.create({
        name,
        type,
        currency,
        initialDeposit: parseFloat(initialDeposit) || 0,
      });

      onAccountCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to open account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-purple-100 p-2 text-purple-700">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Open Financial Account</h3>
              <p className="text-xs text-slate-500">FDIC-insured enterprise custody</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Account Display Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Q4 Tax Reserve / Operating Account"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#1A4337] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Account Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: 'SAVINGS' as const, label: 'High-Yield Savings', apy: '5.50% p.a.' },
                { type: 'CHECKING' as const, label: 'Current Operating', apy: '0.00% p.a.' },
                { type: 'BUSINESS' as const, label: 'Commercial Business', apy: '3.25% p.a.' },
                { type: 'INVESTMENT' as const, label: 'Equities & Demat', apy: 'Custody' },
              ].map((item) => (
                <div
                  key={item.type}
                  onClick={() => setType(item.type)}
                  className={`cursor-pointer rounded-2xl p-3 border transition-all ${
                    type === item.type
                      ? 'border-[#1A4337] bg-[#EBF3EF] ring-1 ring-[#1A4337]'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="text-xs font-bold text-slate-900">{item.label}</p>
                  <p className="text-[10px] text-[#1A4337] font-semibold mt-0.5">{item.apy}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Opening Deposit (₹)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-2 text-slate-400 font-bold text-xs">₹</span>
              <input
                type="number"
                min="0"
                step="500"
                value={initialDeposit}
                onChange={(e) => setInitialDeposit(e.target.value)}
                className="w-full rounded-xl border border-slate-200 pl-8 pr-3.5 py-2 text-xs font-bold text-slate-900 focus:border-[#1A4337] focus:outline-hidden"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#1A4337] py-3 text-xs font-bold text-white shadow-xs hover:bg-[#13362C] disabled:opacity-50 transition-all"
            >
              {isSubmitting ? 'Opening Account...' : 'Confirm & Open Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
