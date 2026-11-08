-- Public member registration intake (replaces the Google Form workflow).
--
-- Applied to the EVO Fitness project via the Supabase MCP (migration
-- `member_registrations`). Submissions are written only by the privileged
-- server action using the service-role client; authenticated staff can read
-- registrations, admins can review, update and delete them.

create table if not exists public.member_registrations (
  id uuid primary key default gen_random_uuid(),

  status text not null default 'pending'
    constraint member_registrations_status_check
    check (status in ('pending', 'approved', 'rejected')),

  -- Applicant details
  first_name text not null,
  last_name text not null,
  full_name text not null,
  gender text not null
    constraint member_registrations_gender_check
    check (gender in ('male', 'female', 'other')),
  date_of_birth date,
  nic_passport text,
  civil_status text,
  profession text,

  -- Contact
  phone text not null,
  land_phone text,
  email text,

  -- Residence
  residence text,
  city text,
  post_code text,

  -- Office / employment (optional)
  office_address text,
  office_city text,
  office_post_code text,
  office_land_phone text,
  office_mobile text,

  -- Interests and attribution
  reasons_for_joining text[] not null default '{}',
  how_did_you_hear text[] not null default '{}',

  -- Emergency contact
  emergency_contact_name text not null,
  emergency_contact_relationship text not null,
  emergency_contact_phone text not null,
  emergency_contact_land_phone text,

  -- Health screening (PAR-Q)
  parq_answers jsonb not null default '{}'::jsonb,
  parq_has_condition boolean not null default false,
  parq_details text,
  weight_kg numeric,
  height_cm numeric,
  fat_percentage numeric,

  -- Consent
  agreements jsonb not null default '{}'::jsonb,
  member_declaration boolean not null default false,

  -- Preferred plan captured from the public form
  preferred_plan_id uuid references public.membership_plans(id) on delete set null,
  preferred_plan text,

  -- Admin review workflow
  admin_notes text,
  rejection_reason text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  member_id uuid references public.members(id) on delete set null,

  -- Meta
  source text not null default 'qr_form',
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint member_registrations_declaration_check check (member_declaration),
  constraint member_registrations_measurements_check check (
    (weight_kg is null or weight_kg > 0)
    and (height_cm is null or height_cm > 0)
    and (fat_percentage is null or fat_percentage >= 0)
  )
);

create index if not exists idx_member_registrations_status_submitted
  on public.member_registrations (status, submitted_at desc);

create index if not exists idx_member_registrations_phone
  on public.member_registrations (phone);

create index if not exists idx_member_registrations_email
  on public.member_registrations (email) where email is not null;

alter table public.member_registrations enable row level security;

drop policy if exists "Allow authenticated read member_registrations" on public.member_registrations;
create policy "Allow authenticated read member_registrations"
  on public.member_registrations for select to authenticated using (true);

drop policy if exists "Allow admin update member_registrations" on public.member_registrations;
create policy "Allow admin update member_registrations"
  on public.member_registrations for update to authenticated
  using (is_admin()) with check (is_admin());

drop policy if exists "Allow admin delete member_registrations" on public.member_registrations;
create policy "Allow admin delete member_registrations"
  on public.member_registrations for delete to authenticated using (is_admin());

-- Internal notification types used by the registration workflow.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'welcome', 'invoice_receipt', 'renewal_reminder', 'expiry_warning',
    'registration_alert', 'registration_received'
  ));
