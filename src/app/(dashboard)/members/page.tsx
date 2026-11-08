import { getMembers } from '@/app/actions/members';
import { MemberListClient } from '@/components/members/member-list-client';

export default async function MembersPage() {
  const members = await getMembers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#F4F4F5]">
          Member Directory
        </h1>
        <p className="text-xs text-[#A1A1AA] mt-0.5">
          Manage gym members, view registration details, and membership records
        </p>
      </div>

      <MemberListClient initialMembers={members} />
    </div>
  );
}
