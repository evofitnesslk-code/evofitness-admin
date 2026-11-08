import { getMemberships } from '@/app/actions/memberships';
import { MembershipsListClient } from '@/components/memberships/memberships-list-client';

export default async function MembershipsPage() {
  const memberships = await getMemberships();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#F4F4F5]">
          Membership Orders
        </h1>
        <p className="text-xs text-[#A1A1AA] mt-0.5">
          View all issued memberships, EF invoice numbers, and payment balances
        </p>
      </div>

      <MembershipsListClient initialMemberships={memberships} />
    </div>
  );
}
