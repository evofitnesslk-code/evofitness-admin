import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { getSales } from '@/app/actions/shop';
import { getCurrentUserProfile } from '@/app/actions/auth';
import { SalesListClient } from '@/components/shop/sales-list-client';

export default async function SalesPage() {
  const [sales, { profile }] = await Promise.all([
    getSales(),
    getCurrentUserProfile(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-[#F4F4F5]">
            Counter Sales ({sales.length})
          </h2>
          <p className="text-xs text-[#A1A1AA]">
            Shop counter receipts and payment methods
          </p>
        </div>

        <Link
          href="/shop/sales/new"
          className="min-h-[44px] px-4 rounded-xl bg-gold-gradient text-[#09090B] font-semibold text-xs hover:brightness-105 transition-all shadow-[0_2px_12px_rgba(229,184,66,0.2)] flex items-center justify-center gap-2 shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Sale</span>
        </Link>
      </div>

      <SalesListClient initialSales={sales} profile={profile} />
    </div>
  );
}
