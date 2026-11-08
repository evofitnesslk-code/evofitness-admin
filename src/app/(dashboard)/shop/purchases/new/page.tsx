import { ShieldAlert } from 'lucide-react';
import { getProducts, getSuppliers } from '@/app/actions/shop';
import { getCurrentUserProfile } from '@/app/actions/auth';
import { NewPurchaseClient } from '@/components/shop/new-purchase-client';

export default async function NewPurchasePage() {
  const [{ profile }, suppliers, products] = await Promise.all([
    getCurrentUserProfile(),
    getSuppliers(true),
    getProducts(),
  ]);

  const isManager = profile?.role === 'admin' || profile?.role === 'accountant';

  if (!isManager) {
    return (
      <div className="rounded-2xl p-12 text-center bg-[#121214] border border-[#27272A]">
        <ShieldAlert className="w-8 h-8 text-[#E5B842] mx-auto mb-2" />
        <h2 className="text-sm font-bold text-[#F4F4F5]">Permission denied</h2>
        <p className="text-xs text-[#A1A1AA] mt-1">
          Recording purchases requires a shop manager role (admin or
          accountant).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-[#F4F4F5]">
          Record Purchase (GRN)
        </h2>
        <p className="text-xs text-[#A1A1AA]">
          Book supplier stock intake with unit costs and sale prices
        </p>
      </div>

      <NewPurchaseClient suppliers={suppliers} products={products} />
    </div>
  );
}
