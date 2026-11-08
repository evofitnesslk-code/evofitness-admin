'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Membership } from '@/types/database';
import { formatLKR, formatDate } from '@/lib/utils';
import { RecordPaymentModal } from './record-payment-modal';
import { CancelMembershipModal } from './cancel-membership-modal';
import { EmailButton } from '@/components/invoice/email-button';
import {
  ArrowLeft,
  Printer,
  CreditCard,
  XCircle,
  User,
  Calendar,
  Dumbbell,
  Receipt,
  AlertCircle,
} from 'lucide-react';

interface MembershipDetailClientProps {
  membership: Membership;
}

export function MembershipDetailClient({
  membership: initialMembership,
}: MembershipDetailClientProps) {
  const [membership] = useState<Membership>(initialMembership);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const balance = membership.outstanding_balance ?? 0;
  const isPaidInFull = balance <= 0;
  const isCancelled = membership.status === 'cancelled';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#27272A]">
        <div className="flex items-center gap-3">
          <Link
            href="/memberships"
            className="p-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-[#F4F4F5] border border-[#27272A] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-[#F4F4F5]">
                {membership.invoice_number}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  membership.status === 'active'
                    ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30'
                    : membership.status === 'cancelled'
                    ? 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30'
                    : 'bg-[#71717A]/10 text-[#A1A1AA] border border-[#71717A]/30'
                }`}
              >
                {membership.status}
              </span>
            </div>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              Issued on {formatDate(membership.created_at)} &bull; {membership.plan?.name}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <EmailButton
            membershipId={membership.id}
            memberEmail={membership.member?.email}
          />

          <Link
            href={`/memberships/${membership.id}/invoice`}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-xs font-semibold text-[#F4F4F5] transition-colors"
          >
            <Printer className="w-4 h-4 text-[#E5B842]" />
            <span>Print Invoice</span>
          </Link>

          {!isPaidInFull && !isCancelled && (
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-gradient text-[#09090B] font-bold text-xs hover:brightness-105 transition-all shadow-[0_2px_12px_rgba(229,184,66,0.2)] cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>Record Payment</span>
            </button>
          )}

          {!isCancelled && (
            <button
              onClick={() => setIsCancelModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#18181B] hover:bg-[#EF4444]/10 border border-[#27272A] hover:border-[#EF4444]/30 text-xs font-medium text-[#A1A1AA] hover:text-[#EF4444] transition-colors cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          )}
        </div>
      </div>

      {/* Cancellation Notice Banner if Cancelled */}
      {isCancelled && (
        <div className="p-4 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs text-[#EF4444] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              <strong>Cancelled on {formatDate(membership.cancelled_at)}:</strong>{' '}
              {membership.cancellation_reason}
            </span>
          </div>
          {membership.refund_amount > 0 && (
            <span className="font-bold">
              Refund Issued: {formatLKR(Number(membership.refund_amount))}
            </span>
          )}
        </div>
      )}

      {/* 3 Column Grid: Member, Plan & Dates, Financial Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Member Details */}
        <div className="card-luxury rounded-2xl p-5 bg-[#121214] space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#E5B842] flex items-center gap-2">
              <User className="w-4 h-4" />
              Member Information
            </h2>
            <Link
              href={`/members/${membership.member_id}`}
              className="text-[11px] text-[#E5B842] hover:underline"
            >
              View Profile
            </Link>
          </div>

          <div className="space-y-2 text-xs">
            <p className="font-semibold text-sm text-[#F4F4F5]">
              {membership.member?.full_name}
            </p>
            <p className="text-[#A1A1AA]">
              Phone: <span className="text-[#F4F4F5]">{membership.member?.phone}</span>
            </p>
            <p className="text-[#A1A1AA]">
              Email:{' '}
              <span className="text-[#F4F4F5]">
                {membership.member?.email || 'Not registered'}
              </span>
            </p>
            <p className="text-[#A1A1AA]">
              Gender:{' '}
              <span className="text-[#F4F4F5] uppercase">
                {membership.member?.gender}
              </span>
            </p>
          </div>
        </div>

        {/* Plan & Term */}
        <div className="card-luxury rounded-2xl p-5 bg-[#121214] space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#E5B842] flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Membership Term
          </h2>

          <div className="space-y-2 text-xs">
            <p className="font-semibold text-sm text-[#F4F4F5]">
              {membership.plan?.name}
            </p>
            <p className="text-[#A1A1AA]">
              Category: <span className="text-[#F4F4F5]">{membership.plan?.target_group}</span>
            </p>
            <p className="text-[#A1A1AA]">
              Start Date:{' '}
              <span className="text-[#F4F4F5] font-medium">
                {formatDate(membership.start_date)}
              </span>
            </p>
            <p className="text-[#A1A1AA]">
              Expiry Date:{' '}
              <span className="text-[#F4F4F5] font-medium">
                {formatDate(membership.end_date)}
              </span>
            </p>

            {membership.trainer && (
              <div className="pt-2 border-t border-[#27272A] flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-[#E5B842]" />
                <span className="text-[11px] text-[#F4F4F5]">
                  Personal Trainer: <strong>{membership.trainer.name}</strong>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Financial Summary */}
        <div className="card-luxury rounded-2xl p-5 bg-[#121214] space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#E5B842] flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            Financial Breakdown
          </h2>

          <div className="space-y-2 text-xs pb-3 border-b border-[#27272A]">
            <div className="flex justify-between text-[#A1A1AA]">
              <span>Base Plan Price:</span>
              <span className="text-[#F4F4F5]">{formatLKR(Number(membership.plan_price))}</span>
            </div>

            {membership.trainer_fee > 0 && (
              <div className="flex justify-between text-[#A1A1AA]">
                <span>PT Add-on:</span>
                <span className="text-[#F4F4F5]">+ {formatLKR(Number(membership.trainer_fee))}</span>
              </div>
            )}

            <div className="flex justify-between text-[#71717A] pt-1">
              <span>Subtotal:</span>
              <span>{formatLKR(Number(membership.subtotal))}</span>
            </div>

            {membership.discount_amount > 0 && (
              <div className="flex justify-between text-[#EF4444]">
                <span>
                  Discount ({membership.discount_type === 'percentage' ? `${membership.discount_value}%` : 'Fixed'}):
                </span>
                <span>- {formatLKR(Number(membership.discount_amount))}</span>
              </div>
            )}
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between font-bold text-sm">
              <span className="text-[#F4F4F5]">Total Due:</span>
              <span className="text-[#E5B842]">{formatLKR(Number(membership.total_due))}</span>
            </div>

            <div className="flex justify-between text-xs">
              <span className="text-[#A1A1AA]">Total Paid:</span>
              <span className="text-[#10B981] font-semibold">{formatLKR(membership.paid_amount ?? 0)}</span>
            </div>

            <div className="flex justify-between text-xs pt-1 border-t border-[#27272A]">
              <span className="text-[#A1A1AA]">Outstanding:</span>
              <span className={`font-bold ${balance > 0 ? 'text-[#F59E0B]' : 'text-[#10B981]'}`}>
                {balance > 0 ? formatLKR(balance) : 'Paid in Full'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Transactions Table */}
      <div className="card-luxury rounded-2xl p-6 bg-[#121214]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#E5B842] flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Payment Transactions ({membership.payments?.length || 0})
          </h2>

          {!isPaidInFull && !isCancelled && (
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="text-xs font-semibold text-[#E5B842] hover:underline"
            >
              + Record Payment
            </button>
          )}
        </div>

        {!membership.payments || membership.payments.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-[#18181B]/50 border border-[#27272A]">
            <p className="text-xs text-[#A1A1AA]">
              No payments recorded yet for this order.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#27272A] text-[11px] uppercase tracking-wider text-[#A1A1AA] bg-[#18181B]/70">
                  <th className="py-2.5 px-4">Date & Time</th>
                  <th className="py-2.5 px-4">Payment Method</th>
                  <th className="py-2.5 px-4">Notes / Ref</th>
                  <th className="py-2.5 px-4 text-right">Amount (LKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A]/50">
                {membership.payments.map((p) => (
                  <tr key={p.id} className="hover:bg-[#18181B]/40">
                    <td className="py-3 px-4 text-[#D4D4D8]">
                      {formatDate(p.payment_date)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-[#18181B] border border-[#27272A] uppercase font-bold text-[10px] text-[#E5B842]">
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#71717A]">
                      {p.notes || '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[#10B981]">
                      {formatLKR(Number(p.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        membershipId={membership.id}
        invoiceNumber={membership.invoice_number}
        outstandingBalance={balance}
      />

      <CancelMembershipModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        membershipId={membership.id}
        invoiceNumber={membership.invoice_number}
        totalPaid={membership.paid_amount ?? 0}
      />
    </div>
  );
}
