'use client';

import { Fragment, useMemo, useState } from 'react';
import { deletePurchase } from '@/app/actions/shop';
import type { Profile, StockPurchase } from '@/types/database';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ReceiptText,
  Search,
  Trash2,
  X,
} from 'lucide-react';

interface PurchasesListClientProps {
  initialPurchases: StockPurchase[];
  profile: Profile | null;
}

function lkr(n: number): string {
  return `LKR ${Number(n).toLocaleString('en-LK')}`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function PurchasesListClient({
  initialPurchases,
  profile,
}: PurchasesListClientProps) {
  const [purchases, setPurchases] = useState<StockPurchase[]>(initialPurchases);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StockPurchase | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const isManager = profile?.role === 'admin' || profile?.role === 'accountant';

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return purchases;
    return purchases.filter(
      (p) =>
        p.invoice_grn_no.toLowerCase().includes(s) ||
        (p.supplier?.name ?? '').toLowerCase().includes(s)
    );
  }, [purchases, search]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError(null);
    setActionSuccess(null);
    const res = await deletePurchase(deleteTarget.id);
    setDeleting(false);
    if (res && 'error' in res && res.error) {
      setActionError(res.error);
      return;
    }
    setPurchases(purchases.filter((p) => p.id !== deleteTarget.id));
    if (expandedId === deleteTarget.id) setExpandedId(null);
    setDeleteTarget(null);
    setActionSuccess(`Purchase ${deleteTarget.invoice_grn_no} deleted.`);
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
          placeholder="Search by GRN no. or supplier..."
          className="w-full min-h-[44px] pl-10 pr-3 bg-[#121214] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] placeholder:text-[#71717A] focus:outline-none focus:border-[#E5B842]"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl p-12 text-center bg-[#121214] border border-[#27272A]">
          <ReceiptText className="w-8 h-8 text-[#71717A] mx-auto mb-2" />
          <p className="text-xs text-[#A1A1AA]">
            {purchases.length === 0
              ? 'No purchases recorded yet.'
              : 'No purchases match your search.'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#121214] border border-[#27272A] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[640px]">
              <thead>
                <tr className="border-b border-[#27272A] text-left text-[10px] uppercase tracking-wide text-[#71717A]">
                  <th className="px-4 py-3 font-semibold">Invoice / GRN No.</th>
                  <th className="px-4 py-3 font-semibold">Supplier</th>
                  <th className="px-4 py-3 font-semibold">Purchase Date</th>
                  <th className="px-4 py-3 font-semibold text-right">Lines</th>
                  <th className="px-4 py-3 font-semibold text-right">Amount</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const expanded = expandedId === p.id;
                  const lineCount = p.items?.length ?? 0;
                  return (
                    <Fragment key={p.id}>
                      <tr className="border-b border-[#27272A] last:border-0 hover:bg-[#18181B]/60">
                        <td className="px-4 py-3 font-semibold text-[#F4F4F5]">
                          {p.invoice_grn_no}
                        </td>
                        <td className="px-4 py-3 text-[#D4D4D8]">
                          {p.supplier?.name ?? '-'}
                        </td>
                        <td className="px-4 py-3 text-[#A1A1AA]">
                          {formatDate(p.purchase_date)}
                        </td>
                        <td className="px-4 py-3 text-right text-[#D4D4D8]">
                          {lineCount}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-[#E5B842]">
                          {lkr(Number(p.subtotal))}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() =>
                                setExpandedId(expanded ? null : p.id)
                              }
                              aria-expanded={expanded}
                              className="min-h-[44px] min-w-[44px] px-2 rounded-lg bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-[#F4F4F5] border border-[#27272A] transition-colors flex items-center justify-center gap-1 text-[11px]"
                            >
                              <ChevronDown
                                className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
                              />
                              <span className="hidden sm:inline">
                                {expanded ? 'Hide' : 'Lines'}
                              </span>
                            </button>
                            {isManager && (
                              <button
                                onClick={() => {
                                  setActionError(null);
                                  setActionSuccess(null);
                                  setDeleteTarget(p);
                                }}
                                aria-label={`Delete purchase ${p.invoice_grn_no}`}
                                className="min-h-[44px] min-w-[44px] rounded-lg bg-[#18181B] hover:bg-[#EF4444]/10 text-[#A1A1AA] hover:text-[#EF4444] border border-[#27272A] transition-colors flex items-center justify-center"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expanded && (
                        <tr key={`${p.id}-detail`} className="bg-[#18181B]/40">
                          <td colSpan={6} className="px-4 py-3">
                            {p.notes && (
                              <p className="text-[11px] text-[#A1A1AA] mb-2">
                                Notes: {p.notes}
                              </p>
                            )}
                            {!p.items || p.items.length === 0 ? (
                              <p className="text-[11px] text-[#71717A]">
                                No line detail recorded.
                              </p>
                            ) : (
                              <div className="overflow-x-auto rounded-xl border border-[#27272A]">
                                <table className="w-full text-[11px] min-w-[560px]">
                                  <thead>
                                    <tr className="bg-[#121214] text-left text-[10px] uppercase tracking-wide text-[#71717A]">
                                      <th className="px-3 py-2 font-semibold">
                                        Inventory ID
                                      </th>
                                      <th className="px-3 py-2 font-semibold">
                                        Description
                                      </th>
                                      <th className="px-3 py-2 font-semibold text-right">
                                        Unit Price
                                      </th>
                                      <th className="px-3 py-2 font-semibold text-right">
                                        QTY
                                      </th>
                                      <th className="px-3 py-2 font-semibold text-right">
                                        Amount
                                      </th>
                                      <th className="px-3 py-2 font-semibold text-right">
                                        Sale Price
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {p.items.map((item) => (
                                      <tr
                                        key={item.id}
                                        className="border-t border-[#27272A] text-[#D4D4D8]"
                                      >
                                        <td className="px-3 py-2 font-mono text-[#A1A1AA]">
                                          {item.product?.inventory_code ?? '-'}
                                        </td>
                                        <td className="px-3 py-2">
                                          {item.product?.description ?? '-'}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                          {lkr(Number(item.unit_price))}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                          {item.qty}
                                        </td>
                                        <td className="px-3 py-2 text-right font-semibold text-[#F4F4F5]">
                                          {lkr(Number(item.amount))}
                                        </td>
                                        <td className="px-3 py-2 text-right text-[#E5B842]">
                                          {lkr(Number(item.sale_price))}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
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

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[#121214] border border-[#27272A] rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272A]">
              <h3 className="text-sm font-bold text-[#F4F4F5]">
                Delete Purchase
              </h3>
              <button
                onClick={() => setDeleteTarget(null)}
                aria-label="Close delete dialog"
                className="min-h-[44px] min-w-[44px] rounded-lg text-[#A1A1AA] hover:text-[#F4F4F5] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="mt-4 text-xs text-[#D4D4D8]">
              Delete GRN{' '}
              <span className="font-bold text-[#F4F4F5]">
                {deleteTarget.invoice_grn_no}
              </span>{' '}
              ({lkr(Number(deleteTarget.subtotal))})? This removes its stock
              intake. It will be blocked if any of this GRN&apos;s stock has
              already been sold.
            </p>
            <div className="pt-4 mt-4 border-t border-[#27272A] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="min-h-[44px] px-4 rounded-xl text-xs text-[#A1A1AA] hover:text-[#F4F4F5]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="min-h-[44px] px-4 rounded-xl bg-[#EF4444] text-white font-bold text-xs hover:brightness-110 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Purchase'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
