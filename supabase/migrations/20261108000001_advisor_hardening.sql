-- Supabase advisor hardening (security + performance lints).
--
-- 1. Views: pin security_invoker so reporting views always evaluate the
--    caller's RLS instead of the view owner's.
-- 2. Helpers: fixed search_path on the remaining functions.
-- 3. Execute: SECURITY DEFINER functions stay definer (RLS helpers and the
--    atomic purchase/sale writers need it) but only authenticated may call
--    them; anon/public revoked. rls_auto_enable is an event trigger and is
--    not callable via RPC at all.
-- 4. profiles UPDATE policy: initplan-safe auth.uid().
-- 5. One SELECT policy per table: manager policies narrowed from ALL to
--    INSERT/UPDATE/DELETE (effective permissions unchanged).
-- 6. Covering indexes for the 14 unindexed foreign keys.

-- 1. Invoker semantics on reporting views.
alter view public.v_daily_revenue set (security_invoker = true);
alter view public.v_weekly_revenue set (security_invoker = true);
alter view public.v_monthly_revenue set (security_invoker = true);
alter view public.v_membership_status_summary set (security_invoker = true);
alter view public.v_upcoming_expiries set (security_invoker = true);
alter view public.v_product_stock set (security_invoker = true);
alter view public.v_shop_daily_revenue set (security_invoker = true);

-- 2. Fixed search_path (all bodies are schema-qualified).
alter function public.is_admin() set search_path = public;
alter function public.get_next_invoice_number() set search_path = public;
alter function public.get_next_inventory_code() set search_path = public;
alter function public.get_next_sale_number() set search_path = public;

-- 3. Least-privilege execute.
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
revoke all on function public.is_shop_manager() from public, anon;
grant execute on function public.is_shop_manager() to authenticated;
revoke all on function public.get_next_invoice_number() from public, anon;
grant execute on function public.get_next_invoice_number() to authenticated;
revoke all on function public.get_next_inventory_code() from public, anon;
grant execute on function public.get_next_inventory_code() to authenticated;
revoke all on function public.get_next_sale_number() from public, anon;
grant execute on function public.get_next_sale_number() to authenticated;
revoke all on function public.create_stock_purchase(uuid, text, date, text, jsonb) from public, anon;
grant execute on function public.create_stock_purchase(uuid, text, date, text, jsonb) to authenticated;
revoke all on function public.create_product_sale(uuid, text, text, text, text, jsonb) from public, anon;
grant execute on function public.create_product_sale(uuid, text, text, text, text, jsonb) to authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

-- 4. Initplan-safe profiles UPDATE policy.
drop policy if exists "Allow users update own profile or admin update all" on public.profiles;
create policy "Allow users update own profile or admin update all"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id or is_admin());

-- 5. Narrow manager ALL policies to writes (drops the duplicate SELECT path).
drop policy if exists "Allow shop managers manage products" on public.products;
create policy "Allow shop managers insert products"
  on public.products for insert to authenticated with check (public.is_shop_manager());
create policy "Allow shop managers update products"
  on public.products for update to authenticated
  using (public.is_shop_manager()) with check (public.is_shop_manager());
create policy "Allow shop managers delete products"
  on public.products for delete to authenticated using (public.is_shop_manager());

drop policy if exists "Allow shop managers manage suppliers" on public.suppliers;
create policy "Allow shop managers insert suppliers"
  on public.suppliers for insert to authenticated with check (public.is_shop_manager());
create policy "Allow shop managers update suppliers"
  on public.suppliers for update to authenticated
  using (public.is_shop_manager()) with check (public.is_shop_manager());
create policy "Allow shop managers delete suppliers"
  on public.suppliers for delete to authenticated using (public.is_shop_manager());

drop policy if exists "Allow admin manage trainers" on public.trainers;
create policy "Allow admin insert trainers"
  on public.trainers for insert to authenticated with check (public.is_admin());
create policy "Allow admin update trainers"
  on public.trainers for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "Allow admin delete trainers"
  on public.trainers for delete to authenticated using (public.is_admin());

drop policy if exists "Allow admin manage plans" on public.membership_plans;
create policy "Allow admin insert plans"
  on public.membership_plans for insert to authenticated with check (public.is_admin());
create policy "Allow admin update plans"
  on public.membership_plans for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "Allow admin delete plans"
  on public.membership_plans for delete to authenticated using (public.is_admin());

-- 6. Covering indexes for unindexed foreign keys.
create index if not exists audit_log_user_id_idx on public.audit_log (user_id);
create index if not exists member_registration_applicants_member_id_idx
  on public.member_registration_applicants (member_id);
create index if not exists member_registrations_member_id_idx
  on public.member_registrations (member_id);
create index if not exists member_registrations_preferred_plan_id_idx
  on public.member_registrations (preferred_plan_id);
create index if not exists member_registrations_reviewed_by_idx
  on public.member_registrations (reviewed_by);
create index if not exists memberships_created_by_idx on public.memberships (created_by);
create index if not exists memberships_member_id_idx on public.memberships (member_id);
create index if not exists memberships_plan_id_idx on public.memberships (plan_id);
create index if not exists memberships_trainer_id_idx on public.memberships (trainer_id);
create index if not exists notifications_member_id_idx on public.notifications (member_id);
create index if not exists payments_membership_id_idx on public.payments (membership_id);
create index if not exists payments_recorded_by_idx on public.payments (recorded_by);
create index if not exists product_sales_sold_by_idx on public.product_sales (sold_by);
create index if not exists stock_purchases_created_by_idx on public.stock_purchases (created_by);
