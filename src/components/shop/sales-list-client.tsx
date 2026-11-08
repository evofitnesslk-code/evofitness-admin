'use client';

import { Fragment, useMemo, useState } from 'react';
import { voidSale } from '@/app/actions/shop';
import type { Profile, ProductSale } from '@/types/database';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Receipt,
  Search,
  Trash2,
  X,
} from 'lucide-react';

interface SalesListClientProps {
  initialSales: ProductSale[];
  profile: Profile | null;
}

function lkr(n: number): string {
  return `LKR ${Number(n).toLocaleString('en-LK')}`;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function customerLabel(s: ProductSale): string {
  if (s.member?.full_name) return s.member.full_name;
  if (s.customer_name) return s.customer_name;
  return 'Walk-in';
}

export function SalesListClient({ initialSales, profile }: SalesListClientProps) {
  const [sales, setSales] = useState<ProductSale[]>(initialSales);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [voidTarget, setVoidTarget] = useState<ProductSale | null>(null);
  const [voiding, setVoiding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const isManager = profile?.role === 'admin' || profile?.role === 'accountant';

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return sales;
    return sales.filter(
      (sa) =>
        sa.sale_number.toLowerCase().includes(s) ||
        (sa.customer_name ?? '').toLowerCase().includes(s) ||
        (sa.member?.full_name ?? '').toLowerCase().includes(s)
    );
  }, [sales, search]);

  async function handleVoid() {
    if (!voidTarget) return;
    setVoiding(true);
    setActionError(null);
    setActionSuccess(null);
    const res = await voidSale(voidTarget.id);
    setVoiding(false);
    if (res && 'error' in res && res.error) {
      setActionError(res.error);
      return;
    }
    setSales(sales.filter((sa) => sa.id !== voidTarget.id));
    if (expandedId === voidTarget.id) setExpandedId(null);
    setVoidTarget(null);
    setActionSuccess(`Sale ${voidTarget.sale_number} voided; stock restored.`);
  }

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs text-[#EF4444] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}
      {actionSuccess && (
        <div className="p-3 rounded-xl bg-[#10B981]/10 border border-[#10B981]/30 text-xs text-[#10B981] flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{actionSuccess}</span>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by sale no. or customer..."
          className="w-full min-h-[44px] pl-10 pr-3 bg-[#121214] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] placeholder:text-[#71717A] focus:outline-none focus:border-[#E5B842]"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl p-12 text-center bg-[#121214] border border-[#27272A]">
          <Receipt className="w-8 h-8 text-[#71717A] mx-auto mb-2" />
          <p className="text-xs text-[#A1A1AA]">
            {sales.length === 0
              ? 'No sales recorded yet.'
              : 'No sales match your search.'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#121214] border border-[#27272A] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[680px]">
              <thead>
                <tr className="border-b border-[#27272A] text-left text-[10px] uppercase tracking-wide text-[#71717A]">
                  <th className="px-4 py-3 font-semibold">Sale No.</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold text-right">Items</th>
                  <th className="px-4 py-3 font-semibold text-right">Total</th>
                  <th className="px-4 py-3 font-semibold">Method</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sa) => {
                  const expanded = expandedId === sa.id;
                  const itemCount =
                    sa.items?.reduce((sum, it) => sum + Number(it.qty), 0) ?? 0;
                  return (
                    <Fragment key={sa.id}>
                      <tr className="border-b border-[#27272A] last:border-0 hover:bg-[#18181B]/60">
                        <td className="px-4 py-3 font-semibold text-[#F4F4F5]">
                          {sa.sale_number}
                        </td>
                        <td className="px-4 py-3 text-[#A1A1AA] whitespace-nowrap">
                          {formatDateTime(sa.sold_at)}
                        </td>
                        <td className="px-4 py-3 text-[#D4D4D8]">
                          {customerLabel(sa)}
                          {sa.member && (
                            <span className="block text-[10px] text-[#71717A]">
                              Member
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-[#D4D4D8]">
                          {itemCount}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-[#E5B842]">
                          {lkr(Number(sa.total_due))}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#18181B] text-[#A1A1AA] border border-[#27272A]">
                            {sa.payment_method}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() =>
                                setExpandedId(expanded ? null : sa.id)
                              }
                              aria-expanded={expanded}
                              className="min-h-[44px] min-w-[44px] px-2 rounded-lg bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-[#F4F4F5] border border-[#27272A] transition-colors flex items-center justify-center gap-1 text-[11px]"
                            >
                              <ChevronDown
                                className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
                              />
                              <span className="hidden sm:inline">
                                {expanded ? 'Hide' : 'Receipt'}
                              </span>
                            </button>
                            {isManager && (
                              <button
                                onClick={() => {
                                  setActionError(null);
                                  setActionSuccess(null);
                                  setVoidTarget(sa);
                                }}
                                aria-label={`Void sale ${sa.sale_number}`}
                                className="min-h-[44px] min-w-[44px] rounded-lg bg-[#18181B] hover:bg-[#EF4444]/10 text-[#A1A1AA] hover:text-[#EF4444] border border-[#27272A] transition-colors flex items-center justify-center"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="bg-[#18181B]/40">
                          <td colSpan={7} className="px-4 py-3">
                            <div className="rounded-xl border border-[#27272A] bg-[#121214] p-4 max-w-md">
                              <div className="flex items-center justify-between pb-2 border-b border-dashed border-[#27272A]">
                                <span className="text-xs font-bold text-[#F4F4F5]">
                                  {sa.sale_number}
                                </span>
                                <span className="text-[11px] text-[#71717A]">
                                  {formatDateTime(sa.sold_at)}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#A1A1AA] mt-2">
                                Customer: {customerLabel(sa)}
                                {sa.member?.phone
                                  ? ` · ${sa.member.phone}`
                                  : ''}
                              </p>
                              <p className="text-[11px] text-[#A1A1AA]">
                                Payment: {sa.payment_method}
                              </p>
                              {!sa.items || sa.items.length === 0 ? (
                                <p className="text-[11px] text-[#71717A] mt-2">
                                  No line detail recorded.
                                </p>
                              ) : (
                                <ul className="mt-2 space-y-1.5">
                                  {sa.items.map((item) => (
                                    <li
                                      key={item.id}
                                      className="flex items-center justify-between gap-2 text-[11px] text-[#D4D4D8]"
                                    >
                                      <span>
                                        {item.product?.description ?? 'Item'} ×{' '}
                                        {item.qty}
                                      </span>
                                      <span className="font-semibold text-[#F4F4F5]">
                                        {lkr(Number(item.amount))}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                              <div className="flex items-center justify-between pt-2 mt-2 border-t border-dashed border-[#27272A]">
                                <span className="text-[11px] text-[#A1A1AA]">
                                  Total due
                                </span>
                                <span className="text-xs font-bold text-[#E5B842]">
                                  {lkr(Number(sa.total_due))}
                                </span>
                              </div>
                              {sa.notes && (
                                <p className="text-[11px] text-[#71717A] mt-1">
                                  Notes: {sa.notes}
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {voidTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[#121214] border border-[#27272A] rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272A]">
              <h3 className="text-sm font-bold text-[#F4F4F5]">Void Sale</h3>
              <button
                onClick={() => setVoidTarget(null)}
                aria-label="Close void dialog"
                className="min-h-[44px] min-w-[44px] rounded-lg text-[#A1A1AA] hover:text-[#F4F4F5] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="mt-4 text-xs text-[#D4D4D8]">
              Void sale{' '}
              <span className="font-bold text-[#F4F4F5]">
                {voidTarget.sale_number}
              </span>{' '}
              ({lkr(Number(voidTarget.total_due))})? Sold stock will be
              restored. This cannot be undone.
            </p>
            <div className="pt-4 mt-4 border-t border-[#27272A] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setVoidTarget(null)}
                className="min-h-[44px] px-4 rounded-xl text-xs text-[#A1A1AA] hover:text-[#F4F4F5]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVoid}
                disabled={voiding}
                className="min-h-[44px] px-4 rounded-xl bg-[#EF4444] text-white font-bold text-xs hover:brightness-110 disabled:opacity-50"
              >
                {voiding ? 'Voiding...' : 'Void Sale'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
