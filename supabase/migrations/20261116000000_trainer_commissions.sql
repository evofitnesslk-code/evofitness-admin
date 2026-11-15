-- Trainer commissions: configurable rate, per-membership rate snapshot,
-- commission reporting (admin-only) and a payout ledger.
--
-- Commission rules
--   net PT fee   = trainer_fee * total_due / subtotal      (trainer's share of any discount is removed)
--   collected    = clamp(sum(payments) - refund_amount, 0, total_due)
--   earned       = net PT fee * (collected / total_due) * rate / 100
-- i.e. commission accrues as cash is collected and is reversed in proportion to refunds.
-- The plan price never earns commission. The rate is snapshotted on each membership, so
-- changing a trainer's rate only affects memberships created afterwards.

-- 1. Rate configuration + snapshot -------------------------------------------
alter table public.trainers
  add column if not exists commission_rate numeric(5,2) not null default 0
  check (commission_rate >= 0 and commission_rate <= 100);

alter table public.memberships
  add column if not exists trainer_commission_rate numeric(5,2)
  check (trainer_commission_rate is null or (trainer_commission_rate >= 0 and trainer_commission_rate <= 100));

update public.memberships m
   set trainer_commission_rate = t.commission_rate
  from public.trainers t
 where t.id = m.trainer_id and m.trainer_commission_rate is null;

-- The rate is always taken from the trainer row, never from the client.
create or replace function public.set_membership_trainer_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.trainer_id is null then
    new.trainer_commission_rate := null;
  elsif tg_op = 'INSERT' or new.trainer_id is distinct from old.trainer_id then
    select commission_rate into new.trainer_commission_rate
      from public.trainers where id = new.trainer_id;
  else
    new.trainer_commission_rate := old.trainer_commission_rate;
  end if;
  return new;
end;
$$;

revoke all on function public.set_membership_trainer_rate() from public, anon, authenticated;

drop trigger if exists trg_membership_trainer_rate on public.memberships;
create trigger trg_membership_trainer_rate
  before insert or update on public.memberships
  for each row execute function public.set_membership_trainer_rate();

-- 2. Payout ledger (append-only; mistakes are voided, never deleted) ----------
create table if not exists public.trainer_payouts (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  payment_method text not null check (payment_method in ('cash', 'bank')),
  paid_at date not null default current_date,
  notes text,
  request_key text unique,
  recorded_by uuid references auth.users(id),
  voided_at timestamptz,
  voided_by uuid references auth.users(id),
  void_reason text,
  created_at timestamptz not null default now(),
  constraint trainer_payouts_void_consistent
    check ((voided_at is null) = (void_reason is null))
);

create index if not exists trainer_payouts_trainer_idx
  on public.trainer_payouts (trainer_id, paid_at desc);
create index if not exists trainer_payouts_recorded_by_idx
  on public.trainer_payouts (recorded_by);
create index if not exists trainer_payouts_voided_by_idx
  on public.trainer_payouts (voided_by);

alter table public.trainer_payouts enable row level security;

-- Admin read only. All writes go through the SECURITY DEFINER functions below.
create policy "Allow admin read trainer_payouts" on public.trainer_payouts
  for select to authenticated using (public.is_admin());

-- 3. Commission lines (internal; not exposed to the API) ----------------------
create or replace view public.v_trainer_commission_lines
with (security_invoker = on) as
select
  m.id as membership_id,
  m.invoice_number,
  m.trainer_id,
  m.member_id,
  m.plan_id,
  m.start_date,
  m.status,
  m.trainer_fee,
  m.subtotal,
  m.discount_amount,
  m.total_due,
  coalesce(m.refund_amount, 0) as refund_amount,
  coalesce(m.trainer_commission_rate, 0) as rate,
  c.paid_gross,
  c.net_pt_fee,
  c.collected_net,
  round(c.net_pt_fee * c.ratio, 2) as pt_collected,
  round(c.net_pt_fee * c.ratio * coalesce(m.trainer_commission_rate, 0) / 100, 2) as commission_earned,
  round(c.net_pt_fee * coalesce(m.trainer_commission_rate, 0) / 100, 2) as commission_potential
from public.memberships m
left join (
  select membership_id, sum(amount) as paid from public.payments group by membership_id
) pay on pay.membership_id = m.id
cross join lateral (
  select
    coalesce(pay.paid, 0) as paid_gross,
    case when m.subtotal > 0
         then round(coalesce(m.trainer_fee, 0) * m.total_due / m.subtotal, 2)
         else 0 end as net_pt_fee,
    least(greatest(coalesce(pay.paid, 0) - coalesce(m.refund_amount, 0), 0), m.total_due) as collected_net,
    case when m.total_due > 0
         then least(greatest(coalesce(pay.paid, 0) - coalesce(m.refund_amount, 0), 0), m.total_due) / m.total_due
         else 0 end as ratio
) c
where m.trainer_id is not null;

revoke all on public.v_trainer_commission_lines from public, anon, authenticated;

-- 4. Reporting functions (admin only) -----------------------------------------
create or replace function public.trainer_commission_lines(
  p_trainer_id uuid default null,
  p_from date default null,
  p_to date default null
)
returns table (
  membership_id uuid, invoice_number text, trainer_id uuid, trainer_name text,
  member_name text, plan_name text, start_date date, status text,
  trainer_fee numeric, discount_share numeric, net_pt_fee numeric,
  total_due numeric, paid_gross numeric, refund_amount numeric, collected_net numeric,
  rate numeric, commission_earned numeric, commission_potential numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
  select l.membership_id, l.invoice_number::text, l.trainer_id, t.name,
         mem.full_name, p.name, l.start_date, l.status,
         l.trainer_fee, l.trainer_fee - l.net_pt_fee, l.net_pt_fee,
         l.total_due, l.paid_gross, l.refund_amount, l.collected_net,
         l.rate, l.commission_earned, l.commission_potential
    from public.v_trainer_commission_lines l
    join public.trainers t on t.id = l.trainer_id
    join public.members mem on mem.id = l.member_id
    join public.membership_plans p on p.id = l.plan_id
   where (p_trainer_id is null or l.trainer_id = p_trainer_id)
     and (p_from is null or l.start_date >= p_from)
     and (p_to is null or l.start_date <= p_to)
   order by l.start_date desc, l.invoice_number desc;
end;
$$;

create or replace function public.trainer_commission_summary(
  p_from date default null,
  p_to date default null
)
returns table (
  trainer_id uuid, name text, is_active boolean, commission_rate numeric,
  memberships integer, active_memberships integer, cancelled_memberships integer,
  members integer,
  pt_gross numeric, pt_net numeric, pt_collected numeric,
  commission_earned numeric, commission_pending numeric,
  period_paid numeric, alltime_earned numeric, alltime_paid numeric, balance numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
  with period as (
    select l.* from public.v_trainer_commission_lines l
     where (p_from is null or l.start_date >= p_from)
       and (p_to is null or l.start_date <= p_to)
  ), agg as (
    select pl.trainer_id,
           count(*)::int as memberships,
           count(*) filter (where pl.status = 'active')::int as active_memberships,
           count(*) filter (where pl.status = 'cancelled')::int as cancelled_memberships,
           coalesce(sum(pl.trainer_fee), 0) as pt_gross,
           coalesce(sum(pl.net_pt_fee), 0) as pt_net,
           coalesce(sum(pl.pt_collected), 0) as pt_collected,
           coalesce(sum(pl.commission_earned), 0) as commission_earned,
           coalesce(sum(pl.commission_potential), 0) as commission_potential
      from period pl group by pl.trainer_id
  ), mem as (
    -- distinct people trained (cancelled memberships excluded)
    select pl.trainer_id, count(distinct x.member_id)::int as members
      from period pl
      join lateral (
        select pl.member_id as member_id
        union
        select mm.member_id from public.membership_members mm where mm.membership_id = pl.membership_id
      ) x on true
     where pl.status <> 'cancelled'
     group by pl.trainer_id
  ), earned_all as (
    select l.trainer_id, sum(l.commission_earned) as earned from public.v_trainer_commission_lines l group by l.trainer_id
  ), paid_all as (
    select po.trainer_id, sum(po.amount) as paid,
           sum(po.amount) filter (
             where (p_from is null or po.paid_at >= p_from) and (p_to is null or po.paid_at <= p_to)
           ) as paid_in_period
      from public.trainer_payouts po where po.voided_at is null group by po.trainer_id
  )
  select t.id, t.name, coalesce(t.is_active, true), t.commission_rate,
         coalesce(a.memberships, 0), coalesce(a.active_memberships, 0), coalesce(a.cancelled_memberships, 0),
         coalesce(m.members, 0),
         coalesce(a.pt_gross, 0), coalesce(a.pt_net, 0), coalesce(a.pt_collected, 0),
         coalesce(a.commission_earned, 0),
         coalesce(a.commission_potential, 0) - coalesce(a.commission_earned, 0),
         coalesce(pa.paid_in_period, 0),
         coalesce(ea.earned, 0), coalesce(pa.paid, 0),
         coalesce(ea.earned, 0) - coalesce(pa.paid, 0)
    from public.trainers t
    left join agg a on a.trainer_id = t.id
    left join mem m on m.trainer_id = t.id
    left join earned_all ea on ea.trainer_id = t.id
    left join paid_all pa on pa.trainer_id = t.id
   order by t.name;
end;
$$;

-- 5. Payout writes (atomic, idempotent, audited) ------------------------------
create or replace function public.record_trainer_payout(
  p_trainer_id uuid,
  p_amount numeric,
  p_method text,
  p_paid_at date default current_date,
  p_notes text default null,
  p_request_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric;
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception 'Payout amount must be positive with at most 2 decimals.';
  end if;
  if p_method not in ('cash', 'bank') then
    raise exception 'Payout method must be cash or bank.';
  end if;
  if p_paid_at is null or p_paid_at > current_date then
    raise exception 'Payout date cannot be in the future.';
  end if;
  if not exists (select 1 from public.trainers where id = p_trainer_id) then
    raise exception 'Trainer not found.';
  end if;

  perform pg_advisory_xact_lock(hashtext('trainer_payout:' || p_trainer_id::text));

  -- Retry / double-click with the same key returns the original payout.
  if p_request_key is not null then
    select id into v_id from public.trainer_payouts where request_key = p_request_key;
    if v_id is not null then return v_id; end if;
  end if;

  select coalesce((select sum(commission_earned) from public.v_trainer_commission_lines where trainer_id = p_trainer_id), 0)
       - coalesce((select sum(amount) from public.trainer_payouts where trainer_id = p_trainer_id and voided_at is null), 0)
    into v_balance;

  if p_amount > v_balance then
    raise exception 'Payout of % exceeds the outstanding balance of %.', p_amount, greatest(v_balance, 0);
  end if;

  insert into public.trainer_payouts (trainer_id, amount, payment_method, paid_at, notes, request_key, recorded_by)
  values (p_trainer_id, p_amount, p_method, p_paid_at, nullif(btrim(p_notes), ''), p_request_key, auth.uid())
  returning id into v_id;

  insert into public.audit_log (action, entity_type, entity_id, user_id, user_role, details)
  values ('record_trainer_payout', 'trainer', p_trainer_id::text, auth.uid(), 'admin',
          jsonb_build_object('payout_id', v_id, 'amount', p_amount, 'method', p_method,
                             'paid_at', p_paid_at, 'balance_before', v_balance));
  return v_id;
end;
$$;

create or replace function public.void_trainer_payout(p_payout_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trainer uuid;
  v_amount numeric;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'A reason is required to void a payout.';
  end if;

  select trainer_id, amount into v_trainer, v_amount
    from public.trainer_payouts where id = p_payout_id for update;
  if v_trainer is null then
    raise exception 'Payout not found.';
  end if;

  update public.trainer_payouts
     set voided_at = now(), voided_by = auth.uid(), void_reason = btrim(p_reason)
   where id = p_payout_id and voided_at is null;
  if not found then
    raise exception 'Payout is already voided.';
  end if;

  insert into public.audit_log (action, entity_type, entity_id, user_id, user_role, details)
  values ('void_trainer_payout', 'trainer', v_trainer::text, auth.uid(), 'admin',
          jsonb_build_object('payout_id', p_payout_id, 'amount', v_amount, 'reason', btrim(p_reason)));
end;
$$;

revoke all on function public.trainer_commission_lines(uuid, date, date) from public, anon;
revoke all on function public.trainer_commission_summary(date, date) from public, anon;
revoke all on function public.record_trainer_payout(uuid, numeric, text, date, text, text) from public, anon;
revoke all on function public.void_trainer_payout(uuid, text) from public, anon;
grant execute on function public.trainer_commission_lines(uuid, date, date) to authenticated;
grant execute on function public.trainer_commission_summary(date, date) to authenticated;
grant execute on function public.record_trainer_payout(uuid, numeric, text, date, text, text) to authenticated;
grant execute on function public.void_trainer_payout(uuid, text) to authenticated;
