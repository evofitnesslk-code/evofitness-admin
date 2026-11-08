-- Gym shop: multi-supplier product inventory, purchases (GRN) and counter sales.
--
-- Maps the accountant's register columns onto relational tables:
--   Inventory ID        -> products.inventory_code (unique, e.g. INV0001)
--   Inventory Description -> products.description
--   Supplier            -> suppliers (FK from stock_purchases)
--   Invoice / GRN No.   -> stock_purchases.invoice_grn_no (unique per supplier)
--   Purchase Date       -> stock_purchases.purchase_date
--   Unit Price          -> stock_purchase_items.unit_price (cost)
--   QTY                 -> stock_purchase_items.qty
--   Amount              -> stock_purchase_items.amount (= unit_price * qty)
--   Sale Price          -> products.sale_price (snapshot per purchase line)
--
-- Counter sales are recorded in product_sales / product_sale_items with the
-- sale price snapshotted per line so later price changes never rewrite history.
-- Stock on hand is derived (purchased - sold) via v_product_stock.
--
-- Roles: introduces 'accountant'. Admins and accountants manage suppliers,
-- products and purchases; all authenticated staff may record counter sales
-- (product_sales INSERT) while only admins/accountants may edit or void them.

-- 1. Widen the application role set.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'staff', 'accountant'));

-- 2. Role helpers. is_admin() already exists; shop management = admin OR accountant.
create or replace function public.is_shop_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'accountant')
  );
$$;

-- 3. Suppliers (vendors).
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text,
  email text,
  address text,
  remarks text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint suppliers_name_check check (char_length(trim(name)) > 0)
);
create index if not exists suppliers_name_idx on public.suppliers (name);
create index if not exists suppliers_active_idx on public.suppliers (is_active) where is_active;

-- 4. Products (inventory master).
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  inventory_code text not null unique,
  description text not null,
  sale_price numeric not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_code_check check (inventory_code ~ '^INV[0-9]+$'),
  constraint products_description_check check (char_length(trim(description)) > 0),
  constraint products_sale_price_check check (sale_price >= 0)
);
create index if not exists products_description_idx on public.products (description);
create index if not exists products_active_idx on public.products (is_active) where is_active;

-- 5. Purchase headers (one row per supplier invoice / GRN).
create table if not exists public.stock_purchases (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers (id) on delete restrict,
  invoice_grn_no text not null,
  purchase_date date not null,
  subtotal numeric not null default 0,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint stock_purchases_grn_check check (char_length(trim(invoice_grn_no)) > 0),
  constraint stock_purchases_subtotal_check check (subtotal >= 0),
  constraint stock_purchases_supplier_grn_unique unique (supplier_id, invoice_grn_no)
);
create index if not exists stock_purchases_supplier_idx on public.stock_purchases (supplier_id);
create index if not exists stock_purchases_date_idx on public.stock_purchases (purchase_date desc);

-- 6. Purchase lines.
create table if not exists public.stock_purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.stock_purchases (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  unit_price numeric not null,
  qty integer not null,
  amount numeric not null,
  sale_price numeric not null,
  constraint stock_purchase_items_unit_price_check check (unit_price >= 0),
  constraint stock_purchase_items_qty_check check (qty > 0),
  constraint stock_purchase_items_amount_check check (amount >= 0),
  constraint stock_purchase_items_sale_price_check check (sale_price >= 0)
);
create index if not exists stock_purchase_items_purchase_idx on public.stock_purchase_items (purchase_id);
create index if not exists stock_purchase_items_product_idx on public.stock_purchase_items (product_id);

-- 7. Counter sale headers.
create table if not exists public.product_sales (
  id uuid primary key default gen_random_uuid(),
  sale_number text not null unique,
  member_id uuid references public.members (id) on delete set null,
  customer_name text,
  subtotal numeric not null default 0,
  total_due numeric not null default 0,
  payment_method text not null,
  sold_by uuid references public.profiles (id) on delete set null,
  sold_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  constraint product_sales_number_check check (sale_number ~ '^PS[0-9]+$'),
  constraint product_sales_subtotal_check check (subtotal >= 0),
  constraint product_sales_total_check check (total_due >= 0),
  constraint product_sales_payment_check check (payment_method in ('cash', 'card', 'bank'))
);
create index if not exists product_sales_member_idx on public.product_sales (member_id);
create index if not exists product_sales_sold_at_idx on public.product_sales (sold_at desc);

