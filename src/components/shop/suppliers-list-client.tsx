'use client';

import { useMemo, useState } from 'react';
import type { Supplier, Profile } from '@/types/database';
import {
  createSupplier,
  updateSupplier,
  toggleSupplierStatus,
} from '@/app/actions/shop';
import {
  Truck,
  PlusCircle,
  Search,
  Edit2,
  X,
  AlertCircle,
} from 'lucide-react';

interface SuppliersListClientProps {
  initialSuppliers: Supplier[];
  currentUserProfile: Profile | null;
}

export function SuppliersListClient({
  initialSuppliers,
  currentUserProfile,
}: SuppliersListClientProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(
    null
  );

  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const isManager =
    currentUserProfile?.role === 'admin' ||
    currentUserProfile?.role === 'accountant';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((s) => s.name.toLowerCase().includes(q));
  }, [suppliers, search]);

  function openAddModal() {
    setEditingSupplier(null);
    setName('');
    setContact('');
    setEmail('');
    setAddress('');
    setRemarks('');
    setError(null);
    setIsModalOpen(true);
  }

  function openEditModal(s: Supplier) {
    setEditingSupplier(s);
    setName(s.name);
    setContact(s.contact ?? '');
    setEmail(s.email ?? '');
    setAddress(s.address ?? '');
    setRemarks(s.remarks ?? '');
    setError(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingSupplier(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Supplier name is required.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        contact: contact.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        remarks: remarks.trim() || undefined,
      };
      if (editingSupplier) {
        const res = await updateSupplier(editingSupplier.id, payload);
        if ('error' in res && res.error) {
          setError(res.error);
          setLoading(false);
          return;
        }
        if ('supplier' in res && res.supplier) {
          const updated = res.supplier;
          setSuppliers(
            suppliers.map((s) => (s.id === editingSupplier.id ? updated : s))
          );
        }
      } else {
        const res = await createSupplier(payload);
        if ('error' in res && res.error) {
          setError(res.error);
          setLoading(false);
          return;
        }
        if ('supplier' in res && res.supplier) {
          setSuppliers([...suppliers, res.supplier]);
        }
      }
      setLoading(false);
      closeModal();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action failed.');
      setLoading(false);
    }
  }

  async function handleToggleStatus(s: Supplier) {
    if (!isManager) return;
    setBannerError(null);
    const newStatus = !s.is_active;
    const res = await toggleSupplierStatus(s.id, newStatus);
    if ('error' in res && res.error) {
      setBannerError(res.error);
      return;
    }
    setSuppliers(
      suppliers.map((row) =>
        row.id === s.id ? { ...row, is_active: newStatus } : row
      )
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-[#F4F4F5]">
            Suppliers ({suppliers.filter((s) => s.is_active).length} active)
          </h2>
          <p className="text-xs text-[#A1A1AA]">
            Vendors supplying shop inventory
          </p>
        </div>

        {isManager && (
          <button
            onClick={openAddModal}
            className="h-10 px-4 rounded-xl bg-gold-gradient text-[#09090B] font-semibold text-xs hover:brightness-105 transition-all shadow-[0_2px_12px_rgba(229,184,66,0.2)] flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Supplier</span>
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search suppliers by name..."
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
          <Truck className="w-8 h-8 text-[#71717A] mx-auto mb-2" />
          <p className="text-xs text-[#A1A1AA]">
            {suppliers.length === 0
              ? 'No suppliers registered yet.'
              : 'No suppliers match your search.'}
          </p>
        </div>
      ) : (
        <div className="card-luxury rounded-2xl bg-[#121214] overflow-x-auto">
          <table className="w-full text-xs min-w-[720px]">
            <thead>
              <tr className="border-b border-[#27272A] text-left">
                <th className="px-4 py-3 font-semibold text-[#A1A1AA]">
                  Name
                </th>
                <th className="px-4 py-3 font-semibold text-[#A1A1AA]">
                  Contact
                </th>
                <th className="px-4 py-3 font-semibold text-[#A1A1AA]">
                  Email
                </th>
                <th className="px-4 py-3 font-semibold text-[#A1A1AA]">
                  Address
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
              {filtered.map((s) => (
                <tr
                  key={s.id}
                  className={`border-b border-[#27272A] last:border-0 hover:bg-[#18181B]/60 transition-colors ${
                    !s.is_active ? 'opacity-60' : ''
                  }`}
                >
                  <td className="px-4 py-3 text-[#F4F4F5] font-medium">
                    {s.name}
                  </td>
                  <td className="px-4 py-3 text-[#D4D4D8]">
                    {s.contact ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-[#D4D4D8]">{s.email ?? '—'}</td>
                  <td className="px-4 py-3 text-[#D4D4D8] max-w-[220px] truncate">
                    {s.address ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase whitespace-nowrap ${
                        s.is_active
                          ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30'
                          : 'bg-[#71717A]/10 text-[#A1A1AA] border border-[#71717A]/30'
                      }`}
                    >
                      {s.is_active ? 'Active' : 'Archived'}
                    </span>
                  </td>
                  {isManager && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleToggleStatus(s)}
                          className="min-h-[44px] px-2 rounded-lg text-[10px] font-medium bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] border border-[#27272A] transition-colors"
                        >
                          {s.is_active ? 'Archive' : 'Activate'}
                        </button>
                        <button
                          onClick={() => openEditModal(s)}
                          aria-label={`Edit ${s.name}`}
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
                <Truck className="w-4 h-4 text-[#E5B842]" />
                <h3 className="text-sm font-bold text-[#F4F4F5]">
                  {editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
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
                  Supplier Name <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Health Foods Lanka"
                  className="w-full h-11 px-3 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] focus:outline-none focus:border-[#E5B842]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                  Contact
                </label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="077 555 1234"
                  className="w-full h-11 px-3 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] focus:outline-none focus:border-[#E5B842]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="supplier@example.com"
                  className="w-full h-11 px-3 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] focus:outline-none focus:border-[#E5B842]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                  Address
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, city..."
                  className="w-full p-3 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] focus:outline-none focus:border-[#E5B842]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                  Remarks
                </label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Payment terms, notes..."
                  className="w-full p-3 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] focus:outline-none focus:border-[#E5B842]"
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
                    : editingSupplier
                      ? 'Update Supplier'
                      : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
