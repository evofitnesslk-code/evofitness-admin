import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/app/actions/auth';

export default async function RootPage() {
  const { user } = await getCurrentUserProfile();
  if (user) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
