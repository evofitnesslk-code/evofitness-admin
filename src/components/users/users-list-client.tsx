'use client';

import { useState } from 'react';
import type { Profile, UserRole } from '@/types/database';
import { createStaffUser } from '@/app/actions/users';
import { formatDate } from '@/lib/utils';
import {
  UserPlus,
  ShieldCheck,
  UserCheck,
  X,
  AlertCircle,
} from 'lucide-react';

interface UsersListClientProps {
  initialUsers: Profile[];
}

export function UsersListClient({ initialUsers }: UsersListClientProps) {
  const [users] = useState<Profile[]>(initialUsers);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('staff');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await createStaffUser({
        full_name: fullName,
        email,
        password,
        role,
      });

      if (res.error) {
        setError(res.error);
        setLoading(false);
        return;
      }

      setLoading(false);
      setIsModalOpen(false);
      // Reload page to reflect updated users
      window.location.reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create user account.');
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-[#F4F4F5]">
            Authorized System Users ({users.length})
          </h2>
          <p className="text-xs text-[#A1A1AA]">
            Staff and administrative accounts with access to the EVO platform
          </p>
        </div>

        <button
          onClick={() => {
            setFullName('');
            setEmail('');
            setPassword('');
            setRole('staff');
            setError(null);
            setIsModalOpen(true);
          }}
          className="h-10 px-4 rounded-xl bg-gold-gradient text-[#09090B] font-semibold text-xs hover:brightness-105 transition-all shadow-[0_2px_12px_rgba(229,184,66,0.2)] flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Staff Account</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="card-luxury rounded-2xl bg-[#121214] overflow-hidden border border-[#27272A]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#27272A] bg-[#18181B]/70 text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4 text-right">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]/60">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-[#18181B]/50">
                  <td className="py-3.5 px-4 font-semibold text-[#F4F4F5]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#18181B] border border-[#3F3F46] flex items-center justify-center font-bold text-xs text-[#E5B842]">
                        {u.full_name ? u.full_name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <span>{u.full_name || 'Staff User'}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-[#D4D4D8]">{u.email}</td>

                  <td className="py-3.5 px-4">
                    {u.role === 'admin' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E5B842]/10 text-[#E5B842] border border-[#E5B842]/30 font-bold text-[10px]">
                        <ShieldCheck className="w-3 h-3" />
                        Admin
                      </span>
                    ) : u.role === 'accountant' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0EA5E9]/10 text-[#0EA5E9] border border-[#0EA5E9]/30 font-bold text-[10px]">
                        <UserCheck className="w-3 h-3" />
                        Accountant
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#27272A] text-[#A1A1AA] border border-[#3F3F46] font-medium text-[10px]">
                        <UserCheck className="w-3 h-3" />
                        Shop Staff
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right text-[#71717A]">
                    {formatDate(u.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Account Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[#121214] border border-[#27272A] rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272A]">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#E5B842]" />
                <h3 className="text-sm font-bold text-[#F4F4F5]">
                  Create Staff Account
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
              <div className="mt-3 p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs text-[#EF4444] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                  Staff Full Name <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Nimal Fernando"
                  className="w-full h-10 px-3 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] focus:outline-none focus:border-[#E5B842]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                  Login Email <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@evofitness.lk"
                  className="w-full h-10 px-3 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] focus:outline-none focus:border-[#E5B842]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                  Initial Password <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full h-10 px-3 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] focus:outline-none focus:border-[#E5B842]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                  Role Permission
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full h-10 px-3 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] focus:outline-none focus:border-[#E5B842]"
                >
                  <option value="staff">Shop Staff (Standard Operations)</option>
                  <option value="accountant">Accountant (Shop & Inventory Manager)</option>
                  <option value="admin">Admin (Full Operational Control)</option>
                </select>
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
                  {loading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
