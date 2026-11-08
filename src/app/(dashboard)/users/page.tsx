import { getUsers } from '@/app/actions/users';
import { getCurrentUserProfile } from '@/app/actions/auth';
import { UsersListClient } from '@/components/users/users-list-client';
import { redirect } from 'next/navigation';

export default async function UsersPage() {
  const { profile } = await getCurrentUserProfile();

  if (profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  const { users } = await getUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#F4F4F5]">
          Staff & User Management
        </h1>
        <p className="text-xs text-[#A1A1AA] mt-0.5">
          Admin control panel for managing staff logins, roles, and access credentials
        </p>
      </div>

      <UsersListClient initialUsers={users || []} />
    </div>
  );
}
