'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/actions/auth';
import type { Profile } from '@/types/database';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  Dumbbell,
  BarChart3,
  UserCog,
  LogOut,
  ShieldCheck,
  UserCheck,
  ClipboardList,
  Package,
} from 'lucide-react';

interface SidebarProps {
  profile: Profile | null;
  pendingRegistrations?: number;
}

export function Sidebar({ profile, pendingRegistrations = 0 }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = profile?.role === 'admin';

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Registrations', href: '/registrations', icon: ClipboardList },
    { label: 'Members', href: '/members', icon: Users },
    { label: 'Memberships', href: '/memberships', icon: Receipt },
    { label: 'Payments', href: '/payments', icon: CreditCard },
    { label: 'Shop', href: '/shop', icon: Package },
    { label: 'Trainers', href: '/trainers', icon: Dumbbell },
    { label: 'Reports', href: '/reports', icon: BarChart3 },
    ...(isAdmin
      ? [{ label: 'Staff Users', href: '/users', icon: UserCog }]
      : []),
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 fixed left-4 top-4 bottom-4 z-30 border border-[#27272A] bg-[#121214]/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden print:hidden shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#27272A]/70 flex items-center gap-3">
        <div className="relative w-10 h-10 shrink-0">
          <Image
            src="/evofitness-logo.webp"
            alt="EVO Fitness"
            fill
            sizes="40px"
            className="object-contain"
          />
        </div>
        <div className="overflow-hidden">
          <span className="text-sm font-bold tracking-wider text-[#F4F4F5] uppercase block truncate">
            EVO FITNESS
          </span>
          <span className="text-[10px] text-[#A1A1AA] block truncate">
            Balapokuna Rd, Colombo 5
          </span>
        </div>
      </div>

      {/* User Profile Card */}
      <div className="px-4 py-3 border-b border-[#27272A]/50 bg-[#18181B]/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#27272A] border border-[#3F3F46] flex items-center justify-center text-xs font-semibold text-[#E5B842] shrink-0">
            {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="overflow-hidden min-w-0 flex-1">
            <p className="text-xs font-medium text-[#F4F4F5] truncate">
              {profile?.full_name || profile?.email || 'Authenticated User'}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              {isAdmin ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#E5B842]">
                  <ShieldCheck className="w-3 h-3" />
                  Admin
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] text-[#A1A1AA]">
                  <UserCheck className="w-3 h-3" />
                  Shop Staff
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-[#E5B842]/10 text-[#E5B842] border border-[#E5B842]/30 font-semibold shadow-[0_2px_12px_rgba(229,184,66,0.1)]'
                  : 'text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#18181B]'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-[#E5B842]' : 'text-[#71717A]'
                }`}
              />
              <span className="truncate">{item.label}</span>
              {item.href === '/registrations' && pendingRegistrations > 0 && (
                <span className="ml-auto min-w-[20px] px-1.5 py-0.5 rounded-full bg-[#E5B842] text-[#09090B] text-[10px] font-bold text-center">
                  {pendingRegistrations}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout Footer */}
      <div className="p-3 border-t border-[#27272A]/70">
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs text-[#A1A1AA] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
