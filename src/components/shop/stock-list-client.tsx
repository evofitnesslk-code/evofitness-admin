'use client';

import { useMemo, useState } from 'react';
import type { ProductStock, Profile } from '@/types/database';
import {
  createProduct,
  updateProduct,
  toggleProductStatus,
  getNextInventoryCode,
} from '@/app/actions/shop';
import {
  Package,
  PlusCircle,
  Search,
  Edit2,
  X,
  AlertCircle,
} from 'lucide-react';

interface StockListClientProps {
  initialProducts: ProductStock[];
  currentUserProfile: Profile | null;
}

function formatLKR(n: number): string {
  return `LKR ${Number(n).toLocaleString('en-LK')}`;
}

function onHandClassName(onHand: number): string {
  if (onHand <= 0) return 'text-[#EF4444]';
  if (onHand <= 5) return 'text-[#E5B842]';
  return 'text-[#F4F4F5]';
}

export function StockListClient({
  initialProducts,
  currentUserProfile,
}: StockListClientProps) {
  const [products, setProducts] = useState<ProductStock[]>(initialProducts);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductStock | null>(
    null
  );

  const [description, setDescription] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [inventoryCode, setInventoryCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const isManager =
    currentUserProfile?.role === 'admin' ||
    currentUserProfile?.role === 'accountant';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.description.toLowerCase().includes(q) ||
        p.inventory_code.toLowerCase().includes(q)
    );
  }, [products, search]);

  async function openAddModal() {
    setEditingProduct(null);
    setDescription('');
    setSalePrice('');
    setError(null);
    setIsModalOpen(true);
    try {
      const next = await getNextInventoryCode();
      setInventoryCode(next);
    } catch {
      setInventoryCode('');
    }
  }

  function openEditModal(p: ProductStock) {
    setEditingProduct(p);
    setDescription(p.description);
    setSalePrice(String(p.sale_price));
    setInventoryCode(p.inventory_code);
    setError(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingProduct(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      setError('Product description is required.');
      return;
    }
    const price = Number(salePrice);
    if (salePrice.trim() === '' || Number.isNaN(price)) {
      setError('Enter a valid sale price.');
      return;
    }
    if (price < 0) {
      setError('Sale price cannot be negative.');
      return;
    }

    setLoading(true);
    try {
      if (editingProduct) {
        const res = await updateProduct(editingProduct.id, {
          description: trimmedDescription,
          sale_price: price,
        });
        if ('error' in res && res.error) {
          setError(res.error);
          setLoading(false);
          return;
        }
        if ('product' in res && res.product) {
          const updated = res.product;
          setProducts(
            products.map((p) =>
              p.id === editingProduct.id
                ? {
                    ...p,
                    description: updated.description,
                    sale_price: Number(updated.sale_price),
                    is_active: updated.is_active,
                  }
                : p
            )
          );
        }
      } else {
        const res = await createProduct({
          description: trimmedDescription,
          sale_price: price,
          inventory_code: inventoryCode.trim() || undefined,
        });
        if ('error' in res && res.error) {
          setError(res.error);
          setLoading(false);
          return;
        }
        if ('product' in res && res.product) {
          const created = res.product;
          setProducts([
            ...products,
            {
              ...created,
              sale_price: Number(created.sale_price),
              purchased_qty: 0,
              sold_qty: 0,
              on_hand: 0,
              stock_sale_value: 0,
              purchased_cost: 0,
            },
          ]);
        }
      }
      setLoading(false);
      closeModal();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action failed.');
      setLoading(false);
    }
  }

  async function handleToggleStatus(p: ProductStock) {
    if (!isManager) return;
    setBannerError(null);
    const newStatus = !p.is_active;
    const res = await toggleProductStatus(p.id, newStatus);
    if ('error' in res && res.error) {
      setBannerError(res.error);
      return;
    }
    setProducts(
      products.map((row) =>
        row.id === p.id ? { ...row, is_active: newStatus } : row
      )
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-[#F4F4F5]">
            Stock ({products.filter((p) => p.is_active).length} active)
          </h2>
          <p className="text-xs text-[#A1A1AA]">
            Inventory levels, sale prices and stock values
          </p>
        </div>

        {isManager && (
          <button
            onClick={openAddModal}
            className="h-10 px-4 rounded-xl bg-gold-gradient text-[#09090B] font-semibold text-xs hover:brightness-105 transition-all shadow-[0_2px_12px_rgba(229,184,66,0.2)] flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by inventory ID or description..."
          className="w-full h-11 pl-10 pr-3 bg-[#121214] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] placeholder:text-[#71717A] focus:outline-none focus:border-[#E5B842]"
        />
      </div>

      {bannerError && (
        <div className="p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs text-[#EF4444] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {bannerError}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card-luxury rounded-2xl p-12 text-center bg-[#121214]">
          <Package className="w-8 h-8 text-[#71717A] mx-auto mb-2" />
          <p className="text-xs text-[#A1A1AA]">
            {products.length === 0
              ? 'No products registered yet.'
              : 'No products match your search.'}
          </p>
        </div>
      ) : (
        <div className="card-luxury rounded-2xl bg-[#121214] overflow-x-auto">
          <table className="w-full text-xs min-w-[720px]">
            <thead>
              <tr className="border-b border-[#27272A] text-left">
                <th className="px-4 py-3 font-semibold text-[#A1A1AA]">
                  Inventory ID
                </th>
                <th className="px-4 py-3 font-semibold text-[#A1A1AA]">
                  Description
                </th>
                <th className="px-4 py-3 font-semibold text-[#A1A1AA] text-right">
                  On hand
                </th>
                <th className="px-4 py-3 font-semibold text-[#A1A1AA] text-right">
                  Sale Price
                </th>
                <th className="px-4 py-3 font-semibold text-[#A1A1AA] text-right">
                  Stock value
                </th>
                <th className="px-4 py-3 font-semibold text-[#A1A1AA]">
                  Status
                </th>
                {isManager && (
                  <th className="px-4 py-3 font-semibold text-[#A1A1AA] text-right">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className={`border-b border-[#27272A] last:border-0 hover:bg-[#18181B]/60 transition-colors ${
                    !p.is_active ? 'opacity-60' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-mono text-[#D4D4D8] whitespace-nowrap">
                    {p.inventory_code}
                  </td>
                  <td className="px-4 py-3 text-[#F4F4F5] font-medium">
                    {p.description}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-bold whitespace-nowrap ${onHandClassName(
                      Number(p.on_hand)
                    )}`}
                  >
                    {Number(p.on_hand).toLocaleString('en-LK')}
                  </td>
                  <td className="px-4 py-3 text-right text-[#D4D4D8] whitespace-nowrap">
                    {formatLKR(Number(p.sale_price))}
                  </td>
                  <td className="px-4 py-3 text-right text-[#D4D4D8] whitespace-nowrap">
                    {formatLKR(Number(p.stock_sale_value))}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase whitespace-nowrap ${
                        p.is_active
                          ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30'
                          : 'bg-[#71717A]/10 text-[#A1A1AA] border border-[#71717A]/30'
                      }`}
                    >
                      {p.is_active ? 'Active' : 'Archived'}
                    </span>
                  </td>
                  {isManager && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleToggleStatus(p)}
                          className="min-h-[44px] px-2 rounded-lg text-[10px] font-medium bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] border border-[#27272A] transition-colors"
                        >
                          {p.is_active ? 'Archive' : 'Restore'}
                        </button>
                        <button
                          onClick={() => openEditModal(p)}
                          aria-label={`Edit ${p.description}`}
                          className="min-h-[44px] min-w-[44px] p-1.5 rounded-lg bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-[#F4F4F5] border border-[#27272A] transition-colors flex items-center justify-center"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && isManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[#121214] border border-[#27272A] rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272A]">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[#E5B842]" />
                <h3 className="text-sm font-bold text-[#F4F4F5]">
                  {editingProduct ? 'Edit Product' : 'Add Product'}
                </h3>
              </div>
              <button
                onClick={closeModal}
                aria-label="Close"
                className="min-h-[44px] min-w-[44px] p-1 rounded-lg text-[#A1A1AA] hover:text-[#F4F4F5] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="mt-3 p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs text-[#EF4444]">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                  Inventory ID
                </label>
                {editingProduct ? (
                  <p className="w-full min-h-[44px] px-3 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#A1A1AA] font-mono">
                    {inventoryCode}
                  </p>
                ) : (
                  <input
                    type="text"
                    value={inventoryCode}
                    onChange={(e) => setInventoryCode(e.target.value)}
                    placeholder="INV0001"
                    className="w-full h-11 px-3 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] font-mono focus:outline-none focus:border-[#E5B842]"
                  />
                )}
                {!editingProduct && (
                  <p className="mt-1 text-[10px] text-[#71717A]">
                    Optional override — leave as suggested for the next code.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                  Description <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Whey Protein 2lb — Chocolate"
                  className="w-full h-11 px-3 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] focus:outline-none focus:border-[#E5B842]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                  Sale Price (LKR) <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-11 px-3 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] focus:outline-none focus:border-[#E5B842]"
                />
              </div>

              <div className="pt-3 border-t border-[#27272A] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="min-h-[44px] px-4 rounded-xl text-xs text-[#A1A1AA] hover:text-[#F4F4F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="min-h-[44px] px-4 rounded-xl bg-gold-gradient text-[#09090B] font-bold text-xs hover:brightness-105 disabled:opacity-50 cursor-pointer"
                >
                  {loading
                    ? 'Saving...'
                    : editingProduct
                      ? 'Update Product'
                      : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
