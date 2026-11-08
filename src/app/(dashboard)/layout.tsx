import { getCurrentUserProfile } from '@/app/actions/auth';
import { getPendingRegistrationCount } from '@/app/actions/registrations';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getCurrentUserProfile();

  if (!user) {
    redirect('/login');
  }

  const pendingRegistrations = await getPendingRegistrationCount();

  return (
    <div className="min-h-screen bg-[#09090B] text-[#F4F4F5] flex flex-col md:flex-row print:bg-white print:text-black print:min-h-0">
      <Sidebar profile={profile} pendingRegistrations={pendingRegistrations} />
      <div className="flex-1 flex flex-col min-w-0 md:pl-72 pb-20 md:pb-8 print:pl-0 print:pb-0 print:bg-white">
        <Header profile={profile} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto print:p-0 print:m-0 print:max-w-none print:bg-white">
          {children}
        </main>
      </div>
      <MobileNav profile={profile} />
    </div>
  );
}

