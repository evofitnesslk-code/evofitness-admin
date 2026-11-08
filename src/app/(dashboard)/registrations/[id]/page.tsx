import { findMemberMatches, getRegistrationById } from '@/app/actions/registrations';
import { getCurrentUserProfile } from '@/app/actions/auth';
import { RegistrationDetailClient } from '@/components/registrations/registration-detail-client';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function RegistrationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [{ profile }, registration] = await Promise.all([
    getCurrentUserProfile(),
    getRegistrationById(id),
  ]);

  if (!registration) {
    notFound();
  }

  const matches = await findMemberMatches(registration.phone, registration.email);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-[#27272A]">
        <Link
          href="/registrations"
          className="p-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-[#F4F4F5] border border-[#27272A] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-[#F4F4F5] truncate">
            {registration.full_name}
          </h1>
          <p className="text-xs text-[#A1A1AA]">
            Application ref {registration.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
      </div>

      <RegistrationDetailClient
        registration={registration}
        memberMatches={matches}
        isAdmin={profile?.role === 'admin'}
      />
    </div>
  );
}