-- 8. Counter sale lines.
create table if not exists public.product_sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.product_sales (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  qty integer not null,
  unit_price numeric not null,
  amount numeric not null,
  constraint product_sale_items_qty_check check (qty > 0),
  constraint product_sale_items_unit_price_check check (unit_price >= 0),
  constraint product_sale_items_amount_check check (amount >= 0)
);
create index if not exists product_sale_items_sale_idx on public.product_sale_items (sale_id);
create index if not exists product_sale_items_product_idx on public.product_sale_items (product_id);

-- 9. Next-code helpers (mirror get_next_invoice_number for EF invoices).
create or replace function public.get_next_inventory_code()
returns text
language plpgsql
as $function$
declare
  max_num int;
begin
  select coalesce(max(
    case
      when inventory_code ~ '^INV[0-9]+$' then cast(substring(inventory_code from 4) as integer)
      else 0
    end
  ), 0) into max_num from public.products;
  return 'INV' || lpad((max_num + 1)::text, 4, '0');
end;
$function$;

create or replace function public.get_next_sale_number()
returns text
language plpgsql
as $function$
declare
  max_num int;
begin
  select coalesce(max(
    case
      when sale_number ~ '^PS[0-9]+$' then cast(substring(sale_number from 3) as integer)
      else 0
    end
  ), 0) into max_num from public.product_sales;
  return 'PS' || lpad((max_num + 1)::text, 4, '0');
end;
$function$;

