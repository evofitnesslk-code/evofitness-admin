import { getSuppliers } from '@/app/actions/shop';
import { getCurrentUserProfile } from '@/app/actions/auth';
import { SuppliersListClient } from '@/components/shop/suppliers-list-client';

export default async function SuppliersPage() {
  const [suppliers, { profile }] = await Promise.all([
    getSuppliers(),
    getCurrentUserProfile(),
  ]);

  return (
    <div className="space-y-6">
      <SuppliersListClient
        initialSuppliers={suppliers}
        currentUserProfile={profile}
      />
    </div>
  );
}
