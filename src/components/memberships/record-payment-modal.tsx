'use client';

import { useState } from 'react';
import { recordPayment } from '@/app/actions/payments';
import type { PaymentMethod } from '@/types/database';
import { formatLKR } from '@/lib/utils';
import { X, CreditCard, AlertCircle } from 'lucide-react';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  membershipId: string;
  invoiceNumber: string;
  outstandingBalance: number;
}

export function RecordPaymentModal({
  isOpen,
  onClose,
  membershipId,
  invoiceNumber,
  outstandingBalance,
}: RecordPaymentModalProps) {
  const [amount, setAmount] = useState<number>(outstandingBalance);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (amount <= 0) {
      setError('Payment amount must be greater than zero.');
      return;
    }

    if (amount > outstandingBalance) {
      setError(
        `Amount cannot exceed the remaining balance (${formatLKR(outstandingBalance)}).`
      );
      return;
    }

    setLoading(true);

    try {
      const res = await recordPayment({
        membership_id: membershipId,
        amount,
        payment_method: paymentMethod,
        notes: notes || undefined,
      });

      if (res.error) {
        setError(res.error);
        setLoading(false);
        return;
      }

      setLoading(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment.');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-[#121214] border border-[#27272A] rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#27272A]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#E5B842]/10 border border-[#E5B842]/20 flex items-center justify-center text-[#E5B842]">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#F4F4F5]">
                Record Payment
              </h2>
              <p className="text-[11px] text-[#A1A1AA]">
                Invoice #{invoiceNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#A1A1AA] hover:text-[#F4F4F5]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs text-[#EF4444] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-[#18181B] border border-[#27272A] flex justify-between items-center">
            <span className="text-[#A1A1AA]">Remaining Balance:</span>
            <span className="font-bold text-[#E5B842] text-sm">
              {formatLKR(outstandingBalance)}
            </span>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium text-[#D4D4D8]">
                Payment Amount (LKR)
              </label>
              <button
                type="button"
                onClick={() => setAmount(outstandingBalance)}
                className="text-[10px] text-[#E5B842] hover:underline"
              >
                Pay Full Balance
              </button>
            </div>
            <input
              type="number"
              min="1"
              max={outstandingBalance}
              required
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full h-10 px-3 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] focus:outline-none focus:border-[#E5B842]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['cash', 'card', 'bank'] as PaymentMethod[]).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 text-[11px] font-semibold uppercase rounded-xl border transition-colors ${
                    paymentMethod === method
                      ? 'bg-[#E5B842] text-[#09090B] border-[#E5B842]'
                      : 'bg-[#18181B] text-[#A1A1AA] border-[#27272A] hover:text-[#F4F4F5]'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
              Payment Notes / Reference (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Card slip #1029, Bank transfer ref..."
              className="w-full h-10 px-3 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] focus:outline-none focus:border-[#E5B842]"
            />
          </div>

          <div className="pt-3 border-t border-[#27272A] flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-[#A1A1AA] hover:text-[#F4F4F5]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-gold-gradient text-[#09090B] font-bold text-xs hover:brightness-105 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Recording...' : 'Confirm Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