-- 10. Atomic purchase creation: header + lines, refresh product sale prices.
create or replace function public.create_stock_purchase(
  p_supplier_id uuid,
  p_invoice_grn_no text,
  p_purchase_date date,
  p_notes text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_purchase_id uuid;
  v_subtotal numeric := 0;
  v_item jsonb;
  v_product_id uuid;
  v_qty int;
  v_unit_price numeric;
  v_sale_price numeric;
  v_amount numeric;
  v_count int;
begin
  if not public.is_shop_manager() then
    raise exception 'Permission denied. Shop manager role required.';
  end if;

  if p_supplier_id is null then
    raise exception 'Supplier is required.';
  end if;
  if char_length(trim(coalesce(p_invoice_grn_no, ''))) = 0 then
    raise exception 'Invoice / GRN number is required.';
  end if;
  if p_purchase_date is null then
    raise exception 'Purchase date is required.';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one purchase line is required.';
  end if;

  insert into public.stock_purchases (supplier_id, invoice_grn_no, purchase_date, subtotal, notes, created_by)
  values (p_supplier_id, trim(p_invoice_grn_no), p_purchase_date, 0, nullif(trim(coalesce(p_notes, '')), ''), auth.uid())
  returning id into v_purchase_id;

  v_count := 0;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_product_id := nullif(v_item ->> 'product_id', '')::uuid;
    v_qty := (v_item ->> 'qty')::int;
    v_unit_price := (v_item ->> 'unit_price')::numeric;
    v_sale_price := (v_item ->> 'sale_price')::numeric;
    if v_product_id is null or v_qty is null or v_qty <= 0
      or v_unit_price is null or v_unit_price < 0
      or v_sale_price is null or v_sale_price < 0 then
      raise exception 'Invalid purchase line: product, positive qty, unit price and sale price are required.';
    end if;
    v_amount := v_unit_price * v_qty;
    insert into public.stock_purchase_items (purchase_id, product_id, unit_price, qty, amount, sale_price)
    values (v_purchase_id, v_product_id, v_unit_price, v_qty, v_amount, v_sale_price);
    update public.products
      set sale_price = v_sale_price, updated_at = now()
      where id = v_product_id;
    v_subtotal := v_subtotal + v_amount;
    v_count := v_count + 1;
  end loop;

  if v_count = 0 then
    raise exception 'At least one purchase line is required.';
  end if;

  update public.stock_purchases set subtotal = v_subtotal where id = v_purchase_id;

  insert into public.audit_log (action, entity_type, entity_id, user_id, details)
  values ('stock_purchase_created', 'stock_purchase', v_purchase_id::text, auth.uid(),
    jsonb_build_object('supplier_id', p_supplier_id, 'invoice_grn_no', trim(p_invoice_grn_no), 'lines', v_count, 'subtotal', v_subtotal));

  return v_purchase_id;
end;
$function$;

-- 11. Atomic counter sale: stock check with row locks, header + lines.
create or replace function public.create_product_sale(
  p_member_id uuid,
  p_customer_name text,
  p_payment_method text,
  p_notes text,
  p_sale_number text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_sale_id uuid;
  v_sale_number text;
  v_subtotal numeric := 0;
  v_item jsonb;
  v_product_id uuid;
  v_qty int;
  v_unit_price numeric;
  v_amount numeric;
  v_purchased int;
  v_sold int;
  v_count int := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated.';
  end if;
  if p_payment_method is null or p_payment_method not in ('cash', 'card', 'bank') then
    raise exception 'Valid payment method is required.';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one sale line is required.';
  end if;

  -- Sale number: staff always get the next auto number; shop managers may
  -- override the trailing sequence (gaps permitted), mirroring EF invoices.
  if p_sale_number is not null and char_length(trim(p_sale_number)) > 0 then
    if not public.is_shop_manager() then
      raise exception 'Permission denied. Only shop managers can set the sale number.';
    end if;
    v_sale_number := trim(p_sale_number);
    if v_sale_number !~ '^PS[0-9]+$' then
      raise exception 'Sale number must look like PS0001.';
    end if;
  else
    select coalesce(max(
      case
        when sale_number ~ '^PS[0-9]+$' then cast(substring(sale_number from 3) as integer)
        else 0
      end
    ), 0) + 1 into v_count from public.product_sales;
    v_sale_number := 'PS' || lpad(v_count::text, 4, '0');
    v_count := 0;
  end if;

  insert into public.product_sales (sale_number, member_id, customer_name, subtotal, total_due, payment_method, sold_by, notes)
  values (v_sale_number, p_member_id, nullif(trim(coalesce(p_customer_name, '')), ''), 0, 0, p_payment_method, auth.uid(), nullif(trim(coalesce(p_notes, '')), ''))
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_product_id := nullif(v_item ->> 'product_id', '')::uuid;
    v_qty := (v_item ->> 'qty')::int;
    if v_product_id is null or v_qty is null or v_qty <= 0 then
      raise exception 'Invalid sale line: product and positive qty are required.';
    end if;

    -- Lock the product row so concurrent counter sales cannot oversell.
    select sale_price into v_unit_price from public.products where id = v_product_id for update;
    if not found then
      raise exception 'Product not found.';
    end if;

    select coalesce(sum(qty), 0) into v_purchased
      from public.stock_purchase_items where product_id = v_product_id;
    select coalesce(sum(qty), 0) into v_sold
      from public.product_sale_items where product_id = v_product_id
        and sale_id <> v_sale_id;
    if v_purchased - v_sold < v_qty then
      raise exception 'Insufficient stock for this product (on hand: %).', (v_purchased - v_sold);
    end if;

    v_amount := v_unit_price * v_qty;
    insert into public.product_sale_items (sale_id, product_id, qty, unit_price, amount)
    values (v_sale_id, v_product_id, v_qty, v_unit_price, v_amount);
    v_subtotal := v_subtotal + v_amount;
    v_count := v_count + 1;
  end loop;

  if v_count = 0 then
    raise exception 'At least one sale line is required.';
  end if;

  update public.product_sales
    set subtotal = v_subtotal, total_due = v_subtotal
    where id = v_sale_id;

  insert into public.audit_log (action, entity_type, entity_id, user_id, details)
  values ('product_sale_created', 'product_sale', v_sale_id::text, auth.uid(),
    jsonb_build_object('sale_number', v_sale_number, 'lines', v_count, 'total', v_subtotal, 'payment_method', p_payment_method));

  return v_sale_id;
end;
$function$;

-- 12. Derived stock + shop revenue views.
create or replace view public.v_product_stock as
select
  p.id as product_id,
  p.inventory_code,
  p.description,
  p.sale_price,
  p.is_active,
  coalesce(pur.qty, 0) as purchased_qty,
  coalesce(sal.qty, 0) as sold_qty,
  coalesce(pur.qty, 0) - coalesce(sal.qty, 0) as on_hand,
  (coalesce(pur.qty, 0) - coalesce(sal.qty, 0)) * p.sale_price as stock_sale_value,
  coalesce(pur.cost, 0) as purchased_cost
from public.products p
left join (
  select product_id, sum(qty) as qty, sum(amount) as cost
  from public.stock_purchase_items group by product_id
) pur on pur.product_id = p.id
left join (
  select product_id, sum(qty) as qty
  from public.product_sale_items group by product_id
) sal on sal.product_id = p.id;

create or replace view public.v_shop_daily_revenue as
select
  date_trunc('day', sold_at)::date as day,
  count(*) as sales_count,
  coalesce(sum(total_due), 0) as revenue
from public.product_sales
group by 1;

-- 13. RLS: the database is the authorization boundary.
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.stock_purchases enable row level security;
alter table public.stock_purchase_items enable row level security;
alter table public.product_sales enable row level security;
alter table public.product_sale_items enable row level security;

-- Suppliers & products: everyone reads, shop managers manage.
create policy "Allow authenticated read suppliers"
  on public.suppliers for select to authenticated using (true);
create policy "Allow shop managers manage suppliers"
  on public.suppliers for all to authenticated using (public.is_shop_manager());

create policy "Allow authenticated read products"
  on public.products for select to authenticated using (true);
create policy "Allow shop managers manage products"
  on public.products for all to authenticated using (public.is_shop_manager());

-- Purchases: everyone reads, shop managers write.
create policy "Allow authenticated read stock_purchases"
  on public.stock_purchases for select to authenticated using (true);
create policy "Allow shop managers manage stock_purchases"
  on public.stock_purchases for insert to authenticated with check (public.is_shop_manager());
create policy "Allow shop managers update stock_purchases"
  on public.stock_purchases for update to authenticated
  using (public.is_shop_manager()) with check (public.is_shop_manager());
create policy "Allow shop managers delete stock_purchases"
  on public.stock_purchases for delete to authenticated using (public.is_shop_manager());

create policy "Allow authenticated read stock_purchase_items"
  on public.stock_purchase_items for select to authenticated using (true);
create policy "Allow shop managers manage stock_purchase_items"
  on public.stock_purchase_items for insert to authenticated with check (public.is_shop_manager());
create policy "Allow shop managers update stock_purchase_items"
  on public.stock_purchase_items for update to authenticated
  using (public.is_shop_manager()) with check (public.is_shop_manager());
create policy "Allow shop managers delete stock_purchase_items"
  on public.stock_purchase_items for delete to authenticated using (public.is_shop_manager());

-- Counter sales: everyone reads; any staff may record a sale (POS counter),
-- only shop managers may edit or void.
create policy "Allow authenticated read product_sales"
  on public.product_sales for select to authenticated using (true);
create policy "Allow authenticated create product_sales"
  on public.product_sales for insert to authenticated with check (true);
create policy "Allow shop managers update product_sales"
  on public.product_sales for update to authenticated
  using (public.is_shop_manager()) with check (public.is_shop_manager());
create policy "Allow shop managers delete product_sales"
  on public.product_sales for delete to authenticated using (public.is_shop_manager());

create policy "Allow authenticated read product_sale_items"
  on public.product_sale_items for select to authenticated using (true);
create policy "Allow authenticated create product_sale_items"
  on public.product_sale_items for insert to authenticated with check (true);
create policy "Allow shop managers update product_sale_items"
  on public.product_sale_items for update to authenticated
  using (public.is_shop_manager()) with check (public.is_shop_manager());
create policy "Allow shop managers delete product_sale_items"
  on public.product_sale_items for delete to authenticated using (public.is_shop_manager());

-- RPC + view access.
grant execute on function public.is_shop_manager() to authenticated;
grant execute on function public.get_next_inventory_code() to authenticated;
grant execute on function public.get_next_sale_number() to authenticated;
grant execute on function public.create_stock_purchase(uuid, text, date, text, jsonb) to authenticated;
grant execute on function public.create_product_sale(uuid, text, text, text, text, jsonb) to authenticated;
grant select on public.v_product_stock to authenticated;
grant select on public.v_shop_daily_revenue to authenticated;
