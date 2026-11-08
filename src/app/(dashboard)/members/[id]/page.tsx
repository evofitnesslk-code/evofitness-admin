import { getMemberById } from '@/app/actions/members';
import { notFound } from 'next/navigation';
import { MemberDetailClient } from '@/components/members/member-detail-client';

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const member = await getMemberById(id);

  if (!member) {
    notFound();
  }

  return <MemberDetailClient member={member} />;
}
