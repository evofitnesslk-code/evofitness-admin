'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Package, Truck, ClipboardList, Receipt } from 'lucide-react';

const tabs = [
  { label: 'Stock', href: '/shop', icon: Package },
  { label: 'Purchases', href: '/shop/purchases', icon: ClipboardList },
  { label: 'Sales', href: '/shop/sales', icon: Receipt },
  { label: 'Suppliers', href: '/shop/suppliers', icon: Truck },
];

export function ShopTabs() {
  const pathname = usePathname();
  return (
    <div className="flex gap-1 p-1 rounded-2xl bg-[#121214] border border-[#27272A] overflow-x-auto">
      {tabs.map((t) => {
        const isActive =
          t.href === '/shop'
            ? pathname === '/shop'
            : pathname === t.href || pathname.startsWith(`${t.href}/`);
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex items-center gap-2 px-4 min-h-[44px] rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-[#E5B842]/10 text-[#E5B842] border border-[#E5B842]/30'
                : 'text-[#A1A1AA] hover:text-[#F4F4F5] border border-transparent'
            }`}
          >
            <Icon className="w-4 h-4" />
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
