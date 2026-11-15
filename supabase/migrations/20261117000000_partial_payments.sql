-- Partial payments / pending balances (additive).
--  * payments.request_key        - idempotency key (double-click / retry safe)
--  * memberships.balance_due_date - optional "promised by" date for the balance
--  * record_membership_payment()  - atomic, locked, validated, audited installment write
--  * set_balance_due_date()       - audited promised-by date change
--  * v_pending_payments           - per-membership paid / balance / status / overdue
-- RLS on payments/memberships is NOT changed: staff can insert, only admins can
-- update/delete payments.

-- 1. Columns ------------------------------------------------------------------
alter table public.payments
  add column if not exists request_key text;

create unique index if not exists payments_request_key_uidx
  on public.payments (request_key) where request_key is not null;

alter table public.memberships
  add column if not exists balance_due_date date;

-- 2. Record an installment ----------------------------------------------------
create or replace function public.record_membership_payment(
  p_membership_id uuid,
  p_amount numeric,
  p_method text,
  p_notes text default null,
  p_request_key text default null,
  p_balance_due_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_m public.memberships%rowtype;
  v_paid numeric;
  v_balance_before numeric;
  v_balance_after numeric;
  v_id uuid;
  v_today date := (now() at time zone 'Asia/Colombo')::date;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if auth.uid() is null or v_role is null then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception 'Payment amount must be greater than zero with at most 2 decimals.';
  end if;
  if p_method is null or p_method not in ('cash', 'card', 'bank') then
    raise exception 'Payment method must be cash, card or bank.';
  end if;
  if p_balance_due_date is not null and p_balance_due_date < v_today then
    raise exception 'Promised-by date cannot be in the past.';
  end if;

  -- Serialise concurrent payments on the same membership.
  select * into v_m from public.memberships where id = p_membership_id for update;
  if not found then
    raise exception 'Membership not found.';
  end if;

  -- Retry / double-click with the same key returns the original payment.
  if p_request_key is not null then
    select id into v_id from public.payments where request_key = p_request_key;
    if v_id is not null then
      select coalesce(sum(amount), 0) into v_paid from public.payments where membership_id = p_membership_id;
      return jsonb_build_object('payment_id', v_id, 'duplicate', true,
        'paid', v_paid, 'balance', greatest(v_m.total_due - v_paid, 0));
    end if;
  end if;

  if v_m.status = 'cancelled' then
    raise exception 'Cannot record payments against a cancelled membership.';
  end if;

  select coalesce(sum(amount), 0) into v_paid from public.payments where membership_id = p_membership_id;
  v_balance_before := v_m.total_due - v_paid;
  if v_balance_before <= 0 then
    raise exception 'This membership is already paid in full.';
  end if;
  if p_amount > v_balance_before then
    raise exception 'Payment of % exceeds the outstanding balance of %.', p_amount, v_balance_before;
  end if;

  insert into public.payments (membership_id, amount, payment_method, notes, recorded_by, request_key)
  values (p_membership_id, p_amount, p_method, nullif(btrim(p_notes), ''), auth.uid(), p_request_key)
  returning id into v_id;

  v_balance_after := v_balance_before - p_amount;

  -- Promised-by date applies only while a balance remains; clear it once settled.
  if v_balance_after <= 0 then
    update public.memberships set balance_due_date = null where id = p_membership_id and balance_due_date is not null;
  elsif p_balance_due_date is not null then
    update public.memberships set balance_due_date = p_balance_due_date where id = p_membership_id;
  end if;

  insert into public.audit_log (action, entity_type, entity_id, user_id, user_role, details)
  values ('record_payment', 'payments', v_id::text, auth.uid(), v_role,
          jsonb_build_object('membership_id', p_membership_id, 'invoice_number', v_m.invoice_number,
                             'amount', p_amount, 'payment_method', p_method,
                             'balance_before', v_balance_before, 'balance_after', v_balance_after,
                             'balance_due_date', p_balance_due_date));

  return jsonb_build_object('payment_id', v_id, 'duplicate', false,
    'paid', v_paid + p_amount, 'balance', v_balance_after);
end;
$$;

-- 3. Promised-by date ---------------------------------------------------------
create or replace function public.set_balance_due_date(
  p_membership_id uuid,
  p_due_date date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_m public.memberships%rowtype;
  v_paid numeric;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if auth.uid() is null or v_role is null then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  select * into v_m from public.memberships where id = p_membership_id for update;
  if not found then raise exception 'Membership not found.'; end if;
  if v_m.status = 'cancelled' then
    raise exception 'Cannot set a due date on a cancelled membership.';
  end if;
  select coalesce(sum(amount), 0) into v_paid from public.payments where membership_id = p_membership_id;
  if p_due_date is not null and v_m.total_due - v_paid <= 0 then
    raise exception 'This membership has no outstanding balance.';
  end if;

  update public.memberships set balance_due_date = p_due_date where id = p_membership_id;

  insert into public.audit_log (action, entity_type, entity_id, user_id, user_role, details)
  values ('set_balance_due_date', 'memberships', p_membership_id::text, auth.uid(), v_role,
          jsonb_build_object('invoice_number', v_m.invoice_number,
                             'previous', v_m.balance_due_date, 'new', p_due_date));
end;
$$;

revoke all on function public.record_membership_payment(uuid, numeric, text, text, text, date) from public, anon;
revoke all on function public.set_balance_due_date(uuid, date) from public, anon;
grant execute on function public.record_membership_payment(uuid, numeric, text, text, text, date) to authenticated;
grant execute on function public.set_balance_due_date(uuid, date) to authenticated;

-- 4. Pending payments view ----------------------------------------------------
create or replace view public.v_pending_payments
with (security_invoker = true) as
with pay as (
  select membership_id, sum(amount) as paid, max(payment_date) as last_payment_at
  from public.payments group by membership_id
)
select
  m.id as membership_id,
  m.invoice_number,
  m.member_id,
  mem.full_name as member_name,
  mem.phone as member_phone,
  mem.email as member_email,
  pl.name as plan_name,
  m.start_date,
  m.status as membership_status,
  m.total_due,
  coalesce(pay.paid, 0) as paid,
  case when m.status = 'cancelled' then 0
       else greatest(m.total_due - coalesce(pay.paid, 0), 0) end as balance,
  pay.last_payment_at,
  m.balance_due_date,
  case
    when m.status = 'cancelled' then 'cancelled'
    when m.total_due - coalesce(pay.paid, 0) <= 0 then 'paid'
    when coalesce(pay.paid, 0) = 0 then 'unpaid'
    else 'partial'
  end as payment_status,
  (m.status <> 'cancelled'
    and m.total_due - coalesce(pay.paid, 0) > 0
    and m.balance_due_date is not null
    and m.balance_due_date < (now() at time zone 'Asia/Colombo')::date) as is_overdue,
  ((now() at time zone 'Asia/Colombo')::date
     - coalesce((pay.last_payment_at at time zone 'Asia/Colombo')::date, m.start_date)) as days_since_activity,
  ((now() at time zone 'Asia/Colombo')::date - m.start_date) as days_since_start
from public.memberships m
join public.members mem on mem.id = m.member_id
join public.membership_plans pl on pl.id = m.plan_id
left join pay on pay.membership_id = m.id;

revoke all on public.v_pending_payments from public, anon;
grant select on public.v_pending_payments to authenticated;
