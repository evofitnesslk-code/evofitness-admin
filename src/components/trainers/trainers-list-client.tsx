'use client';

import { useState } from 'react';
import type { Trainer, Profile } from '@/types/database';
import { createTrainer, updateTrainer, toggleTrainerStatus } from '@/app/actions/trainers';
import { formatLKR } from '@/lib/utils';
import {
  Dumbbell,
  PlusCircle,
  Phone,
  Edit2,
  X,
} from 'lucide-react';

interface TrainersListClientProps {
  initialTrainers: Trainer[];
  currentUserProfile: Profile | null;
}

export function TrainersListClient({
  initialTrainers,
  currentUserProfile,
}: TrainersListClientProps) {
  const [trainers, setTrainers] = useState<Trainer[]>(initialTrainers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState<Trainer | null>(null);

  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [remarks, setRemarks] = useState('');
  const [defaultCharge, setDefaultCharge] = useState<number>(15000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = currentUserProfile?.role === 'admin';

  function openAddModal() {
    setEditingTrainer(null);
    setName('');
    setContact('');
    setRemarks('');
    setDefaultCharge(15000);
    setError(null);
    setIsModalOpen(true);
  }

  function openEditModal(t: Trainer) {
    setEditingTrainer(t);
    setName(t.name);
    setContact(t.contact);
    setRemarks(t.remarks || '');
    setDefaultCharge(Number(t.default_charge));
    setError(null);
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (editingTrainer) {
        const res = await updateTrainer(editingTrainer.id, {
          name,
          contact,
          remarks: remarks || undefined,
          default_charge: defaultCharge,
        });
        if (res.error) {
          setError(res.error);
          setLoading(false);
          return;
        }
        setTrainers(
          trainers.map((t) => (t.id === editingTrainer.id ? res.trainer : t))
        );
      } else {
        const res = await createTrainer({
          name,
          contact,
          remarks: remarks || undefined,
          default_charge: defaultCharge,
        });
        if (res.error) {
          setError(res.error);
          setLoading(false);
          return;
        }
        setTrainers([...trainers, res.trainer]);
      }

      setLoading(false);
      setIsModalOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action failed.');
      setLoading(false);
    }
  }

  async function handleToggleStatus(t: Trainer) {
    if (!isAdmin) return;
    const newStatus = !t.is_active;
    await toggleTrainerStatus(t.id, newStatus);
    setTrainers(
      trainers.map((tr) => (tr.id === t.id ? { ...tr, is_active: newStatus } : tr))
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-[#F4F4F5]">
            Active Trainers ({trainers.filter((t) => t.is_active).length})
          </h2>
          <p className="text-xs text-[#A1A1AA]">
            Personal training professionals and default session rates
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={openAddModal}
            className="h-10 px-4 rounded-xl bg-gold-gradient text-[#09090B] font-semibold text-xs hover:brightness-105 transition-all shadow-[0_2px_12px_rgba(229,184,66,0.2)] flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Trainer</span>
          </button>
        )}
      </div>

      {/* Trainers Cards Grid */}
      {trainers.length === 0 ? (
        <div className="card-luxury rounded-2xl p-12 text-center bg-[#121214]">
          <Dumbbell className="w-8 h-8 text-[#71717A] mx-auto mb-2" />
          <p className="text-xs text-[#A1A1AA]">No trainers registered yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {trainers.map((t) => (
            <div
              key={t.id}
              className={`card-luxury rounded-2xl p-5 bg-[#121214] flex flex-col justify-between ${
                !t.is_active ? 'opacity-60 border-[#27272A]' : ''
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#18181B] border border-[#3F3F46] flex items-center justify-center font-bold text-xs text-[#E5B842]">
                      {t.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-[#F4F4F5]">
                        {t.name}
                      </h3>
                      <span className="text-[10px] text-[#A1A1AA] flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {t.contact}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                      t.is_active
                        ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30'
                        : 'bg-[#71717A]/10 text-[#A1A1AA] border border-[#71717A]/30'
                    }`}
                  >
                    {t.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {t.remarks && (
                  <p className="text-[11px] text-[#D4D4D8] mt-2 line-clamp-2">
                    {t.remarks}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-[#27272A] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#71717A] block">
                    Default PT Rate
                  </span>
                  <span className="text-xs font-bold text-[#E5B842]">
                    {formatLKR(Number(t.default_charge))}
                  </span>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleStatus(t)}
                      className="px-2 py-1 rounded-lg text-[10px] font-medium bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] border border-[#27272A] transition-colors"
                    >
                      {t.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => openEditModal(t)}
                      className="p-1.5 rounded-lg bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-[#F4F4F5] border border-[#27272A] transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[#121214] border border-[#27272A] rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272A]">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-[#E5B842]" />
                <h3 className="text-sm font-bold text-[#F4F4F5]">
                  {editingTrainer ? 'Edit Trainer' : 'Add Personal Trainer'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-[#A1A1AA] hover:text-[#F4F4F5]"
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
                  Full Name <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ruwan Silva"
                  className="w-full h-10 px-3 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] focus:outline-none focus:border-[#E5B842]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                  Contact Phone / Email <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="077 555 1234"
                  className="w-full h-10 px-3 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] focus:outline-none focus:border-[#E5B842]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                  Default Session / Monthly Rate (LKR)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={defaultCharge}
                  onChange={(e) => setDefaultCharge(Number(e.target.value))}
                  className="w-full h-10 px-3 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] focus:outline-none focus:border-[#E5B842]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                  Specialization / Remarks
                </label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Bodybuilding, Strength & Conditioning, HIIT specialist..."
                  className="w-full p-3 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] focus:outline-none focus:border-[#E5B842]"
                />
              </div>

              <div className="pt-3 border-t border-[#27272A] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[#A1A1AA] hover:text-[#F4F4F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-gold-gradient text-[#09090B] font-bold text-xs hover:brightness-105 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Saving...' : editingTrainer ? 'Update Trainer' : 'Save Trainer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
