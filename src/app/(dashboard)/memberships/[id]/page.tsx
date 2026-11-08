import { getMembershipById } from '@/app/actions/memberships';
import { MembershipDetailClient } from '@/components/memberships/membership-detail-client';
import { notFound } from 'next/navigation';

export default async function MembershipDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const membership = await getMembershipById(id);

  if (!membership) {
    notFound();
  }

  return <MembershipDetailClient membership={membership} />;
}
