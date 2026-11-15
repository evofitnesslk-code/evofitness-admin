import Link from 'next/link';

export function PaymentsTabs({ active }: { active: 'log' | 'pending' }) {
  const tab = (isActive: boolean) =>
    `px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
      isActive
        ? 'bg-[#E5B842] text-[#09090B] border-[#E5B842]'
        : 'bg-[#121214] text-[#A1A1AA] border-[#27272A] hover:text-[#F4F4F5]'
    }`;
  return (
    <div className="flex gap-2">
      <Link href="/payments" className={tab(active === 'log')}>
        Payments log
      </Link>
      <Link href="/payments/pending" className={tab(active === 'pending')}>
        Pending balances
      </Link>
    </div>
  );
}
