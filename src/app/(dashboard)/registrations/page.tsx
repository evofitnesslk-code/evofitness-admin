import {
  getPendingRegistrationCount,
  getPublicJoinUrl,
  getRegistrations,
} from '@/app/actions/registrations';
import { getCurrentUserProfile } from '@/app/actions/auth';
import { generateQrSvg } from '@/lib/qr';
import { RegistrationsListClient } from '@/components/registrations/registrations-list-client';
import { QrCode } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function RegistrationsPage() {
  const [{ profile }, registrations, pendingCount, joinUrl] = await Promise.all([
    getCurrentUserProfile(),
    getRegistrations({ status: 'all' }),
    getPendingRegistrationCount(),
    getPublicJoinUrl(),
  ]);

  const qrSvg = await generateQrSvg(joinUrl);
  const isAdmin = profile?.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[#F4F4F5]">
              New Registrations
            </h1>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#E5B842]/10 border border-[#E5B842]/30 text-[10px] font-semibold text-[#E5B842]">
                {pendingCount} pending
              </span>
            )}
          </div>
          <p className="text-xs text-[#A1A1AA] mt-0.5">
            Applications submitted through the public QR membership form
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-[#18181B] border border-[#27272A]">
          <QrCode className="w-4 h-4 text-[#E5B842]" />
          <span className="text-[11px] text-[#A1A1AA]">Share the QR code with new walk-ins</span>
        </div>
      </div>

      <RegistrationsListClient
        initialRegistrations={registrations}
        pendingCount={pendingCount}
        joinUrl={joinUrl}
        qrSvg={qrSvg}
        isAdmin={isAdmin}
      />
    </div>
  );
}
