'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPurchase } from '@/app/actions/shop';
import type { ProductStock, Supplier } from '@/types/database';
import { AlertCircle, PlusCircle, Trash2 } from 'lucide-react';

interface NewPurchaseClientProps {
  suppliers: Supplier[];
  products: ProductStock[];
}

interface Line {
  key: number;
  product_id: string;
  qty: number;
  unit_price: number;
  sale_price: number;
}

function lkr(n: number): string {
  return `LKR ${Number(n).toLocaleString('en-LK')}`;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

let lineKey = 0;
function newLine(): Line {
  lineKey += 1;
  return { key: lineKey, product_id: '', qty: 1, unit_price: 0, sale_price: 0 };
}

const inputCls =
  'w-full min-h-[44px] px-3 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] placeholder:text-[#71717A] focus:outline-none focus:border-[#E5B842]';

export function NewPurchaseClient({ suppliers, products }: NewPurchaseClientProps) {
  const router = useRouter();
  const activeProducts = useMemo(
    () => products.filter((p) => p.is_active),
    [products]
  );
  const productById = useMemo(
    () => new Map(activeProducts.map((p) => [p.id, p])),
    [activeProducts]
  );

  const [supplierId, setSupplierId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(todayISO());
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const grandTotal = lines.reduce(
    (sum, l) => sum + Number(l.qty || 0) * Number(l.unit_price || 0),
    0
  );

  function updateLine(key: number, patch: Partial<Line>) {
    setLines(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function handleProductChange(key: number, productId: string) {
    const product = productById.get(productId);
    updateLine(key, {
      product_id: productId,
      sale_price: product ? Number(product.sale_price) : 0,
    });
  }

  function validate(): string | null {
    if (!supplierId) return 'Select a supplier.';
    if (!invoiceNo.trim()) return 'Invoice / GRN number is required.';
    if (!purchaseDate) return 'Purchase date is required.';
    if (lines.length === 0) return 'Add at least one inventory line.';
    const seen = new Set<string>();
    for (let i = 0; i < lines.length; i += 1) {
      const l = lines[i];
      if (!l.product_id) return `Line ${i + 1}: select a product.`;
      if (seen.has(l.product_id))
        return `Line ${i + 1}: product already added. Combine the quantities instead.`;
      seen.add(l.product_id);
      if (!(l.qty > 0)) return `Line ${i + 1}: quantity must be positive.`;
      if (!(l.unit_price >= 0))
        return `Line ${i + 1}: unit price cannot be negative.`;
      if (!(l.sale_price >= 0))
        return `Line ${i + 1}: sale price cannot be negative.`;
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setPending(true);
    const res = await createPurchase({
      supplier_id: supplierId,
      invoice_grn_no: invoiceNo.trim(),
      purchase_date: purchaseDate,
      notes: notes.trim() || undefined,
      lines: lines.map((l) => ({
        product_id: l.product_id,
        qty: Number(l.qty),
        unit_price: Number(l.unit_price),
        sale_price: Number(l.sale_price),
      })),
    });
    if (res && 'error' in res && res.error) {
      setError(res.error);
      setPending(false);
      return;
    }
    router.push('/shop/purchases');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs text-[#EF4444] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="rounded-2xl bg-[#121214] border border-[#27272A] p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="purchase-supplier"
              className="block text-xs font-medium text-[#D4D4D8] mb-1"
            >
              Supplier <span className="text-[#EF4444]">*</span>
            </label>
            <select
              id="purchase-supplier"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className={inputCls}
            >
              <option value="">Select supplier...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="purchase-invoice"
              className="block text-xs font-medium text-[#D4D4D8] mb-1"
            >
              Invoice / GRN No. <span className="text-[#EF4444]">*</span>
            </label>
            <input
              id="purchase-invoice"
              type="text"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              placeholder="e.g. INV-2024-118"
              className={inputCls}
            />
          </div>
          <div>
            <label
              htmlFor="purchase-date"
              className="block text-xs font-medium text-[#D4D4D8] mb-1"
            >
              Purchase Date <span className="text-[#EF4444]">*</span>
            </label>
            <input
              id="purchase-date"
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label
              htmlFor="purchase-notes"
              className="block text-xs font-medium text-[#D4D4D8] mb-1"
            >
              Notes
            </label>
            <input
              id="purchase-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional remarks"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-[#121214] border border-[#27272A] p-5 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-xs font-bold text-[#F4F4F5]">
            Inventory Lines ({lines.length})
          </h3>
          <button
            type="button"
            onClick={() => setLines([...lines, newLine()])}
            className="min-h-[44px] px-3 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-[#E5B842] border border-[#27272A] transition-colors flex items-center gap-1.5 text-xs font-semibold"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Line</span>
          </button>
        </div>

        {lines.length === 0 ? (
          <p className="text-xs text-[#A1A1AA]">
            No lines yet. Add at least one inventory line.
          </p>
        ) : (
          <div className="space-y-3">
            {lines.map((l, i) => {
              const product = productById.get(l.product_id);
              const amount = Number(l.qty || 0) * Number(l.unit_price || 0);
              return (
                <div
                  key={l.key}
                  className="rounded-xl border border-[#27272A] bg-[#18181B]/40 p-3 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-[#A1A1AA]">
                      Line {i + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setLines(lines.filter((x) => x.key !== l.key))
                      }
                      aria-label={`Remove line ${i + 1}`}
                      className="min-h-[44px] min-w-[44px] rounded-lg text-[#A1A1AA] hover:text-[#EF4444] flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#D4D4D8] mb-1">
                      Product <span className="text-[#EF4444]">*</span>
                    </label>
                    <select
                      value={l.product_id}
                      onChange={(e) =>
                        handleProductChange(l.key, e.target.value)
                      }
                      className={inputCls}
                    >
                      <option value="">Select product...</option>
                      {activeProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.inventory_code} — {p.description} (on hand:{' '}
                          {p.on_hand})
                        </option>
                      ))}
                    </select>
                    {product && (
                      <p className="text-[11px] text-[#71717A] mt-1">
                        On hand: {product.on_hand} · Current sale price:{' '}
                        {lkr(Number(product.sale_price))}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-[#D4D4D8] mb-1">
                        QTY <span className="text-[#EF4444]">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={l.qty}
                        onChange={(e) =>
                          updateLine(l.key, { qty: Number(e.target.value) })
                        }
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#D4D4D8] mb-1">
                        Unit Price <span className="text-[#EF4444]">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={l.unit_price}
                        onChange={(e) =>
                          updateLine(l.key, {
                            unit_price: Number(e.target.value),
                          })
                        }
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#D4D4D8] mb-1">
                        Sale Price
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={l.sale_price}
                        onChange={(e) =>
                          updateLine(l.key, {
                            sale_price: Number(e.target.value),
                          })
                        }
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <span className="block text-[11px] font-medium text-[#D4D4D8] mb-1">
                        Amount
                      </span>
                      <div className="min-h-[44px] px-3 flex items-center bg-[#121214] border border-[#27272A] rounded-xl text-xs font-bold text-[#E5B842]">
                        {lkr(amount)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-3 border-t border-[#27272A] flex items-center justify-between">
          <span className="text-xs text-[#A1A1AA]">Grand Total</span>
          <span className="text-sm font-bold text-[#E5B842]">
            {lkr(grandTotal)}
          </span>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => router.push('/shop/purchases')}
          className="min-h-[44px] px-4 rounded-xl text-xs text-[#A1A1AA] hover:text-[#F4F4F5]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="min-h-[44px] px-6 rounded-xl bg-gold-gradient text-[#09090B] font-bold text-xs hover:brightness-105 disabled:opacity-50"
        >
          {pending ? 'Saving...' : 'Save Purchase'}
        </button>
      </div>
    </form>
  );
}
