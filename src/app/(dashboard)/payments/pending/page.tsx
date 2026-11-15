import { getPendingPayments } from '@/app/actions/payments';
import { PaymentsTabs } from '@/components/payments/payments-tabs';
import { PendingPaymentsClient } from '@/components/payments/pending-payments-client';

export default async function PendingPaymentsPage() {
  const rows = await getPendingPayments();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#F4F4F5]">
          Pending Balances
        </h1>
        <p className="text-xs text-[#A1A1AA] mt-0.5">
          Memberships with an unpaid or partially paid balance, and promised-by dates
        </p>
      </div>

      <PaymentsTabs active="pending" />

      <PendingPaymentsClient rows={rows} />
    </div>
  );
}
