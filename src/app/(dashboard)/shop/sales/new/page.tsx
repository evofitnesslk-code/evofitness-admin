import { getNextSaleNumber, getProducts } from '@/app/actions/shop';
import { getCurrentUserProfile } from '@/app/actions/auth';
import { PosClient } from '@/components/shop/pos-client';

export default async function NewSalePage() {
  const [{ profile }, products, nextSaleNumber] = await Promise.all([
    getCurrentUserProfile(),
    getProducts(),
    getNextSaleNumber(),
  ]);

  const isManager = profile?.role === 'admin' || profile?.role === 'accountant';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-[#F4F4F5]">New Sale</h2>
        <p className="text-xs text-[#A1A1AA]">
          Counter point-of-sale — pick in-stock items, take payment
        </p>
      </div>

      <PosClient
        products={products.filter((p) => p.is_active)}
        initialSaleNumber={nextSaleNumber}
        isManager={isManager}
        profile={profile}
      />
    </div>
  );
}
