import type { Metadata } from 'next';
import { getMembershipById } from '@/app/actions/memberships';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PrintButton } from '@/components/invoice/print-button';
import { EmailButton } from '@/components/invoice/email-button';
import { formatLKR, formatDate } from '@/lib/utils';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const membership = await getMembershipById(id);
  const invoiceNumber = membership?.invoice_number || 'Invoice';

  return {
    title: invoiceNumber,
    description: `EVO Fitness Invoice / Receipt ${invoiceNumber}`,
  };
}

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const membership = await getMembershipById(id);

  if (!membership) {
    notFound();
  }

  const isPaidInFull = (membership.outstanding_balance ?? 0) <= 0;

  return (
    <div id="printable-invoice-wrapper" className="max-w-4xl mx-auto py-6 print:py-0 print:m-0 print:max-w-none print:w-full print:bg-white">
      {/* Top Action Bar (hidden on print) */}
      <div className="print:hidden flex items-center justify-between mb-6">
        <Link
          href={`/memberships/${id}`}
          className="inline-flex items-center gap-2 text-xs font-medium text-[#A1A1AA] hover:text-[#F4F4F5] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Order
        </Link>
        <div className="flex items-center gap-3">
          <EmailButton
            membershipId={membership.id}
            memberEmail={membership.member?.email}
          />
          <PrintButton invoiceNumber={membership.invoice_number} />
        </div>
      </div>

      {/* Formal Printable Document Card (White / Slate high contrast for printing) */}
      <div
        id="printable-invoice"
        style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
        className="bg-white text-[#09090B] rounded-2xl p-6 sm:p-10 border border-[#E5E7EB] shadow-2xl print:shadow-none print:border-none print:rounded-none print:p-8 print:m-0 print:w-full print:min-h-screen print:bg-white"
      >

        {/* Document Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-6 print:pb-3 border-b-2 border-[#09090B] gap-4 print:gap-2">
          <div>
            <div className="relative w-36 h-14 mb-2">
              <Image
                src="/evofitness-logo.webp"
                alt="EVO Fitness"
                fill
                sizes="144px"
                className="object-contain object-left"
                priority
              />
            </div>
            <p className="text-xs font-bold tracking-widest text-[#09090B] uppercase">
              EVO FITNESS PVT LTD
            </p>
            <p className="text-xs text-[#4B5563] mt-0.5">
              Balapokuna Road, Colombo 5, Sri Lanka
            </p>
            <p className="text-xs text-[#4B5563]">
              Tel: 0710509253
            </p>
          </div>

          <div className="sm:text-right">
            <span className="text-xs font-bold tracking-widest uppercase text-[#B8860B] block">
              INVOICE / RECEIPT
            </span>
            <h1 className="text-3xl font-black tracking-tight text-[#09090B] mt-1">
              {membership.invoice_number}
            </h1>
            <p className="text-xs text-[#4B5563] mt-1">
              Date: {formatDate(membership.created_at)}
            </p>
            <div className="mt-2.5">
              {isPaidInFull ? (
                <span className="inline-block px-3 py-1 rounded-md bg-[#DCFCE7] text-[#15803D] font-bold text-xs uppercase tracking-wider border border-[#86EFAC]">
                  PAID IN FULL
                </span>
              ) : (
                <span className="inline-block px-3 py-1 rounded-md bg-[#FEF3C7] text-[#B45309] font-bold text-xs uppercase tracking-wider border border-[#FCD34D]">
                  PARTIAL PAYMENT
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Member & Membership Period Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 print:gap-3 py-5 print:py-2.5 border-b border-[#E5E7EB]">
          <div>
            <span className="text-[11px] print:text-[9px] font-bold uppercase tracking-wider text-[#6B7280] block mb-0.5">
              Billed To (Member)
            </span>
            <h2 className="text-sm print:text-xs font-bold text-[#09090B]">
              {membership.member?.full_name}
            </h2>
            <p className="text-xs print:text-[10px] text-[#4B5563] mt-0.5">
              Phone: {membership.member?.phone}
            </p>
            {membership.member?.email && (
              <p className="text-xs print:text-[10px] text-[#4B5563]">
                Email: {membership.member.email}
              </p>
            )}
            {membership.member?.nic_passport && (
              <p className="text-xs print:text-[10px] text-[#4B5563]">
                NIC/Passport: {membership.member.nic_passport}
              </p>
            )}
          </div>

          <div className="sm:text-right">
            <span className="text-[11px] print:text-[9px] font-bold uppercase tracking-wider text-[#6B7280] block mb-0.5">
              Membership Term
            </span>
            <p className="text-xs font-semibold text-[#09090B]">
              {membership.plan?.name}
            </p>
            <p className="text-xs print:text-[10px] text-[#4B5563] mt-0.5">
              Start Date: <strong>{formatDate(membership.start_date)}</strong>
            </p>
            <p className="text-xs print:text-[10px] text-[#4B5563]">
              Expiry Date: <strong>{formatDate(membership.end_date)}</strong>
            </p>
            {membership.trainer && (
              <p className="text-xs print:text-[10px] text-[#B8860B] font-medium mt-0.5">
                Personal Trainer: {membership.trainer.name}
              </p>
            )}
          </div>
        </div>

        {/* Financial Line Items Table */}
        <div className="py-4 print:py-2">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-[#09090B] text-[11px] print:text-[9px] uppercase tracking-wider text-[#4B5563]">
                <th className="py-2 print:py-1">Item & Description</th>
                <th className="py-2 print:py-1 text-center">Category</th>
                <th className="py-2 print:py-1 text-right">Amount (LKR)</th>
              </tr>
            </thead>
            <tbody className="text-xs print:text-[10px] divide-y divide-[#E5E7EB]">
              <tr>
                <td className="py-2 print:py-1">
                  <span className="font-bold block text-[#09090B]">
                    {membership.plan?.name}
                  </span>
                  <span className="text-[11px] print:text-[9px] text-[#6B7280]">
                    Official rate access for {membership.plan?.target_group}
                  </span>
                </td>
                <td className="py-2 print:py-1 text-center text-[#4B5563]">
                  Membership Plan
                </td>
                <td className="py-2 print:py-1 text-right font-semibold text-[#09090B]">
                  {formatLKR(Number(membership.plan_price))}
                </td>
              </tr>

              {membership.trainer_fee > 0 && (
                <tr>
                  <td className="py-2 print:py-1">
                    <span className="font-bold block text-[#09090B]">
                      Personal Training (PT) Add-on
                    </span>
                    <span className="text-[11px] print:text-[9px] text-[#6B7280]">
                      Assigned Trainer: {membership.trainer?.name || 'Personal Trainer'}
                    </span>
                  </td>
                  <td className="py-2 print:py-1 text-center text-[#4B5563]">
                    Personal Trainer
                  </td>
                  <td className="py-2 print:py-1 text-right font-semibold text-[#09090B]">
                    {formatLKR(Number(membership.trainer_fee))}
                  </td>
                </tr>
              )}

              {/* Subtotal */}
              <tr className="bg-[#F9FAFB] font-medium">
                <td colSpan={2} className="py-1.5 text-right text-[#4B5563]">
                  Subtotal:
                </td>
                <td className="py-1.5 text-right font-bold text-[#09090B]">
                  {formatLKR(Number(membership.subtotal))}
                </td>
              </tr>

              {/* Discount if applicable */}
              {membership.discount_amount > 0 && (
                <tr className="text-[#DC2626]">
                  <td colSpan={2} className="py-1 text-right">
                    Discount ({membership.discount_type === 'percentage' ? `${membership.discount_value}%` : 'Fixed Amount'}
                    {membership.discount_reason ? ` - ${membership.discount_reason}` : ''}):
                  </td>
                  <td className="py-1 text-right font-semibold">
                    - {formatLKR(Number(membership.discount_amount))}
                  </td>
                </tr>
              )}

              {/* Total Due */}
              <tr className="border-t-2 border-[#09090B] font-bold text-xs print:text-[11px]">
                <td colSpan={2} className="py-2 print:py-1.5 text-right uppercase tracking-wider text-[#09090B]">
                  Total Amount Due:
                </td>
                <td className="py-2 print:py-1.5 text-right text-[#09090B] text-sm print:text-xs">
                  {formatLKR(Number(membership.total_due))}
                </td>
              </tr>

              {/* Amount Paid */}
              <tr className="text-[#15803D] font-semibold">
                <td colSpan={2} className="py-1.5 text-right">
                  Total Paid:
                </td>
                <td className="py-1.5 text-right">
                  {formatLKR(membership.paid_amount ?? 0)}
                </td>
              </tr>

              {/* Outstanding Balance */}
              <tr className="bg-[#FEF3C7] font-bold text-xs print:text-[10px] text-[#92400E]">
                <td colSpan={2} className="py-1.5 text-right uppercase tracking-wider">
                  Outstanding Balance:
                </td>
                <td className="py-1.5 text-right text-xs">
                  {formatLKR(membership.outstanding_balance ?? 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment History Breakdown */}
        {membership.payments && membership.payments.length > 0 && (
          <div className="py-2 border-t border-[#E5E7EB]">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563] mb-1">
              Payment Transactions
            </h3>
            <table className="w-full text-left text-[10px] border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB] text-[#6B7280]">
                  <th className="py-1">Date</th>
                  <th className="py-1">Method</th>
                  <th className="py-1">Notes</th>
                  <th className="py-1 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {membership.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-1 text-[#374151]">
                      {formatDate(p.payment_date)}
                    </td>
                    <td className="py-1 font-medium uppercase text-[#374151]">
                      {p.payment_method}
                    </td>
                    <td className="py-1 text-[#6B7280]">{p.notes || '-'}</td>
                    <td className="py-1 text-right font-semibold text-[#15803D]">
                      {formatLKR(Number(p.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Notes & Signatures */}
        <div className="mt-4 print:mt-3 pt-3 border-t border-[#E5E7EB] flex flex-row justify-between items-end gap-4 text-[10px] text-[#6B7280]">
          <div>
            <p className="font-semibold text-[#09090B]">Terms & Conditions:</p>
            <p className="text-[9px] mt-0.5">
              1. Memberships are non-transferable unless authorized.
            </p>
            <p className="text-[9px]">
              2. Gym rules and safety guidelines apply.
            </p>
          </div>
          <div className="text-right">
            <div className="w-32 border-b border-[#9CA3AF] mb-1 pb-4" />
            <p className="text-[9px] font-bold text-[#09090B]">Authorized Signatory</p>
            <p className="text-[8px] text-[#6B7280]">EVO Fitness Management</p>
          </div>
        </div>
      </div>
    </div>
  );
}
