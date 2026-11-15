'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { PendingPayment } from '@/types/database';
import { formatLKR, formatDate } from '@/lib/utils';
import { RecordPaymentModal } from '@/components/memberships/record-payment-modal';
import { Search, CreditCard, Phone, Mail } from 'lucide-react';

type StatusFilter = 'outstanding' | 'unpaid' | 'partial' | 'overdue' | 'paid';

const STATUS_STYLE: Record<string, string> = {
  unpaid: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30',
  partial: 'bg-[#E5B842]/10 text-[#E5B842] border-[#E5B842]/30',
  paid: 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30',
};
const STATUS_LABEL: Record<string, string> = {
  unpaid: 'Unpaid',
  partial: 'Partially paid',
  paid: 'Paid',
};

export function PendingPaymentsClient({ rows }: { rows: PendingPayment[] }) {
  const [status, setStatus] = useState<StatusFilter>('outstanding');
  const [search, setSearch] = useState('');
  const [paying, setPaying] = useState<PendingPayment | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    return rows.filter((r) => {
      const okStatus =
        status === 'outstanding'
          ? r.balance > 0
          : status === 'overdue'
          ? r.is_overdue
          : r.payment_status === status;
      if (!okStatus) return false;
      if (!q) return true;
      return (
        r.invoice_number.toLowerCase().includes(q) ||
        r.member_name.toLowerCase().includes(q) ||
        r.plan_name.toLowerCase().includes(q) ||
        (qDigits.length > 0 && (r.member_phone ?? '').replace(/\D/g, '').includes(qDigits))
      );
    });
  }, [rows, status, search]);

  const totalOutstanding = filtered.reduce((a, r) => a + r.balance, 0);
  const overdueCount = rows.filter((r) => r.is_overdue).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row gap-2 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by invoice, member, phone, plan..."
              className="w-full h-10 pl-9 pr-4 bg-[#121214] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#E5B842]"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="h-10 px-3 bg-[#121214] border border-[#27272A] rounded-xl text-xs text-[#A1A1AA] focus:outline-none focus:border-[#E5B842]"
          >
            <option value="outstanding">All outstanding</option>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partially paid</option>
            <option value="overdue">Overdue ({overdueCount})</option>
            <option value="paid">Paid in full</option>
          </select>
        </div>

        <div className="px-4 py-2 rounded-xl bg-[#121214] border border-[#27272A] text-right shrink-0">
          <span className="text-[10px] text-[#A1A1AA] block">
            Outstanding ({filtered.length} memberships)
          </span>
          <span className="text-sm font-bold text-[#F59E0B]">{formatLKR(totalOutstanding)}</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card-luxury rounded-2xl p-10 bg-[#121214] text-center">
          <p className="text-sm font-semibold text-[#F4F4F5]">
            {rows.length === 0 || (status === 'outstanding' && !search)
              ? 'No pending balances'
              : 'No results match your filters'}
          </p>
          <p className="text-xs text-[#A1A1AA] mt-1">
            {status === 'outstanding' && !search
              ? 'Every membership is settled.'
              : 'Try a different search or status.'}
          </p>
        </div>
      ) : (
        <div className="card-luxury rounded-2xl bg-[#121214] overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#27272A] text-[11px] uppercase tracking-wider text-[#A1A1AA] bg-[#18181B]/70">
                <th className="py-2.5 px-4">Member</th>
                <th className="py-2.5 px-4">Invoice</th>
                <th className="py-2.5 px-4 text-right">Total</th>
                <th className="py-2.5 px-4 text-right">Paid</th>
                <th className="py-2.5 px-4 text-right">Balance</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Promised by</th>
                <th className="py-2.5 px-4">Age</th>
                <th className="py-2.5 px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]/50">
              {filtered.map((r) => (
                <tr key={r.membership_id} className="hover:bg-[#18181B]/40 align-top">
                  <td className="py-3 px-4">
                    <Link
                      href={`/members/${r.member_id}`}
                      className="font-semibold text-[#F4F4F5] hover:text-[#E5B842]"
                    >
                      {r.member_name}
                    </Link>
                    <div className="mt-1 space-y-0.5 text-[11px] text-[#A1A1AA]">
                      {r.member_phone && (
                        <a href={`tel:${r.member_phone}`} className="flex items-center gap-1 hover:text-[#F4F4F5]">
                          <Phone className="w-3 h-3" />
                          {r.member_phone}
                        </a>
                      )}
                      {r.member_email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {r.member_email}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Link
                      href={`/memberships/${r.membership_id}`}
                      className="font-semibold text-[#E5B842] hover:underline"
                    >
                      {r.invoice_number}
                    </Link>
                    <div className="text-[11px] text-[#71717A]">{r.plan_name}</div>
                  </td>
                  <td className="py-3 px-4 text-right text-[#D4D4D8]">{formatLKR(r.total_due)}</td>
                  <td className="py-3 px-4 text-right text-[#10B981]">{formatLKR(r.paid)}</td>
                  <td className="py-3 px-4 text-right font-bold text-[#F59E0B]">
                    {r.balance > 0 ? formatLKR(r.balance) : '-'}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${
                        STATUS_STYLE[r.payment_status] ?? ''
                      }`}
                    >
                      {STATUS_LABEL[r.payment_status] ?? r.payment_status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {r.balance > 0 && r.balance_due_date ? (
                      <div className="space-y-1">
                        <span className="text-[#D4D4D8]">{formatDate(r.balance_due_date)}</span>
                        {r.is_overdue && (
                          <span className="block w-fit px-2 py-0.5 rounded-full bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30 text-[10px] font-bold uppercase">
                            Overdue
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[#71717A]">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-[#A1A1AA]">
                    {r.balance > 0 ? (
                      <>
                        <div>{r.days_since_start}d since start</div>
                        <div className="text-[11px] text-[#71717A]">
                          {r.last_payment_at
                            ? `last paid ${r.days_since_activity}d ago`
                            : 'no payment yet'}
                        </div>
                      </>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {r.balance > 0 && (
                      <button
                        onClick={() => setPaying(r)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gold-gradient text-[#09090B] font-bold text-[11px] hover:brightness-105 cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Record
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {paying && (
        <RecordPaymentModal
          key={`${paying.membership_id}-${paying.balance}`}
          isOpen
          onClose={() => setPaying(null)}
          membershipId={paying.membership_id}
          invoiceNumber={paying.invoice_number}
          outstandingBalance={paying.balance}
        />
      )}
    </div>
  );
}
