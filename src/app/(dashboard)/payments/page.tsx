import { getPayments } from '@/app/actions/payments';
import { PaymentsListClient } from '@/components/payments/payments-list-client';

export default async function PaymentsPage() {
  const payments = await getPayments();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#F4F4F5]">
          Payments Log
        </h1>
        <p className="text-xs text-[#A1A1AA] mt-0.5">
          Audit trail of all recorded membership installments, down payments, and receipts
        </p>
      </div>

      <PaymentsListClient initialPayments={payments} />
    </div>
  );
}
