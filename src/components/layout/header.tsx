'use client';

import Image from 'next/image';
import { logoutAction } from '@/app/actions/auth';
import type { Profile } from '@/types/database';
import { LogOut, ShieldCheck, UserCheck } from 'lucide-react';

interface HeaderProps {
  profile: Profile | null;
}

export function Header({ profile }: HeaderProps) {
  const isAdmin = profile?.role === 'admin';

  return (
    <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-[#121214]/90 backdrop-blur-xl border-b border-[#27272A] print:hidden">
      <div className="flex items-center gap-2.5">
        <div className="relative w-8 h-8 shrink-0">
          <Image
            src="/evofitness-logo.webp"
            alt="EVO Fitness"
            fill
            sizes="32px"
            className="object-contain"
          />
        </div>
        <div>
          <span className="text-xs font-bold tracking-wider text-[#F4F4F5] uppercase block leading-none">
            EVO FITNESS
          </span>
          <div className="flex items-center gap-1 mt-0.5">
            {isAdmin ? (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-[#E5B842]">
                <ShieldCheck className="w-2.5 h-2.5" />
                Admin
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-[9px] text-[#A1A1AA]">
                <UserCheck className="w-2.5 h-2.5" />
                Staff
              </span>
            )}
          </div>
        </div>
      </div>

      <form action={logoutAction}>
        <button
          type="submit"
          className="p-2 rounded-lg text-[#A1A1AA] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </form>
    </header>
  );
}
