'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Loader2, Mail } from 'lucide-react';
import { sendExpiryEmails, type ExpiringMembershipRow } from '@/app/actions/expiry-report';
import { formatDate, formatLKR } from '@/lib/utils';

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

function monthLabel(month: string) {
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${month}-01T00:00:00Z`)
  );
}

export function ExpiryReportClient({ month, rows }: { month: string; rows: ExpiringMembershipRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const withEmail = useMemo(
    () => rows.filter((r) => r.members.some((m) => m.email)),
    [rows]
  );

  function go(delta: number) {
    setSelected(new Set());
    setMessage(null);
    router.push(`/reports/expiries?month=${shiftMonth(month, delta)}`);
  }

  function toggle(id: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function send(ids: string[]) {
    if (ids.length === 0 || pending) return;
    setMessage(null);
    startTransition(async () => {
      const res = await sendExpiryEmails(ids);
      if (res.error) setMessage({ ok: false, text: res.error });
      else
        setMessage({
          ok: res.failed === 0,
          text: `${res.sent} sent${res.failed ? `, ${res.failed} failed` : ''}${
            res.skippedNoEmail ? `, ${res.skippedNoEmail} without an email address` : ''
          }.`,
        });
      setSelected(new Set());
    });
  }

  function exportCSV() {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = [
      ['Invoice', 'Member', 'Phone', 'Email', 'Plan', 'Expiry Date', 'Days Left'].join(','),
      ...rows.map((r) =>
        [
          r.invoice_number,
          r.members.map((m) => m.name).join(' / '),
          r.members.map((m) => m.phone).join(' / '),
          r.members.map((m) => m.email ?? '').join(' / '),
          r.plan_name,
          r.end_date,
          String(r.days_remaining),
        ]
          .map(esc)
          .join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `expiring_memberships_${month}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const btn =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => go(-1)} aria-label="Previous month" className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#27272A] text-[#A1A1AA] hover:text-[#F4F4F5]">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-36 text-center text-sm font-semibold text-[#F4F4F5]">{monthLabel(month)}</span>
          <button type="button" onClick={() => go(1)} aria-label="Next month" className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#27272A] text-[#A1A1AA] hover:text-[#F4F4F5]">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportCSV} disabled={rows.length === 0} className={`${btn} border border-[#27272A] text-[#D4D4D8] hover:border-[#3F3F46]`}>
            Export CSV
          </button>
          <button
            type="button"
            disabled={pending || selected.size === 0}
            onClick={() => send([...selected])}
            className={`${btn} bg-[#E5B842] text-[#09090B] hover:bg-[#F5D061]`}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Email selected ({selected.size})
          </button>
          <button
            type="button"
            disabled={pending || withEmail.length === 0}
            onClick={() => send(withEmail.map((r) => r.membership_id))}
            className={`${btn} border border-[#E5B842]/40 text-[#F5D061] hover:border-[#E5B842]/70`}
          >
            Email all ({withEmail.length})
          </button>
        </div>
      </div>

      {message && (
        <p role="status" className={`rounded-xl border px-4 py-3 text-sm ${message.ok ? 'border-[#10B981]/30 text-[#10B981]' : 'border-[#EF4444]/30 text-[#EF4444]'}`}>
          {message.text}
        </p>
      )}

      <div className="card-luxury overflow-x-auto rounded-2xl border border-[#27272A] bg-[#121214]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#27272A] text-[11px] uppercase tracking-wider text-[#A1A1AA]">
              <th className="w-12 px-4 py-3" />
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3 text-right">Value</th>
              <th className="px-4 py-3 text-right">Send</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-[#A1A1AA]">
                  No active memberships expire in {monthLabel(month)}.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const hasEmail = r.members.some((m) => m.email);
                return (
                  <tr key={r.membership_id} className="border-b border-[#27272A]/60 align-top">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${r.members[0]?.name ?? r.invoice_number}`}
                        checked={selected.has(r.membership_id)}
                        disabled={!hasEmail}
                        onChange={() => toggle(r.membership_id)}
                        className="h-5 w-5 accent-[#E5B842]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      {r.members.map((m) => (
                        <p key={m.id} className="font-medium text-[#F4F4F5]">{m.name}</p>
                      ))}
                      <p className="text-[11px] text-[#71717A]">{r.invoice_number}</p>
                    </td>
                    <td className="px-4 py-3 text-[#D4D4D8]">{r.plan_name}</td>
                    <td className="px-4 py-3">
                      <p className="text-[#F4F4F5]">{formatDate(r.end_date)}</p>
                      <p className={`text-[11px] ${r.days_remaining <= 10 ? 'text-[#F59E0B]' : 'text-[#71717A]'}`}>
                        {r.days_remaining < 0 ? `${-r.days_remaining} days ago` : r.days_remaining === 0 ? 'Today' : `${r.days_remaining} days left`}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#A1A1AA]">
                      {r.members.map((m) => (
                        <p key={m.id}>{m.phone}{m.email ? ` · ${m.email}` : ' · no email'}</p>
                      ))}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[#F5D061]">{formatLKR(r.total_due)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={pending || !hasEmail}
                        onClick={() => send([r.membership_id])}
                        aria-label={`Email reminder for ${r.invoice_number}`}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#27272A] text-[#D4D4D8] hover:border-[#E5B842]/50 hover:text-[#F5D061] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Mail className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
