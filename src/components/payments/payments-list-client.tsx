'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Payment, Member } from '@/types/database';
import { formatLKR, formatDate } from '@/lib/utils';
import { CreditCard, Search } from 'lucide-react';

interface PaymentsListClientProps {
  initialPayments: (Payment & {
    membership: {
      invoice_number: string;
      member?: Pick<Member, 'full_name' | 'phone'> | null;
      plan?: { name?: string | null } | null;
    } | null;
  })[];
}

export function PaymentsListClient({
  initialPayments,
}: PaymentsListClientProps) {
  const [payments] = useState(initialPayments);
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filtered = payments.filter((p) => {
    const matchesMethod =
      methodFilter === 'all' || p.payment_method === methodFilter;

    const matchesSearch =
      !search ||
      p.membership?.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      p.membership?.member?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.membership?.member?.phone?.includes(search) ||
      (p.notes && p.notes.toLowerCase().includes(search.toLowerCase()));

    return matchesMethod && matchesSearch;
  });

  const totalCollected = filtered.reduce((acc, p) => acc + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      {/* Search & Method Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by invoice, member name, phone..."
              className="w-full h-10 pl-9 pr-4 bg-[#121214] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#E5B842]"
            />
          </div>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="h-10 px-3 bg-[#121214] border border-[#27272A] rounded-xl text-xs text-[#A1A1AA] focus:outline-none focus:border-[#E5B842]"
          >
            <option value="all">All Methods</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="bank">Bank Transfer</option>
          </select>
        </div>

        <div className="px-4 py-2 rounded-xl bg-[#121214] border border-[#27272A] text-right shrink-0">
          <span className="text-[10px] text-[#A1A1AA] block">
            Filtered Collections ({filtered.length} txns)
          </span>
          <span className="text-sm font-bold text-[#E5B842]">
            {formatLKR(totalCollected)}
          </span>
        </div>
      </div>

      {/* Payments Table */}
      {filtered.length === 0 ? (
        <div className="card-luxury rounded-2xl p-12 text-center bg-[#121214]">
          <div className="w-12 h-12 rounded-full bg-[#18181B] border border-[#27272A] flex items-center justify-center text-[#71717A] mx-auto mb-3">
            <CreditCard className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-[#F4F4F5]">
            No payment records found
          </h3>
          <p className="text-xs text-[#A1A1AA] mt-1">
            {search ? 'Try adjusting your search filters.' : 'Recorded payments will appear here.'}
          </p>
        </div>
      ) : (
        <div className="card-luxury rounded-2xl bg-[#121214] overflow-hidden border border-[#27272A]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#27272A] bg-[#18181B]/70 text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Remarks</th>
                  <th className="py-3 px-4 text-right">Amount (LKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A]/60">
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-[#18181B]/50 transition-colors"
                  >
                    <td className="py-3.5 px-4 text-[#A1A1AA]">
                      {formatDate(p.payment_date)}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-[#E5B842]">
                      <Link
                        href={`/memberships/${p.membership_id}`}
                        className="hover:underline"
                      >
                        {p.membership?.invoice_number || '-'}
                      </Link>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-[#F4F4F5]">
                      {p.membership?.member?.full_name || '-'}
                    </td>

                    <td className="py-3.5 px-4 text-[#D4D4D8]">
                      {p.membership?.plan?.name || '-'}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-[#18181B] border border-[#27272A] uppercase font-bold text-[10px] text-[#F4F4F5]">
                        {p.payment_method}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-[#71717A]">
                      {p.notes || '-'}
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold text-[#10B981]">
                      {formatLKR(Number(p.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
