import { getShopStats, getProducts } from '@/app/actions/shop';
import { getCurrentUserProfile } from '@/app/actions/auth';
import { StockListClient } from '@/components/shop/stock-list-client';
import { Package, Boxes, Banknote, AlertTriangle } from 'lucide-react';

function formatLKR(n: number): string {
  return `LKR ${Number(n).toLocaleString('en-LK')}`;
}

export default async function ShopPage() {
  const [stats, products, { profile }] = await Promise.all([
    getShopStats(),
    getProducts(),
    getCurrentUserProfile(),
  ]);

  const cards = [
    {
      label: 'Units on hand',
      value: stats.unitsOnHand.toLocaleString('en-LK'),
      icon: Boxes,
    },
    {
      label: 'Stock sale value',
      value: formatLKR(stats.stockSaleValue),
      icon: Banknote,
    },
    {
      label: 'Out of stock',
      value: stats.outOfStock.toLocaleString('en-LK'),
      icon: AlertTriangle,
    },
    {
      label: 'Last-30-day shop revenue',
      value: formatLKR(stats.last30DaysRevenue),
      icon: Package,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="card-luxury rounded-2xl p-5 bg-[#121214]"
            >
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-[#E5B842]" />
                <span className="text-[11px] font-medium text-[#A1A1AA]">
                  {c.label}
                </span>
              </div>
              <p className="mt-2 text-lg font-bold text-[#F4F4F5]">{c.value}</p>
            </div>
          );
        })}
      </div>

      <StockListClient
        initialProducts={products}
        currentUserProfile={profile}
      />
    </div>
  );
}
