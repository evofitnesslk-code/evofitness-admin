'use client';

import { useState } from 'react';
import { cancelMembership } from '@/app/actions/memberships';
import { formatLKR } from '@/lib/utils';
import { X, AlertTriangle, ShieldAlert } from 'lucide-react';

interface CancelMembershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  membershipId: string;
  invoiceNumber: string;
  totalPaid: number;
}

export function CancelMembershipModal({
  isOpen,
  onClose,
  membershipId,
  invoiceNumber,
  totalPaid,
}: CancelMembershipModalProps) {
  const [reason, setReason] = useState('');
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!reason.trim()) {
      setError('A cancellation reason is strictly required.');
      return;
    }

    if (refundAmount < 0) {
      setError('Refund amount cannot be negative.');
      return;
    }

    if (refundAmount > totalPaid) {
      setError(
        `Refund amount cannot exceed total paid (${formatLKR(totalPaid)}).`
      );
      return;
    }

    setLoading(true);

    try {
      const res = await cancelMembership(membershipId, reason, refundAmount);

      if (res.error) {
        setError(res.error);
        setLoading(false);
        return;
      }

      setLoading(false);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to cancel membership.');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-[#121214] border border-[#EF4444]/40 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#27272A]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-center justify-center text-[#EF4444]">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#EF4444]">
                Cancel Membership
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
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
            Cancelling this membership will deactivate access while permanently preserving the financial record and history for reporting.
          </p>

          <div>
            <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
              Cancellation Reason <span className="text-[#EF4444]">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Relocating overseas, medical injury, member request..."
              className="w-full p-3 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] focus:outline-none focus:border-[#EF4444]"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium text-[#D4D4D8]">
                Refund Amount (LKR, optional)
              </label>
              <span className="text-[10px] text-[#71717A]">
                Max eligible: {formatLKR(totalPaid)}
              </span>
            </div>
            <input
              type="number"
              min="0"
              max={totalPaid}
              value={refundAmount}
              onChange={(e) => setRefundAmount(Number(e.target.value))}
              className="w-full h-10 px-3 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] focus:outline-none focus:border-[#EF4444]"
            />
          </div>

          <div className="pt-3 border-t border-[#27272A] flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-[#A1A1AA] hover:text-[#F4F4F5]"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-[#EF4444] text-white font-bold text-xs hover:bg-[#DC2626] disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Processing...' : 'Confirm Cancellation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
