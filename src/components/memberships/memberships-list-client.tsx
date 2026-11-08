'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Membership } from '@/types/database';
import { formatLKR, formatDate } from '@/lib/utils';
import {
  Search,
  PlusCircle,
  Receipt,
  FileText,
  ChevronRight,
} from 'lucide-react';

interface MembershipsListClientProps {
  initialMemberships: Membership[];
}

export function MembershipsListClient({
  initialMemberships,
}: MembershipsListClientProps) {
  const [memberships] = useState<Membership[]>(initialMemberships);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = memberships.filter((m) => {
    const matchesSearch =
      !search ||
      m.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      m.member?.full_name.toLowerCase().includes(search.toLowerCase()) ||
      m.member?.phone.includes(search) ||
      m.plan?.name.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || m.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Search & Status Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by invoice (EF...), member, phone..."
              className="w-full h-10 pl-9 pr-4 bg-[#121214] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#E5B842]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 bg-[#121214] border border-[#27272A] rounded-xl text-xs text-[#A1A1AA] focus:outline-none focus:border-[#E5B842]"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <Link
          href="/memberships/new"
          className="h-10 px-4 rounded-xl bg-gold-gradient text-[#09090B] font-semibold text-xs hover:brightness-105 transition-all shadow-[0_2px_12px_rgba(229,184,66,0.2)] flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Order</span>
        </Link>
      </div>

      {/* Orders Table */}
      {filtered.length === 0 ? (
        <div className="card-luxury rounded-2xl p-12 text-center bg-[#121214]">
          <div className="w-12 h-12 rounded-full bg-[#18181B] border border-[#27272A] flex items-center justify-center text-[#71717A] mx-auto mb-3">
            <Receipt className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-[#F4F4F5]">
            No membership orders found
          </h3>
          <p className="text-xs text-[#A1A1AA] mt-1">
            {search ? 'Try adjusting search or status filter.' : 'Create your first membership order.'}
          </p>
        </div>
      ) : (
        <div className="card-luxury rounded-2xl bg-[#121214] overflow-hidden border border-[#27272A]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#27272A] bg-[#18181B]/70 text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Plan & Term</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Total Due</th>
                  <th className="py-3 px-4">Outstanding</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A]/60 text-xs">
                {filtered.map((m) => {
                  const hasBalance = (m.outstanding_balance ?? 0) > 0;

                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-[#18181B]/50 transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-[#E5B842]">
                        <Link
                          href={`/memberships/${m.id}`}
                          className="hover:underline"
                        >
                          {m.invoice_number}
                        </Link>
                      </td>

                      <td className="py-3.5 px-4">
                        <Link
                          href={`/members/${m.member_id}`}
                          className="font-semibold text-[#F4F4F5] hover:text-[#E5B842] block"
                        >
                          {m.member?.full_name}
                        </Link>
                        <span className="text-[11px] text-[#71717A]">
                          {m.member?.phone}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-medium text-[#D4D4D8] block">
                          {m.plan?.name}
                        </span>
                        <span className="text-[10px] text-[#71717A]">
                          {formatDate(m.start_date)} - {formatDate(m.end_date)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] uppercase font-bold ${
                            m.status === 'active'
                              ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30'
                              : m.status === 'cancelled'
                              ? 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30'
                              : 'bg-[#71717A]/10 text-[#A1A1AA] border border-[#71717A]/30'
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-[#F4F4F5]">
                        {formatLKR(Number(m.total_due))}
                      </td>

                      <td className="py-3.5 px-4">
                        {hasBalance ? (
                          <span className="inline-block px-2 py-0.5 rounded-md bg-[#FEF3C7]/10 text-[#F59E0B] border border-[#F59E0B]/30 font-semibold text-[11px]">
                            {formatLKR(m.outstanding_balance ?? 0)}
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#10B981] font-semibold">
                            Paid in Full
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            href={`/memberships/${m.id}/invoice`}
                            className="p-1.5 rounded-lg bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-[#E5B842] transition-colors"
                            title="Printable Invoice"
                          >
                            <FileText className="w-4 h-4" />
                          </Link>
                          <Link
                            href={`/memberships/${m.id}`}
                            className="p-1.5 rounded-lg bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-[#F4F4F5] transition-colors"
                            title="View Order"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
