import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { getPurchases } from '@/app/actions/shop';
import { getCurrentUserProfile } from '@/app/actions/auth';
import { PurchasesListClient } from '@/components/shop/purchases-list-client';

export default async function PurchasesPage() {
  const [purchases, { profile }] = await Promise.all([
    getPurchases(),
    getCurrentUserProfile(),
  ]);

  const isManager = profile?.role === 'admin' || profile?.role === 'accountant';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-[#F4F4F5]">
            Purchases ({purchases.length})
          </h2>
          <p className="text-xs text-[#A1A1AA]">
            Supplier invoices / goods-received notes and stock intake
          </p>
        </div>

        {isManager && (
          <Link
            href="/shop/purchases/new"
            className="min-h-[44px] px-4 rounded-xl bg-gold-gradient text-[#09090B] font-semibold text-xs hover:brightness-105 transition-all shadow-[0_2px_12px_rgba(229,184,66,0.2)] flex items-center justify-center gap-2 shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Record Purchase (GRN)</span>
          </Link>
        )}
      </div>

      <PurchasesListClient initialPurchases={purchases} profile={profile} />
    </div>
  );
}
