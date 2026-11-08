-- Multi-applicant member registrations (Individual / Buddy / Family) plus the
-- membership <-> member link table used by group memberships.
--
-- The public application form replaces the Google Form intake. One physical
-- application can cover one person (Individual), two people (Buddy - sold
-- either as the Couple package or as one of the "buddy package" two-person
-- packages) or three to six people (Family).
--
-- The primary applicant stays on `member_registrations` itself (that row is the
-- application record: shared residence, emergency contact, consent, preferred
-- plan and review workflow). Every additional person is one row in
-- `member_registration_applicants`, which carries its own identity, contact and
-- PAR-Q health screening so each person answers the screening independently.
--
-- Written only by the privileged server action using the service-role client;
-- authenticated staff can read, admins can review/update.

-- ---------------------------------------------------------------------------
-- 1. Application kind
-- ---------------------------------------------------------------------------
alter table public.member_registrations
  add column if not exists application_kind text not null default 'individual';

alter table public.member_registrations
  drop constraint if exists member_registrations_application_kind_check;
alter table public.member_registrations
  add constraint member_registrations_application_kind_check
  check (application_kind in ('individual', 'buddy', 'family'));

comment on column public.member_registrations.application_kind is
  'individual (1 person) | buddy (2 people, couple or two-person package) | family (3+ people).';
comment on column public.member_registrations.member_id is
  'Member created for - or matched to - the primary applicant during review.';

-- ---------------------------------------------------------------------------
-- 2. Additional applicants (2..6) belonging to one application
-- ---------------------------------------------------------------------------
create table if not exists public.member_registration_applicants (
  id uuid primary key default gen_random_uuid(),

  registration_id uuid not null
    references public.member_registrations(id) on delete cascade,

  -- Household position for stable ordering: 2 is the second applicant, and so
  -- on. Position 1 is implicit - it is the primary applicant on the parent row.
  position integer not null,

  -- Identity
  first_name text not null,
  last_name text not null,
  full_name text not null,
  gender text not null
    constraint member_registration_applicants_gender_check
    check (gender in ('male', 'female', 'other')),
  date_of_birth date,
  nic_passport text,
  civil_status text,
  profession text,

  -- Contact (per person, optional - the primary contact number is on the
  -- application itself)
  mobile text,
  email text,

  -- Health screening (PAR-Q) answered by this person
  parq_answers jsonb not null default '{}'::jsonb,
  parq_has_condition boolean not null default false,
  parq_details text,
  weight_kg numeric,
  height_cm numeric,
  fat_percentage numeric,

  -- Member created for - or matched to - this applicant during review
  member_id uuid references public.members(id) on delete set null,

  created_at timestamptz not null default now(),

  constraint member_registration_applicants_position_check
    check (position between 2 and 8),
  constraint member_registration_applicants_measurements_check check (
    (weight_kg is null or weight_kg > 0)
    and (height_cm is null or height_cm > 0)
    and (fat_percentage is null or fat_percentage >= 0)
  )
);

create unique index if not exists idx_member_registration_applicants_position
  on public.member_registration_applicants (registration_id, position);

create index if not exists idx_member_registration_applicants_registration
  on public.member_registration_applicants (registration_id);

alter table public.member_registration_applicants enable row level security;

drop policy if exists "Allow authenticated read member_registration_applicants"
  on public.member_registration_applicants;
create policy "Allow authenticated read member_registration_applicants"
  on public.member_registration_applicants for select to authenticated using (true);

drop policy if exists "Allow admin update member_registration_applicants"
  on public.member_registration_applicants;
create policy "Allow admin update member_registration_applicants"
  on public.member_registration_applicants for update to authenticated
  using (is_admin()) with check (is_admin());

drop policy if exists "Allow admin delete member_registration_applicants"
  on public.member_registration_applicants;
create policy "Allow admin delete member_registration_applicants"
  on public.member_registration_applicants for delete to authenticated
  using (is_admin());

-- ---------------------------------------------------------------------------
-- 3. Membership <-> member link table
--
-- A membership keeps its primary member in `memberships.member_id` (unchanged,
-- so existing queries, views and payment logic keep working); the people the
-- membership also covers - a couple, a family, a buddy pair - are rows here.
-- ---------------------------------------------------------------------------
create table if not exists public.membership_members (
  id uuid primary key default gen_random_uuid(),

  membership_id uuid not null
    references public.memberships(id) on delete cascade,
  member_id uuid not null
    references public.members(id) on delete restrict,

  is_primary boolean not null default false,
  created_at timestamptz not null default now(),

  unique (membership_id, member_id)
);

-- Exactly one primary member per membership.
create unique index if not exists idx_membership_members_primary
  on public.membership_members (membership_id) where is_primary;

create index if not exists idx_membership_members_member
  on public.membership_members (member_id);

-- Backfill the link row for every membership that already exists.
insert into public.membership_members (membership_id, member_id, is_primary)
select membership.id, membership.member_id, true
from public.memberships as membership
where membership.member_id is not null
on conflict (membership_id, member_id) do nothing;

-- The application an order was created from, so a group order stays traceable
-- back to the reviewed applicants.
alter table public.memberships
  add column if not exists registration_id uuid
  references public.member_registrations(id) on delete set null;

create index if not exists idx_memberships_registration
  on public.memberships (registration_id) where registration_id is not null;

alter table public.membership_members enable row level security;

drop policy if exists "Allow authenticated read membership_members"
  on public.membership_members;
create policy "Allow authenticated read membership_members"
  on public.membership_members for select to authenticated using (true);

-- Both roles sell memberships, so both may create the link rows for an order
-- they are recording.
drop policy if exists "Allow authenticated insert membership_members"
  on public.membership_members;
create policy "Allow authenticated insert membership_members"
  on public.membership_members for insert to authenticated with check (true);

drop policy if exists "Allow admin delete membership_members"
  on public.membership_members;
create policy "Allow admin delete membership_members"
  on public.membership_members for delete to authenticated using (is_admin());
