'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Profile } from '@/types/database';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  Dumbbell,
  BarChart3,
  UserCog,
  Package,
} from 'lucide-react';

interface MobileNavProps {
  profile: Profile | null;
}

export function MobileNav({ profile }: MobileNavProps) {
  const pathname = usePathname();
  const isAdmin = profile?.role === 'admin';

  const navItems = [
    { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Members', href: '/members', icon: Users },
    { label: 'Orders', href: '/memberships', icon: Receipt },
    { label: 'Shop', href: '/shop', icon: Package },
    { label: 'Payments', href: '/payments', icon: CreditCard },
    { label: 'Reports', href: '/reports', icon: BarChart3 },
    ...(isAdmin
      ? [{ label: 'Users', href: '/users', icon: UserCog }]
      : [{ label: 'Trainers', href: '/trainers', icon: Dumbbell }]),
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#121214]/95 backdrop-blur-xl border-t border-[#27272A] px-2 py-1.5 pb-safe flex items-center justify-around print:hidden">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 px-2 rounded-xl text-[10px] font-medium transition-colors ${
              isActive
                ? 'text-[#E5B842]'
                : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
            }`}
          >
            <Icon
              className={`w-5 h-5 mb-0.5 ${
                isActive ? 'text-[#E5B842]' : 'text-[#71717A]'
              }`}
            />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
