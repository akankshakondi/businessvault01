import React, { useState } from 'react';
import { X, ArrowRightLeft, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Account } from '../types/index.ts';
import { api } from '../services/api.ts';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onTransferSuccess: () => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  accounts,
  onTransferSuccess,
}) => {
  const [transferType, setTransferType] = useState<'INTERNAL' | 'EXTERNAL'>('INTERNAL');
  const [sourceAccountId, setSourceAccountId] = useState(accounts[0]?.id || '');
  const [targetAccountId, setTargetAccountId] = useState(accounts[1]?.id || '');
  const [recipientName, setRecipientName] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ ref: string; amount: number } | null>(null);

  if (!isOpen) return null;

  const sourceAccount = accounts.find((a) => a.id === sourceAccountId) || accounts[0];
  const numAmount = parseFloat(amount) || 0;
  const wireFee = transferType === 'EXTERNAL' && numAmount > 5000 ? 15.0 : 0.0;
  const totalDeduction = numAmount + wireFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (numAmount <= 0) {
      setError('Please specify a positive transfer amount.');
      return;
    }

    if (sourceAccount && totalDeduction > sourceAccount.available) {
      setError(`Insufficient available balance ($${sourceAccount.available.toFixed(2)}).`);
      return;
    }

    if (transferType === 'INTERNAL' && sourceAccountId === targetAccountId) {
      setError('Source and destination accounts must be different.');
      return;
    }

    if (transferType === 'EXTERNAL' && (!recipientName || !routingNumber || !accountNumber)) {
      setError('Please provide all wire routing and beneficiary details.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.accounts.transfer({
        sourceAccountId,
        destinationType: transferType,
        targetAccountId: transferType === 'INTERNAL' ? targetAccountId : undefined,
        recipientName: transferType === 'EXTERNAL' ? recipientName : undefined,
        routingNumber: transferType === 'EXTERNAL' ? routingNumber : undefined,
        accountNumber: transferType === 'EXTERNAL' ? accountNumber : undefined,
        amount: numAmount,
        note,
      });

      setSuccessInfo({ ref: res.referenceId, amount: numAmount });
      onTransferSuccess();
    } catch (err: any) {
      setError(err.message || 'Transfer failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSuccessInfo(null);
    setAmount('');
    setNote('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-purple-100 p-2 text-purple-700">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Execute Money Transfer</h3>
              <p className="text-xs text-slate-500">Internal liquidity sweep or external ACH/wire</p>
            </div>
          </div>
          <button onClick={handleReset} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {successInfo ? (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h4 className="text-xl font-bold text-slate-900">Transfer Initiated!</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              ₹{successInfo.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} transferred successfully.
            </p>
            <div className="rounded-2xl bg-slate-50 p-4 font-mono text-xs text-slate-700 border border-slate-200">
              <span className="text-[10px] uppercase text-slate-400 block font-sans font-semibold">
                Reference ID
              </span>
              <span className="font-bold text-[#1A4337]">{successInfo.ref}</span>
            </div>
            <button
              onClick={handleReset}
              className="mt-4 w-full rounded-xl bg-[#1A4337] py-3 text-xs font-bold text-white hover:bg-[#13362C] transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700 border border-rose-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Transfer Type Selector */}
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setTransferType('INTERNAL')}
                className={`rounded-lg py-2 text-xs font-bold transition-all ${
                  transferType === 'INTERNAL' ? 'bg-white text-[#102922] shadow-xs' : 'text-slate-600'
                }`}
              >
                Internal Accounts
              </button>
              <button
                type="button"
                onClick={() => setTransferType('EXTERNAL')}
                className={`rounded-lg py-2 text-xs font-bold transition-all ${
                  transferType === 'EXTERNAL' ? 'bg-white text-[#102922] shadow-xs' : 'text-slate-600'
                }`}
              >
                NEFT / RTGS / IMPS
              </button>
            </div>

            {/* Source Account */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">From Account</label>
              <select
                value={sourceAccountId}
                onChange={(e) => setSourceAccountId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:border-[#1A4337] focus:outline-hidden"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.accountNumber.slice(-4)}) - Available: ₹{a.available.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </option>
                ))}
              </select>
            </div>

            {/* Destination Selection */}
            {transferType === 'INTERNAL' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">To Account</label>
                <select
                  value={targetAccountId}
                  onChange={(e) => setTargetAccountId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:border-[#1A4337] focus:outline-hidden"
                >
                  {accounts
                    .filter((a) => a.id !== sourceAccountId)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.accountNumber.slice(-4)}) - Balance: ₹{a.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Beneficiary Legal Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Tech Solutions Pvt Ltd"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-[#1A4337] focus:outline-hidden"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. HDFC0000210"
                      value={routingNumber}
                      onChange={(e) => setRoutingNumber(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-mono uppercase focus:border-[#1A4337] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Account Number</label>
                    <input
                      type="text"
                      required
                      placeholder="Beneficiary account"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-mono focus:border-[#1A4337] focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Transfer Amount (INR)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-8 pr-4 py-2 text-base font-bold text-slate-900 focus:border-[#1A4337] focus:outline-hidden"
                />
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Memo / Purpose (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Vendor payment, Consulting fees"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-[#1A4337] focus:outline-hidden"
              />
            </div>

            {/* Fee summary */}
            <div className="rounded-2xl bg-slate-50 p-3.5 text-xs text-slate-600 border border-slate-200/80 space-y-1.5">
              <div className="flex justify-between">
                <span>Clearing Fee:</span>
                <span className="font-semibold text-slate-900 font-mono">
                  {wireFee > 0 ? `₹${wireFee.toFixed(2)}` : 'FREE (₹0.00)'}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-slate-900">
                <span>Total Debit:</span>
                <span className="font-mono text-[#1A4337]">
                  ₹{totalDeduction.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#1A4337] py-3 text-xs font-bold text-white shadow-xs hover:bg-[#13362C] disabled:opacity-50 transition-all"
            >
              {isSubmitting ? 'Verifying & Executing...' : 'Authorize Transfer'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
