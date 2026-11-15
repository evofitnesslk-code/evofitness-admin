-- Expiry reminders + cached membership reporting.

-- 1. Notification idempotency ------------------------------------------------
alter table public.notifications add column if not exists dedupe_key text;

create unique index if not exists notifications_dedupe_key_uidx
  on public.notifications (dedupe_key) where dedupe_key is not null;

create index if not exists notifications_queue_idx
  on public.notifications (scheduled_at) where status = 'queued';

create index if not exists memberships_active_end_date_idx
  on public.memberships (end_date) where status = 'active';

-- 2. Queue reminders for memberships ending in exactly p_days days -----------
-- Idempotent: dedupe_key includes the end date, so re-running never duplicates
-- and a renewed/extended membership gets a fresh reminder.
create or replace function public.queue_expiry_reminders(p_days integer default 10)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with targets as (
    select m.id as membership_id, m.invoice_number, m.end_date, p.name as plan_name,
           mem.id as member_id, mem.full_name, mem.email
    from public.memberships m
    join public.membership_plans p on p.id = m.plan_id
    join lateral (
      select m.member_id as member_id
      union
      select mm.member_id from public.membership_members mm where mm.membership_id = m.id
    ) x on true
    join public.members mem on mem.id = x.member_id
    where m.status = 'active'
      and m.end_date = current_date + p_days
      and mem.email is not null and btrim(mem.email) <> ''
  ), ins as (
    insert into public.notifications
      (member_id, channel, type, status, recipient_email, subject, payload, dedupe_key)
    select member_id, 'email', 'expiry_warning', 'queued', btrim(email),
           'Your EVO Fitness membership expires on ' || to_char(end_date, 'DD Mon YYYY'),
           jsonb_build_object('member_name', full_name, 'plan_name', plan_name,
                              'end_date', end_date, 'invoice_number', invoice_number,
                              'days_remaining', p_days),
           'expiry_warning:' || membership_id || ':' || member_id || ':' || end_date
    from targets
    on conflict (dedupe_key) where dedupe_key is not null do nothing
    returning 1
  )
  select count(*) into v_count from ins;
  return v_count;
end;
$$;

revoke all on function public.queue_expiry_reminders(integer) from public, anon, authenticated;
grant execute on function public.queue_expiry_reminders(integer) to service_role;

-- 3. Cached membership report ------------------------------------------------
create materialized view if not exists public.mv_membership_report as
select
  date_trunc('month', m.start_date)::date as month_start,
  p.id as plan_id,
  p.name as plan_name,
  p.target_group,
  p.duration_value,
  p.duration_type,
  m.status,
  count(*)::int as memberships,
  coalesce(sum(m.plan_price), 0) as plan_value,
  coalesce(sum(m.trainer_fee), 0) as trainer_fees,
  count(*) filter (where m.trainer_id is not null)::int as pt_count,
  coalesce(sum(m.discount_amount), 0) as discounts,
  coalesce(sum(m.total_due), 0) as total_due,
  coalesce(sum(pay.paid), 0) as total_paid,
  coalesce(sum(m.refund_amount), 0) as refunds
from public.memberships m
join public.membership_plans p on p.id = m.plan_id
left join (
  select membership_id, sum(amount) as paid from public.payments group by membership_id
) pay on pay.membership_id = m.id
group by 1, 2, 3, 4, 5, 6, 7;

create unique index if not exists mv_membership_report_uidx
  on public.mv_membership_report (month_start, plan_id, status);

-- Materialized views bypass RLS: no direct API access, reads go via the function.
revoke all on public.mv_membership_report from public, anon, authenticated;

create table if not exists public.report_meta (
  key text primary key,
  refreshed_at timestamptz not null default now()
);
alter table public.report_meta enable row level security;
create policy "Allow authenticated read report_meta" on public.report_meta
  for select to authenticated using (true);

create or replace function public.refresh_membership_report(p_force boolean default false)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last timestamptz;
begin
  if auth.role() <> 'service_role' and not exists (
    select 1 from public.profiles where id = auth.uid()
  ) then
    raise exception 'not authorized';
  end if;

  -- Serialise concurrent refreshes; skip if refreshed within the last 10 minutes.
  perform pg_advisory_xact_lock(hashtext('refresh_membership_report'));
  select refreshed_at into v_last from public.report_meta where key = 'membership_report';
  if p_force or v_last is null or v_last < now() - interval '10 minutes' then
    refresh materialized view public.mv_membership_report;
    insert into public.report_meta (key, refreshed_at) values ('membership_report', now())
      on conflict (key) do update set refreshed_at = excluded.refreshed_at
      returning refreshed_at into v_last;
  end if;
  return v_last;
end;
$$;

create or replace function public.get_membership_report(p_from date default null, p_to date default null)
returns table (
  month_start date, plan_id uuid, plan_name text, target_group text,
  duration_value integer, duration_type text, status text, memberships integer,
  plan_value numeric, trainer_fees numeric, pt_count integer, discounts numeric,
  total_due numeric, total_paid numeric, refunds numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select r.month_start, r.plan_id, r.plan_name, r.target_group, r.duration_value,
         r.duration_type, r.status, r.memberships, r.plan_value, r.trainer_fees,
         r.pt_count, r.discounts, r.total_due, r.total_paid, r.refunds
  from public.mv_membership_report r
  where exists (select 1 from public.profiles where id = auth.uid())
    and (p_from is null or r.month_start >= date_trunc('month', p_from)::date)
    and (p_to is null or r.month_start <= p_to)
  order by r.month_start desc, r.plan_name;
$$;

revoke all on function public.refresh_membership_report(boolean) from public, anon;
grant execute on function public.refresh_membership_report(boolean) to authenticated, service_role;
revoke all on function public.get_membership_report(date, date) from public, anon;
grant execute on function public.get_membership_report(date, date) to authenticated, service_role;

refresh materialized view public.mv_membership_report;
insert into public.report_meta (key) values ('membership_report') on conflict (key) do update set refreshed_at = now();
