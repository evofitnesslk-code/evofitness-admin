'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Member } from '@/types/database';
import { RegisterMemberModal } from './register-member-modal';
import { formatDate } from '@/lib/utils';
import {
  Search,
  UserPlus,
  Phone,
  Mail,
  ChevronRight,
  Users,
} from 'lucide-react';

interface MemberListClientProps {
  initialMembers: Member[];
}

export function MemberListClient({ initialMembers }: MemberListClientProps) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Client search and filter
  const filtered = members.filter((m) => {
    const matchesSearch =
      !search ||
      m.full_name.toLowerCase().includes(search.toLowerCase()) ||
      m.phone.includes(search) ||
      (m.email && m.email.toLowerCase().includes(search.toLowerCase())) ||
      (m.nic_passport && m.nic_passport.toLowerCase().includes(search.toLowerCase()));

    const matchesGender =
      genderFilter === 'all' || m.gender === genderFilter;

    return matchesSearch && matchesGender;
  });

  return (
    <div className="space-y-6">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, email, NIC..."
              className="w-full h-10 pl-9 pr-4 bg-[#121214] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#E5B842]"
            />
          </div>

          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value as 'all' | 'male' | 'female')}
            className="h-10 px-3 bg-[#121214] border border-[#27272A] rounded-xl text-xs text-[#A1A1AA] focus:outline-none focus:border-[#E5B842]"
          >
            <option value="all">All Genders</option>
            <option value="male">Gents (Male)</option>
            <option value="female">Ladies (Female)</option>
          </select>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="h-10 px-4 rounded-xl bg-gold-gradient text-[#09090B] font-semibold text-xs hover:brightness-105 transition-all shadow-[0_2px_12px_rgba(229,184,66,0.2)] flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register Member</span>
        </button>
      </div>

      {/* Members Directory List */}
      {filtered.length === 0 ? (
        <div className="card-luxury rounded-2xl p-12 text-center bg-[#121214]">
          <div className="w-12 h-12 rounded-full bg-[#18181B] border border-[#27272A] flex items-center justify-center text-[#71717A] mx-auto mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-[#F4F4F5]">
            No members found
          </h3>
          <p className="text-xs text-[#A1A1AA] mt-1">
            {search ? 'Try adjusting your search criteria.' : 'Register your first gym member to get started.'}
          </p>
        </div>
      ) : (
        <div className="card-luxury rounded-2xl bg-[#121214] overflow-hidden border border-[#27272A]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#27272A] bg-[#18181B]/70 text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">Phone & Email</th>
                  <th className="py-3 px-4">Gender</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A]/60 text-xs">
                {filtered.map((member) => (
                  <tr
                    key={member.id}
                    className="hover:bg-[#18181B]/50 transition-colors group"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#18181B] border border-[#3F3F46] flex items-center justify-center font-bold text-xs text-[#E5B842] shrink-0">
                          {member.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <Link
                            href={`/members/${member.id}`}
                            className="font-semibold text-[#F4F4F5] hover:text-[#E5B842] transition-colors block"
                          >
                            {member.full_name}
                          </Link>
                          {member.nic_passport && (
                            <span className="text-[10px] text-[#71717A]">
                              NIC: {member.nic_passport}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-[#D4D4D8]">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Phone className="w-3.5 h-3.5 text-[#A1A1AA]" />
                        <span>{member.phone}</span>
                      </div>
                      {member.email && (
                        <div className="flex items-center gap-1.5 text-[11px] text-[#71717A] mt-0.5">
                          <Mail className="w-3 h-3" />
                          <span className="truncate max-w-[180px]">{member.email}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-[#18181B] border border-[#27272A] text-[10px] uppercase font-medium text-[#A1A1AA]">
                        {member.gender}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-[#A1A1AA]">
                      {formatDate(member.created_at)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/members/${member.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-[#E5B842] hover:bg-[#E5B842]/10 transition-colors"
                      >
                        Profile
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      <RegisterMemberModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(newMember) => {
          setMembers([newMember, ...members]);
        }}
      />
    </div>
  );
}
