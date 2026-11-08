'use client';

import { useState, useMemo } from 'react';
import type { Member } from '@/types/database';
import {
  Search,
  X,
  Phone,
  Mail,
  UserPlus,
  Check,
  Users,
} from 'lucide-react';

interface SelectMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  selectedMemberId: string;
  onSelectMember: (member: Member) => void;
  onOpenRegisterModal: () => void;
}

type SearchFilterType = 'all' | 'name' | 'mobile';

export function SelectMemberModal({
  isOpen,
  onClose,
  members,
  selectedMemberId,
  onSelectMember,
  onOpenRegisterModal,
}: SelectMemberModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<SearchFilterType>('all');

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return members;

    return members.filter((member) => {
      const nameMatch = member.full_name.toLowerCase().includes(q);
      const phoneMatch = (member.phone || '').toLowerCase().includes(q);
      const emailMatch = (member.email || '').toLowerCase().includes(q);

      if (filterType === 'name') {
        return nameMatch;
      }
      if (filterType === 'mobile') {
        return phoneMatch;
      }
      return nameMatch || phoneMatch || emailMatch;
    });
  }, [members, searchQuery, filterType]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl h-[600px] flex flex-col bg-[#121214] border border-[#27272A] rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#27272A] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E5B842]/10 border border-[#E5E7EB]/20 flex items-center justify-center text-[#E5B842]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#F4F4F5]">
                  Select Gym Member
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#18181B] border border-[#27272A] text-[10px] text-[#A1A1AA] font-semibold">
                  {members.length} members
                </span>
              </div>
              <p className="text-xs text-[#A1A1AA]">
                Search and assign a member to this membership order
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenRegisterModal();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gold-gradient text-[#09090B] font-semibold text-xs hover:brightness-105 transition-all shadow-[0_2px_8px_rgba(229,184,66,0.2)] cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>New Member</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#18181B] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar & Filter Toggle */}
        <div className="p-4 border-b border-[#27272A] bg-[#18181B]/40 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  filterType === 'name'
                    ? 'Search by member name...'
                    : filterType === 'mobile'
                    ? 'Search by mobile number (e.g. 077)...'
                    : 'Search by name, mobile, or email...'
                }
                autoFocus
                className="w-full h-10 pl-9 pr-4 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#E5B842] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#F4F4F5]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Toggle Segmented Control */}
            <div className="flex items-center p-1 bg-[#121214] border border-[#27272A] rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-gold-gradient text-[#09090B] font-semibold shadow-sm'
                    : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterType('name')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  filterType === 'name'
                    ? 'bg-gold-gradient text-[#09090B] font-semibold shadow-sm'
                    : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
                }`}
              >
                Name
              </button>
              <button
                type="button"
                onClick={() => setFilterType('mobile')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  filterType === 'mobile'
                    ? 'bg-gold-gradient text-[#09090B] font-semibold shadow-sm'
                    : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
                }`}
              >
                Mobile
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Fixed-Height Member List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredMembers.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#18181B] border border-[#27272A] flex items-center justify-center text-[#71717A] mb-3">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-[#F4F4F5]">
                No members found
              </h3>
              <p className="text-xs text-[#71717A] mt-1 max-w-sm">
                No registered member matches &quot;{searchQuery}&quot;. You can register this member directly right now.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRegisterModal();
                }}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-gradient text-[#09090B] font-semibold text-xs hover:brightness-105 transition-all shadow-[0_2px_10px_rgba(229,184,66,0.2)] cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                Register New Member
              </button>
            </div>
          ) : (
            filteredMembers.map((member) => {
              const isSelected = selectedMemberId === member.id;
              const initials = member.full_name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();

              return (
                <div
                  key={member.id}
                  onClick={() => {
                    onSelectMember(member);
                    onClose();
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                    isSelected
                      ? 'bg-[#18181B] border-[#E5B842] shadow-[0_0_12px_rgba(229,184,66,0.15)] ring-1 ring-[#E5B842]'
                      : 'bg-[#18181B]/40 hover:bg-[#18181B] border-[#27272A] hover:border-[#3F3F46]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border ${
                        isSelected
                          ? 'bg-[#E5B842]/20 border-[#E5B842] text-[#E5B842]'
                          : 'bg-[#27272A] border-[#3F3F46] text-[#A1A1AA] group-hover:text-[#F4F4F5]'
                      }`}
                    >
                      {initials}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#F4F4F5] truncate">
                          {member.full_name}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            member.gender === 'male'
                              ? 'bg-[#3B82F6]/10 text-[#60A5FA] border border-[#3B82F6]/30'
                              : member.gender === 'female'
                              ? 'bg-[#EC4899]/10 text-[#F472B6] border border-[#EC4899]/30'
                              : 'bg-[#A1A1AA]/10 text-[#A1A1AA] border border-[#A1A1AA]/30'
                          }`}
                        >
                          {member.gender}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-[#A1A1AA] mt-1">
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[#71717A]" />
                          {member.phone}
                        </span>
                        {member.email && (
                          <span className="hidden sm:inline-flex items-center gap-1 truncate max-w-[180px]">
                            <Mail className="w-3 h-3 text-[#71717A]" />
                            {member.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#E5B842] text-[#09090B] font-bold text-xs">
                        <Check className="w-3.5 h-3.5" />
                        Selected
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectMember(member);
                          onClose();
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-[#27272A] group-hover:bg-[#E5B842] text-[#F4F4F5] group-hover:text-[#09090B] font-semibold text-xs transition-all cursor-pointer"
                      >
                        Select
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
