'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Phone } from 'lucide-react';
import type { Trainer } from '@/types/database';
import {
  recordTrainerPayout,
  voidTrainerPayout,
  type TrainerCommissionLine,
  type TrainerCommissionSummary,
  type TrainerPayout,
} from '@/app/actions/trainer-commissions';
import { formatDate, formatLKR } from '@/lib/utils';
import { DateRangeFilter } from '@/components/trainers/date-range-filter';

const field =
  'min-h-11 w-full rounded-xl border border-[#27272A] bg-[#09090B] px-3 text-sm text-[#F4F4F5] [color-scheme:dark] focus:border-[#E5B842] focus:outline-none';

const stat = (label: string, value: string, tone = 'text-[#F5D061]', hint?: string) => (
  <div className="card-luxury rounded-2xl border border-[#27272A] bg-[#121214] p-4">
    <p className="text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA]">{label}</p>
    <p className={`mt-1 text-lg font-bold tabular-nums ${tone}`}>{value}</p>
    {hint && <p className="mt-0.5 text-[10px] text-[#71717A]">{hint}</p>}
  </div>
);

const statusTone: Record<string, string> = {
  active: 'border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]',
  expired: 'border-[#71717A]/30 bg-[#71717A]/10 text-[#A1A1AA]',
  cancelled: 'border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444]',
};

