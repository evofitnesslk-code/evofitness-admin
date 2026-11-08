import { ShopTabs } from '@/components/shop/shop-tabs';

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#F4F4F5]">
          Shop
        </h1>
        <p className="text-xs text-[#A1A1AA] mt-0.5">
          Supplements & product sales — multi-supplier inventory, purchases and
          counter sales
        </p>
      </div>
      <ShopTabs />
      {children}
    </div>
  );
}
