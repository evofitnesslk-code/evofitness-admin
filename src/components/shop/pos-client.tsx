'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSale } from '@/app/actions/shop';
import { getMembers } from '@/app/actions/members';
import type {
  Member,
  PaymentMethod,
  ProductStock,
  Profile,
} from '@/types/database';
import {
  AlertCircle,
  CheckCircle2,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
} from 'lucide-react';

interface PosClientProps {
  products: ProductStock[];
  initialSaleNumber: string;
  isManager: boolean;
  profile: Profile | null;
}

interface CartLine {
  product_id: string;
  qty: number;
}

function lkr(n: number): string {
  return `LKR ${Number(n).toLocaleString('en-LK')}`;
}

const inputCls =
  'w-full min-h-[44px] px-3 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] placeholder:text-[#71717A] focus:outline-none focus:border-[#E5B842]';

const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'card', 'bank'];

export function PosClient({
  products,
  initialSaleNumber,
  isManager,
}: PosClientProps) {
  const router = useRouter();
  const productById = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  const [cart, setCart] = useState<CartLine[]>([]);
  const [pickerSearch, setPickerSearch] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [memberId, setMemberId] = useState<string | null>(null);
  const [memberQuery, setMemberQuery] = useState('');
  const [memberResults, setMemberResults] = useState<Member[]>([]);
  const [memberSearching, setMemberSearching] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const memberTimer = useRef<number | undefined>(undefined);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [saleNumber, setSaleNumber] = useState(initialSaleNumber);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const pickerResults = useMemo(() => {
    const s = pickerSearch.trim().toLowerCase();
    const list = s
      ? products.filter(
          (p) =>
            p.description.toLowerCase().includes(s) ||
            p.inventory_code.toLowerCase().includes(s)
        )
      : products;
    return list.slice(0, 30);
  }, [products, pickerSearch]);

  const total = cart.reduce((sum, l) => {
    const p = productById.get(l.product_id);
    return sum + (p ? Number(p.sale_price) * l.qty : 0);
  }, 0);

  function addToCart(productId: string) {
    const product = productById.get(productId);
    if (!product || product.on_hand <= 0) return;
    const existing = cart.find((l) => l.product_id === productId);
    if (existing) {
      if (existing.qty + 1 > product.on_hand) {
        setError(
          `Only ${product.on_hand} unit(s) of "${product.description}" in stock.`
        );
        return;
      }
      setCart(
        cart.map((l) =>
          l.product_id === productId ? { ...l, qty: l.qty + 1 } : l
        )
      );
    } else {
      setCart([...cart, { product_id: productId, qty: 1 }]);
    }
    setError(null);
  }

  function setQty(productId: string, qty: number) {
    const product = productById.get(productId);
    const cap = product ? Math.max(product.on_hand, 1) : qty;
    const safe = Math.max(1, Math.min(Math.floor(qty) || 1, cap));
    if (product && qty > product.on_hand) {
      setError(
        `Only ${product.on_hand} unit(s) of "${product.description}" in stock.`
      );
    }
    setCart(
      cart.map((l) => (l.product_id === productId ? { ...l, qty: safe } : l))
    );
  }

  function handleMemberQuery(value: string) {
    setMemberQuery(value);
    setMemberOpen(true);
    clearTimeout(memberTimer.current);
    if (!value.trim()) {
      setMemberResults([]);
      setMemberSearching(false);
      return;
    }
    setMemberSearching(true);
    memberTimer.current = window.setTimeout(async () => {
      try {
        const members = await getMembers(value.trim());
        setMemberResults(members.slice(0, 8));
      } catch {
        setMemberResults([]);
      } finally {
        setMemberSearching(false);
      }
    }, 300);
  }

  function selectMember(m: Member) {
    setMemberId(m.id);
    setMemberQuery(m.full_name);
    setMemberOpen(false);
    if (!customerName.trim()) setCustomerName(m.full_name);
  }

  function clearMember() {
    setMemberId(null);
    setMemberQuery('');
    setMemberResults([]);
    setMemberOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    if (cart.length === 0) {
      setError('Add at least one item to the sale.');
      return;
    }
    for (const l of cart) {
      const p = productById.get(l.product_id);
      if (!p) {
        setError('An item in the cart is no longer available.');
        return;
      }
      if (!(l.qty > 0)) {
        setError('Item quantities must be positive.');
        return;
      }
      if (l.qty > p.on_hand) {
        setError(
          `Only ${p.on_hand} unit(s) of "${p.description}" in stock. Reduce the quantity.`
        );
        return;
      }
    }
    setError(null);
    setSuccess(null);
    setPending(true);
    const res = await createSale({
      member_id: memberId,
      customer_name: customerName.trim() || undefined,
      payment_method: paymentMethod,
      notes: notes.trim() || undefined,
      sale_number: isManager && saleNumber.trim() ? saleNumber.trim() : undefined,
      lines: cart.map((l) => ({ product_id: l.product_id, qty: l.qty })),
    });
    if (res && 'error' in res && res.error) {
      setError(res.error);
      setPending(false);
      return;
    }
    setSuccess('Sale recorded.');
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs text-[#EF4444] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 rounded-xl bg-[#10B981]/10 border border-[#10B981]/30 text-xs text-[#10B981] flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {success}{' '}
            <Link href="/shop/sales" className="font-bold underline">
              View sales
            </Link>
          </span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-5 gap-4"
      >
        <div className="lg:col-span-3 rounded-2xl bg-[#121214] border border-[#27272A] p-5 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
            <input
              type="text"
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              placeholder="Search products by name or inventory ID..."
              className="w-full min-h-[44px] pl-10 pr-3 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] placeholder:text-[#71717A] focus:outline-none focus:border-[#E5B842]"
            />
          </div>

          {pickerResults.length === 0 ? (
            <p className="text-xs text-[#A1A1AA] py-6 text-center">
              No products found.
            </p>
          ) : (
            <ul className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {pickerResults.map((p) => {
                const out = p.on_hand <= 0;
                return (
                  <li
                    key={p.id}
                    className={`rounded-xl border border-[#27272A] bg-[#18181B]/40 p-3 flex items-center justify-between gap-3 ${out ? 'opacity-50' : ''}`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#F4F4F5] truncate">
                        {p.description}
                      </p>
                      <p className="text-[11px] text-[#71717A] font-mono">
                        {p.inventory_code} · on hand: {p.on_hand} ·{' '}
                        {lkr(Number(p.sale_price))}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={out}
                      onClick={() => addToCart(p.id)}
                      className="min-h-[44px] min-w-[44px] px-3 rounded-xl bg-gold-gradient text-[#09090B] font-bold text-xs hover:brightness-105 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    >
                      {out ? 'Out' : 'Add'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="lg:col-span-2 rounded-2xl bg-[#121214] border border-[#27272A] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-[#E5B842]" />
            <h3 className="text-xs font-bold text-[#F4F4F5]">
              Current Sale ({cart.reduce((n, l) => n + l.qty, 0)} items)
            </h3>
          </div>

          {cart.length === 0 ? (
            <p className="text-xs text-[#A1A1AA]">
              Cart is empty. Add in-stock items from the picker.
            </p>
          ) : (
            <ul className="space-y-2">
              {cart.map((l) => {
                const p = productById.get(l.product_id);
                if (!p) return null;
                return (
                  <li
                    key={l.product_id}
                    className="rounded-xl border border-[#27272A] bg-[#18181B]/40 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#F4F4F5] truncate">
                          {p.description}
                        </p>
                        <p className="text-[11px] text-[#71717A]">
                          {lkr(Number(p.sale_price))} each · max {p.on_hand}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setCart(
                            cart.filter((x) => x.product_id !== l.product_id)
                          )
                        }
                        aria-label={`Remove ${p.description}`}
                        className="min-h-[44px] min-w-[44px] rounded-lg text-[#A1A1AA] hover:text-[#EF4444] flex items-center justify-center shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setQty(l.product_id, l.qty - 1)}
                          disabled={l.qty <= 1}
                          aria-label="Decrease quantity"
                          className="min-h-[44px] min-w-[44px] rounded-lg bg-[#121214] border border-[#27272A] text-[#F4F4F5] disabled:opacity-40 flex items-center justify-center"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={p.on_hand}
                          value={l.qty}
                          onChange={(e) =>
                            setQty(l.product_id, Number(e.target.value))
                          }
                          aria-label={`Quantity for ${p.description}`}
                          className="w-16 min-h-[44px] text-center bg-[#121214] border border-[#27272A] rounded-lg text-xs text-[#F4F4F5] focus:outline-none focus:border-[#E5B842]"
                        />
                        <button
                          type="button"
                          onClick={() => setQty(l.product_id, l.qty + 1)}
                          disabled={l.qty >= p.on_hand}
                          aria-label="Increase quantity"
                          className="min-h-[44px] min-w-[44px] rounded-lg bg-[#121214] border border-[#27272A] text-[#F4F4F5] disabled:opacity-40 flex items-center justify-center"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="text-xs font-bold text-[#E5B842]">
                        {lkr(Number(p.sale_price) * l.qty)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="space-y-3 pt-3 border-t border-[#27272A]">
            <div>
              <label
                htmlFor="pos-sale-number"
                className="block text-xs font-medium text-[#D4D4D8] mb-1"
              >
                Sale Number{isManager ? ' (editable)' : ''}
              </label>
              <input
                id="pos-sale-number"
                type="text"
                value={saleNumber}
                onChange={(e) => setSaleNumber(e.target.value)}
                readOnly={!isManager}
                placeholder={initialSaleNumber}
                className={`${inputCls} ${isManager ? '' : 'opacity-60 cursor-not-allowed'}`}
              />
              {!isManager && (
                <p className="text-[11px] text-[#71717A] mt-1">
                  Assigned automatically. Only shop managers can override it.
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="pos-customer"
                className="block text-xs font-medium text-[#D4D4D8] mb-1"
              >
                Customer Name
              </label>
              <input
                id="pos-customer"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Walk-in customer name (optional)"
                className={inputCls}
              />
            </div>

            <div className="relative">
              <label
                htmlFor="pos-member"
                className="block text-xs font-medium text-[#D4D4D8] mb-1"
              >
                Link Member (optional)
              </label>
              <div className="flex gap-2">
                <input
                  id="pos-member"
                  type="text"
                  value={memberQuery}
                  onChange={(e) => handleMemberQuery(e.target.value)}
                  onFocus={() => memberQuery.trim() && setMemberOpen(true)}
                  placeholder="Type to search members..."
                  className={inputCls}
                />
                {memberId && (
                  <button
                    type="button"
                    onClick={clearMember}
                    className="min-h-[44px] px-3 rounded-xl bg-[#18181B] border border-[#27272A] text-xs text-[#A1A1AA] hover:text-[#F4F4F5] shrink-0"
                  >
                    Clear
                  </button>
                )}
              </div>
              {memberOpen && memberQuery.trim() && (
                <div className="absolute z-10 mt-1 w-full rounded-xl border border-[#27272A] bg-[#18181B] shadow-2xl overflow-hidden">
                  {memberSearching ? (
                    <p className="px-3 py-3 text-xs text-[#A1A1AA]">
                      Searching...
                    </p>
                  ) : memberResults.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-[#A1A1AA]">
                      No members found.
                    </p>
                  ) : (
                    <ul>
                      {memberResults.map((m) => (
                        <li key={m.id}>
                          <button
                            type="button"
                            onClick={() => selectMember(m)}
                            className="w-full min-h-[44px] px-3 py-2 text-left hover:bg-[#27272A] transition-colors"
                          >
                            <span className="block text-xs text-[#F4F4F5]">
                              {m.full_name}
                            </span>
                            <span className="block text-[11px] text-[#71717A]">
                              {m.phone}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {memberId && (
                <p className="text-[11px] text-[#10B981] mt-1">
                  Linked to member record.
                </p>
              )}
            </div>

            <div>
              <span className="block text-xs font-medium text-[#D4D4D8] mb-1">
                Payment Method <span className="text-[#EF4444]">*</span>
              </span>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    aria-pressed={paymentMethod === m}
                    className={`min-h-[44px] rounded-xl text-xs font-bold capitalize border transition-colors ${
                      paymentMethod === m
                        ? 'bg-gold-gradient text-[#09090B] border-transparent'
                        : 'bg-[#18181B] text-[#A1A1AA] border-[#27272A] hover:text-[#F4F4F5]'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="pos-notes"
                className="block text-xs font-medium text-[#D4D4D8] mb-1"
              >
                Notes
              </label>
              <input
                id="pos-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional remarks"
                className={inputCls}
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-[#A1A1AA]">Total</span>
              <span className="text-base font-bold text-[#E5B842]">
                {lkr(total)}
              </span>
            </div>

            <button
              type="submit"
              disabled={pending || cart.length === 0}
              className="w-full min-h-[44px] rounded-xl bg-gold-gradient text-[#09090B] font-bold text-xs hover:brightness-105 disabled:opacity-50"
            >
              {pending ? 'Recording...' : `Record Sale · ${lkr(total)}`}
            </button>
            {success && (
              <button
                type="button"
                onClick={() => router.push('/shop/sales')}
                className="w-full min-h-[44px] rounded-xl bg-[#18181B] border border-[#27272A] text-xs font-semibold text-[#F4F4F5] hover:bg-[#27272A]"
              >
                Back to Sales
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