export function TrainerProfileClient({
  trainer,
  summary,
  lines,
  payouts,
  from,
  to,
}: {
  trainer: Trainer;
  summary: TrainerCommissionSummary | null;
  lines: TrainerCommissionLine[];
  payouts: TrainerPayout[];
  from: string;
  to: string;
}) {
  const router = useRouter();
  const balance = summary?.balance ?? 0;
  const rate = Number(trainer.commission_rate ?? 0);

  const today = new Date().toISOString().slice(0, 10);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'cash' | 'bank'>('bank');
  const [paidAt, setPaidAt] = useState(today);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  // One key per form submission attempt: retries and double-clicks collapse into one payout.
  const requestKey = useRef<string>(crypto.randomUUID());

  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('');

  async function submitPayout(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setMessage(null);
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setMessage({ kind: 'err', text: 'Enter a payout amount greater than zero.' });
      return;
    }
    if (value > Math.max(balance, 0)) {
      setMessage({ kind: 'err', text: `Amount exceeds the outstanding balance of ${formatLKR(Math.max(balance, 0))}.` });
      return;
    }
    setBusy(true);
    const res = await recordTrainerPayout({
      trainer_id: trainer.id,
      amount: value,
      payment_method: method,
      paid_at: paidAt,
      notes,
      request_key: requestKey.current,
    });
    setBusy(false);
    if (res.error) {
      setMessage({ kind: 'err', text: res.error });
      return;
    }
    requestKey.current = crypto.randomUUID();
    setAmount('');
    setNotes('');
    setMessage({ kind: 'ok', text: 'Payout recorded.' });
    router.refresh();
  }

  async function submitVoid() {
    if (!voidingId || busy) return;
    if (!voidReason.trim()) {
      setMessage({ kind: 'err', text: 'A reason is required to void a payout.' });
      return;
    }
    setBusy(true);
    const res = await voidTrainerPayout(voidingId, trainer.id, voidReason);
    setBusy(false);
    if (res.error) {
      setMessage({ kind: 'err', text: res.error });
      return;
    }
    setVoidingId(null);
    setVoidReason('');
    setMessage({ kind: 'ok', text: 'Payout voided. The balance has been restored.' });
    router.refresh();
  }

  const lineTotals = lines.reduce(
    (a, l) => ({ net: a.net + l.net_pt_fee, earned: a.earned + l.commission_earned }),
    { net: 0, earned: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <div className="card-luxury rounded-2xl border border-[#27272A] bg-[#121214] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#3F3F46] bg-[#18181B] text-lg font-bold text-[#E5B842]">
              {trainer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#F4F4F5]">{trainer.name}</h1>
              <p className="flex items-center gap-1 text-xs text-[#A1A1AA]">
                <Phone className="h-3 w-3" /> {trainer.contact}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                trainer.is_active
                  ? 'border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]'
                  : 'border-[#71717A]/30 bg-[#71717A]/10 text-[#A1A1AA]'
              }`}
            >
              {trainer.is_active ? 'Active' : 'Inactive'}
            </span>
            <Link
              href="/trainers"
              className="inline-flex min-h-11 items-center rounded-xl border border-[#27272A] px-4 text-xs text-[#D4D4D8] hover:border-[#3F3F46]"
            >
              Edit on Trainers page
            </Link>
          </div>
        </div>
        {trainer.remarks && <p className="mt-3 text-xs text-[#D4D4D8]">{trainer.remarks}</p>}
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[#27272A] pt-4 text-xs sm:grid-cols-3">
          <div>
            <dt className="text-[10px] text-[#71717A]">Default PT rate</dt>
            <dd className="font-bold text-[#E5B842]">{formatLKR(Number(trainer.default_charge))}</dd>
          </div>
          <div>
            <dt className="text-[10px] text-[#71717A]">Commission rate</dt>
            <dd className={`font-bold ${rate > 0 ? 'text-[#F5D061]' : 'text-[#F59E0B]'}`}>{rate}%</dd>
          </div>
          <div>
            <dt className="text-[10px] text-[#71717A]">Registered</dt>
            <dd className="font-bold text-[#D4D4D8]">{formatDate(trainer.created_at)}</dd>
          </div>
        </dl>
        {rate === 0 && (
          <p className="mt-3 rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 p-3 text-xs text-[#F59E0B]">
            No commission rate is configured, so new memberships earn LKR 0. Set a rate on the Trainers page; it
            applies to memberships created afterwards (existing ones keep the rate they were created with).
          </p>
        )}
      </div>

      {/* Balance + payout */}
      <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,22rem)]">
        <div className="grid grid-cols-2 gap-3 self-start">
          {stat('Balance owed', formatLKR(balance), balance < 0 ? 'text-[#EF4444]' : 'text-[#F5D061]',
            balance < 0 ? 'Overpaid; offsets future commission' : 'All time: earned − paid out')}
          {stat('Earned (all time)', formatLKR(summary?.alltime_earned ?? 0))}
          {stat('Paid out (all time)', formatLKR(summary?.alltime_paid ?? 0), 'text-[#A1A1AA]')}
          {stat('Pending collection', formatLKR(summary?.commission_pending ?? 0), 'text-[#F59E0B]', 'In selected period')}
        </div>

        <form onSubmit={submitPayout} className="card-luxury space-y-3 rounded-2xl border border-[#27272A] bg-[#121214] p-4">
          <h2 className="text-sm font-semibold text-[#F4F4F5]">Record payout</h2>
          <label className="block text-[11px] text-[#A1A1AA]">
            Amount (LKR)
            <input
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              max={Math.max(balance, 0) || undefined}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={balance > 0 ? String(balance) : '0.00'}
              className={`${field} mt-1`}
              disabled={balance <= 0}
            />
          </label>
          {balance > 0 && (
            <button
              type="button"
              onClick={() => setAmount(String(balance))}
              className="text-[11px] text-[#F5D061] hover:underline"
            >
              Pay full balance ({formatLKR(balance)})
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-[11px] text-[#A1A1AA]">
              Method
              <select value={method} onChange={(e) => setMethod(e.target.value as 'cash' | 'bank')} className={`${field} mt-1`}>
                <option value="bank">Bank</option>
                <option value="cash">Cash</option>
              </select>
            </label>
            <label className="block text-[11px] text-[#A1A1AA]">
              Date
              <input type="date" max={today} required value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className={`${field} mt-1`} />
            </label>
          </div>
          <label className="block text-[11px] text-[#A1A1AA]">
            Note (optional)
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. October commission" className={`${field} mt-1`} />
          </label>
          {message && (
            <p
              role="status"
              className={`rounded-xl border p-2.5 text-xs ${
                message.kind === 'ok'
                  ? 'border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]'
                  : 'border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444]'
              }`}
            >
              {message.text}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || balance <= 0}
            className="min-h-11 w-full rounded-xl bg-[#E5B842] text-sm font-semibold text-[#09090B] hover:bg-[#F5D061] disabled:opacity-50"
          >
            {busy ? 'Saving…' : balance <= 0 ? 'Nothing owed' : 'Record payout'}
          </button>
        </form>
      </div>

      {/* Payout history */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-[#F4F4F5]">Payout history</h2>
        <div className="card-luxury overflow-x-auto rounded-2xl border border-[#27272A] bg-[#121214]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#27272A] text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Note</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {payouts.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[#A1A1AA]">No payouts recorded yet.</td></tr>
              ) : (
                payouts.map((p) => (
                  <tr key={p.id} className={`border-b border-[#27272A]/60 ${p.voided_at ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3 text-[#D4D4D8]">{formatDate(p.paid_at)}</td>
                    <td className="px-4 py-3 capitalize text-[#A1A1AA]">{p.payment_method}</td>
                    <td className="px-4 py-3 text-xs text-[#A1A1AA]">
                      {p.notes ?? '—'}
                      {p.voided_at && <span className="block text-[#EF4444]">Voided: {p.void_reason}</span>}
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums ${p.voided_at ? 'text-[#71717A] line-through' : 'text-[#F5D061]'}`}>
                      {formatLKR(p.amount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!p.voided_at && (
                        <button
                          type="button"
                          onClick={() => { setVoidingId(p.id); setVoidReason(''); setMessage(null); }}
                          className="min-h-11 px-2 text-xs text-[#EF4444] hover:underline"
                        >
                          Void
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {voidingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Void payout">
          <div className="w-full max-w-sm space-y-3 rounded-2xl border border-[#27272A] bg-[#121214] p-5">
            <h3 className="text-sm font-bold text-[#F4F4F5]">Void this payout?</h3>
            <p className="text-xs text-[#A1A1AA]">
              The record is kept for audit, but its amount returns to the trainer’s balance. This cannot be undone.
            </p>
            <input
              autoFocus
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Reason (required)"
              className={field}
            />
            {message?.kind === 'err' && <p className="text-xs text-[#EF4444]">{message.text}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setVoidingId(null)} className="min-h-11 rounded-xl px-4 text-xs text-[#A1A1AA] hover:text-[#F4F4F5]">Cancel</button>
              <button type="button" disabled={busy} onClick={submitVoid} className="min-h-11 rounded-xl bg-[#EF4444] px-4 text-xs font-semibold text-white disabled:opacity-50">
                {busy ? 'Voiding…' : 'Void payout'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed commission report */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[#F4F4F5]">Commission detail</h2>
            <p className="text-[11px] text-[#A1A1AA]">
              {summary?.members ?? 0} members · {summary?.memberships ?? 0} memberships in range
              {summary && summary.cancelled_memberships > 0 ? ` (${summary.cancelled_memberships} cancelled)` : ''}
            </p>
          </div>
          <DateRangeFilter basePath={`/trainers/${trainer.id}`} from={from} to={to} />
        </div>

        <div className="card-luxury overflow-x-auto rounded-2xl border border-[#27272A] bg-[#121214]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#27272A] text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Member / plan</th>
                <th className="px-4 py-3 text-right">PT fee</th>
                <th className="px-4 py-3 text-right">Discount share</th>
                <th className="px-4 py-3 text-right">Net PT fee</th>
                <th className="px-4 py-3 text-right">Paid (net of refund)</th>
                <th className="px-4 py-3 text-right">Rate</th>
                <th className="px-4 py-3 text-right">Commission</th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-[#A1A1AA]">No personal-training memberships in this range.</td></tr>
              ) : (
                lines.map((l) => (
                  <tr key={l.membership_id} className="border-b border-[#27272A]/60">
                    <td className="px-4 py-3">
                      <Link href={`/memberships/${l.membership_id}`} className="font-medium text-[#F4F4F5] hover:text-[#F5D061]">
                        {l.invoice_number}
                      </Link>
                      <p className="text-[10px] text-[#71717A]">{formatDate(l.start_date)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[#D4D4D8]">{l.member_name}</p>
                      <p className="text-[11px] text-[#A1A1AA]">
                        {l.plan_name}{' '}
                        <span className={`ml-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase ${statusTone[l.status] ?? ''}`}>
                          {l.status}
                        </span>
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[#A1A1AA]">{formatLKR(l.trainer_fee)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-[#A1A1AA]">
                      {l.discount_share > 0 ? `− ${formatLKR(l.discount_share)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[#D4D4D8]">{formatLKR(l.net_pt_fee)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-[#10B981]">
                      {formatLKR(l.collected_net)}
                      <span className="block text-[10px] text-[#71717A]">of {formatLKR(l.total_due)}</span>
                      {l.refund_amount > 0 && <span className="block text-[10px] text-[#EF4444]">refund {formatLKR(l.refund_amount)}</span>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[#A1A1AA]">{l.rate}%</td>
                    <td className="px-4 py-3 text-right tabular-nums text-[#F5D061]">
                      {formatLKR(l.commission_earned)}
                      {l.commission_potential > l.commission_earned && (
                        <span className="block text-[10px] text-[#F59E0B]">
                          {formatLKR(l.commission_potential - l.commission_earned)} pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {lines.length > 0 && (
              <tfoot>
                <tr className="text-xs font-semibold">
                  <td className="px-4 py-3 text-[#A1A1AA]" colSpan={4}>Total</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#D4D4D8]">{formatLKR(lineTotals.net)}</td>
                  <td colSpan={2} />
                  <td className="px-4 py-3 text-right tabular-nums text-[#F5D061]">{formatLKR(lineTotals.earned)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <p className="text-[11px] leading-relaxed text-[#71717A]">
          Net PT fee = PT fee minus its share of any discount. Commission accrues in proportion to the amount
          collected (payments minus refunds) and uses the rate the membership was created with. The date range
          filters by membership start date; the payout balance above is always all-time.
        </p>
      </section>
    </div>
  );
}
