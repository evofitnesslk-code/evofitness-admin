import { getTrainers } from '@/app/actions/trainers';
import { getCurrentUserProfile } from '@/app/actions/auth';
import { TrainersListClient } from '@/components/trainers/trainers-list-client';

export default async function TrainersPage() {
  const [trainers, { profile }] = await Promise.all([
    getTrainers(),
    getCurrentUserProfile(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#F4F4F5]">
          Personal Trainers
        </h1>
        <p className="text-xs text-[#A1A1AA] mt-0.5">
          Manage gym personal trainers, specialization profiles, and default charges
        </p>
      </div>

      <TrainersListClient
        initialTrainers={trainers}
        currentUserProfile={profile}
      />
    </div>
  );
}
