'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { MemberRegistration, RegistrationStatus } from '@/types/database';
import { applicationKindLabel } from '@/lib/registration-options';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  Check,
  Copy,
  Download,
  ExternalLink,
  Inbox,
  Loader2,
  QrCode,
  RefreshCw,
  Search,
  Users,
  X,
} from 'lucide-react';

interface RegistrationsListClientProps {
  initialRegistrations: MemberRegistration[];
  pendingCount: number;
  joinUrl: string;
  qrSvg: string;
  isAdmin: boolean;
}

type StatusFilter = RegistrationStatus | 'all';

const STATUS_STYLES: Record<RegistrationStatus, string> = {
  pending: 'bg-[#E5B842]/10 border-[#E5B842]/30 text-[#E5B842]',
  approved: 'bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]',
  rejected: 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]',
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function RegistrationsListClient({
  initialRegistrations,
  pendingCount,
  joinUrl,
  qrSvg,
  isAdmin,
}: RegistrationsListClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState<StatusFilter>('pending');
  const [search, setSearch] = useState('');
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const counts = useMemo(() => {
    const base = { all: initialRegistrations.length, pending: 0, approved: 0, rejected: 0 };
    for (const registration of initialRegistrations) base[registration.status] += 1;
    return base;
  }, [initialRegistrations]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return initialRegistrations.filter((registration) => {
      if (status !== 'all' && registration.status !== status) return false;
      if (!term) return true;
      return [registration.full_name, registration.phone, registration.email, registration.preferred_plan]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [initialRegistrations, status, search]);

  const hasAny = initialRegistrations.length > 0;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function downloadQr() {
    const blob = new Blob([qrSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'evo-fitness-registration-qr.svg';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function refresh() {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 800);
  }

  const tabs: Array<{ id: StatusFilter; label: string }> = [
    { id: 'pending', label: 'Pending' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'all', label: 'All' },
  ];

  return (
    <div className="space-y-4">
      {/* Share card */}
      <div className="card-luxury rounded-2xl bg-[#121214] p-5 border-gold-accent">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex items-center gap-4">
            <div
              className="w-[104px] h-[104px] shrink-0 rounded-xl bg-white p-1.5 overflow-hidden [&>svg]:w-full [&>svg]:h-full"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-[#E5B842]" />
                <h2 className="text-sm font-bold text-[#F4F4F5]">Share the application QR</h2>
              </div>
              <p className="text-[11px] text-[#A1A1AA] mt-1 max-w-sm leading-relaxed">
                Applicants scan this code, fill the form on their phone, and their application lands
                here as pending.
              </p>
              <p className="text-[11px] text-[#71717A] mt-1.5 truncate">{joinUrl}</p>
            </div>
          </div>

          <div className="sm:ml-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsShareOpen(true)}
              className="h-10 px-3.5 rounded-xl bg-gold-gradient text-[#09090B] font-semibold text-xs hover:brightness-105 transition-all flex items-center gap-2 cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              Show QR
            </button>
            <button
              type="button"
              onClick={copyLink}
              className="h-10 px-3.5 rounded-xl bg-[#18181B] border border-[#27272A] hover:border-[#3F3F46] text-[#F4F4F5] text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-[#10B981]" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy link'}
            </button>
            <a
              href={joinUrl}
              target="_blank"
              rel="noreferrer"
              className="h-10 px-3.5 rounded-xl bg-[#18181B] border border-[#27272A] hover:border-[#3F3F46] text-[#F4F4F5] text-xs font-medium transition-colors flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open form
            </a>
            <button
              type="button"
              onClick={downloadQr}
              className="h-10 px-3.5 rounded-xl bg-[#18181B] border border-[#27272A] hover:border-[#3F3F46] text-[#F4F4F5] text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card-luxury rounded-2xl bg-[#121214] p-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#18181B] border border-[#27272A] overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatus(tab.id)}
                className={cn(
                  'min-h-[36px] px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer',
                  status === tab.id
                    ? 'bg-[#E5B842]/10 text-[#E5B842]'
                    : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
                )}
              >
                {tab.label}
                <span className="ml-1.5 text-[10px] text-[#71717A]">{counts[tab.id]}</span>
              </button>
            ))}
          </div>

          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, mobile, email or plan"
              className="w-full h-10 pl-9 pr-3 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#E5B842]"
            />
          </div>

          <button
            type="button"
            onClick={refresh}
            className="h-10 px-3.5 rounded-xl bg-[#18181B] border border-[#27272A] hover:border-[#3F3F46] text-[#A1A1AA] hover:text-[#F4F4F5] text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer shrink-0"
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Refresh
          </button>
        </div>
      </div>

      {/* List */}
      {!hasAny ? (
        <EmptyState
          icon={<Inbox className="w-6 h-6 text-[#71717A]" />}
          title="No applications yet"
          description="Share the QR code with new walk-ins. Their applications will appear here for review."
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Search className="w-6 h-6 text-[#71717A]" />}
          title={search ? 'No matching applications' : `No ${status} applications`}
          description={
            search
              ? 'Try a different name, mobile number or email.'
              : 'Switch tabs to see applications in another state.'
          }
        />
      ) : (
        <div className="space-y-2">
          {visible.map((registration) => (
            <Link
              key={registration.id}
              href={`/registrations/${registration.id}`}
              className="card-luxury block rounded-2xl bg-[#121214] p-4 hover:border-[#3F3F46] transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full border border-[#E5B842]/30 bg-[#E5B842]/10 text-[10px] font-semibold text-[#E5B842]">
                      {applicationKindLabel(registration.application_kind)}
                    </span>
                    <span className="px-2 py-0.5 rounded-full border border-[#27272A] bg-[#18181B] text-[10px] font-medium text-[#A1A1AA] flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {registration.people_count ?? 1}
                      {(registration.people_count ?? 1) === 1 ? ' person' : ' people'}
                    </span>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full border text-[10px] font-semibold capitalize',
                        STATUS_STYLES[registration.status]
                      )}
                    >
                      {registration.status}
                    </span>
                    {registration.parq_has_condition && (
                      <span className="px-2 py-0.5 rounded-full border border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[10px] font-semibold text-[#F59E0B] flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Health note
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2 min-w-0">
                    <span className="text-sm font-semibold text-[#F4F4F5] truncate">
                      {registration.full_name}
                    </span>
                    {(registration.people_count ?? 1) > 1 && (
                      <span className="text-[11px] text-[#A1A1AA] shrink-0">
                        + {(registration.people_count ?? 1) - 1} more
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#A1A1AA] flex-wrap">
                    <span className="uppercase text-[10px]">{registration.gender}</span>
                    <span>{registration.phone}</span>
                    {registration.email && (
                      <span className="truncate max-w-[160px]">{registration.email}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-[#71717A] flex-wrap">
                    <span>Ref {registration.id.slice(0, 8).toUpperCase()}</span>
                    <span>{formatDateTime(registration.submitted_at)}</span>
                    {registration.preferred_plan && (
                      <span className="text-[#D4D4D8]">Prefers: {registration.preferred_plan}</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] text-[#E5B842] font-medium">
                    {registration.status === 'pending' && isAdmin ? 'Review' : 'View'}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* QR dialog */}
      {isShareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setIsShareOpen(false)}
            className="absolute inset-0 bg-[#09090B]/80 backdrop-blur-sm cursor-default"
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-[#27272A] bg-[#121214] p-6 text-center">
            <button
              type="button"
              onClick={() => setIsShareOpen(false)}
              className="absolute right-3 top-3 p-2 rounded-lg text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#27272A] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-sm font-bold text-[#F4F4F5]">Scan to join EVO Fitness</h3>
            <p className="text-[11px] text-[#A1A1AA] mt-1">
              Point a phone camera at the code to open the application form.
            </p>
            <div
              className="mt-5 mx-auto w-full max-w-[260px] rounded-2xl bg-white p-3 [&>svg]:w-full [&>svg]:h-auto"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <p className="mt-4 text-[11px] text-[#71717A] break-all">{joinUrl}</p>
            <button
              type="button"
              onClick={downloadQr}
              className="mt-4 w-full h-11 rounded-xl bg-gold-gradient text-[#09090B] font-semibold text-xs hover:brightness-105 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download QR (SVG)
            </button>
            <p className="mt-3 text-[10px] text-[#71717A]">
              Print it for the front desk, or post it at the gym entrance.
            </p>
          </div>
        </div>
      )}

      {pendingCount > 0 && status !== 'pending' && (
        <p className="text-[11px] text-[#A1A1AA] text-center">
          {pendingCount} application{pendingCount === 1 ? '' : 's'} awaiting review -{' '}
          <button
            type="button"
            onClick={() => setStatus('pending')}
            className="text-[#E5B842] hover:underline cursor-pointer"
          >
            review now
          </button>
        </p>
      )}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="card-luxury rounded-2xl bg-[#121214] p-12 text-center">
      <div className="w-12 h-12 rounded-2xl bg-[#18181B] border border-[#27272A] flex items-center justify-center mx-auto mb-3">
        {icon}
      </div>
      <p className="text-sm font-semibold text-[#F4F4F5]">{title}</p>
      <p className="text-xs text-[#A1A1AA] mt-1 max-w-sm mx-auto">{description}</p>
    </div>
  );
}
