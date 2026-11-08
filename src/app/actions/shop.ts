'use server';

import { createClient } from '@/lib/supabase/server';
import { isShopManagerRole } from '@/lib/roles';
import { revalidatePath } from 'next/cache';
import type {
  PaymentMethod,
  Product,
  ProductSale,
  ProductStock,
  StockPurchase,
  Supplier,
} from '@/types/database';


async function getAuthed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, role: null };
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  return { supabase, user, role: (profile?.role as string | null) ?? null };
}

// ---------------------------------------------------------------- Suppliers

export async function getSuppliers(onlyActive = false) {
  const { supabase } = await getAuthed();
  let query = supabase.from('suppliers').select('*').order('name');
  if (onlyActive) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) return [];
  return data as Supplier[];
}

export async function createSupplier(formData: {
  name: string;
  contact?: string;
  email?: string;
  address?: string;
  remarks?: string;
}) {
  const { supabase, user, role } = await getAuthed();
  if (!user) return { error: 'You must be authenticated.' };
  if (!isShopManagerRole(role))
    return { error: 'Permission denied. Shop manager role required.' };
  if (!formData.name.trim()) return { error: 'Supplier name is required.' };

  const { data, error } = await supabase
    .from('suppliers')
    .insert([
      {
        name: formData.name.trim(),
        contact: formData.contact?.trim() || null,
        email: formData.email?.trim() || null,
        address: formData.address?.trim() || null,
        remarks: formData.remarks?.trim() || null,
      },
    ])
    .select()
    .single();
  if (error) return { error: error.message };
  revalidatePath('/shop');
  revalidatePath('/shop/suppliers');
  return { success: true, supplier: data as Supplier };
}

export async function updateSupplier(
  id: string,
  formData: {
    name: string;
    contact?: string;
    email?: string;
    address?: string;
    remarks?: string;
  }
) {
  const { supabase, user, role } = await getAuthed();
  if (!user) return { error: 'You must be authenticated.' };
  if (!isShopManagerRole(role))
    return { error: 'Permission denied. Shop manager role required.' };
  if (!formData.name.trim()) return { error: 'Supplier name is required.' };

  const { data, error } = await supabase
    .from('suppliers')
    .update({
      name: formData.name.trim(),
      contact: formData.contact?.trim() || null,
      email: formData.email?.trim() || null,
      address: formData.address?.trim() || null,
      remarks: formData.remarks?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  if (error) return { error: error.message };
  revalidatePath('/shop/suppliers');
  return { success: true, supplier: data as Supplier };
}

export async function toggleSupplierStatus(id: string, is_active: boolean) {
  const { supabase, user, role } = await getAuthed();
  if (!user) return { error: 'You must be authenticated.' };
  if (!isShopManagerRole(role))
    return { error: 'Permission denied. Shop manager role required.' };
  const { error } = await supabase
    .from('suppliers')
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/shop/suppliers');
  return { success: true };
}

// ---------------------------------------------------------------- Products

export async function getNextInventoryCode(): Promise<string> {
  const { supabase } = await getAuthed();
  const { data, error } = await supabase.rpc('get_next_inventory_code');
  if (error || !data) return 'INV0001';
  return data as string;
}

interface StockRow {
  product_id: string;
  inventory_code: string;
  description: string;
  sale_price: number | string;
  is_active: boolean;
  purchased_qty: number | string;
  sold_qty: number | string;
  on_hand: number | string;
  stock_sale_value: number | string;
  purchased_cost: number | string;
}

export async function getProducts(): Promise<ProductStock[]> {
  const { supabase } = await getAuthed();
  const { data, error } = await supabase
    .from('v_product_stock')
    .select('*')
    .order('inventory_code');
  if (error) return [];
  const rows = (data ?? []) as StockRow[];
  return rows.map((r) => ({
    id: r.product_id,
    inventory_code: r.inventory_code,
    description: r.description,
    sale_price: Number(r.sale_price),
    is_active: r.is_active,
    created_at: '',
    updated_at: '',
    purchased_qty: Number(r.purchased_qty),
    sold_qty: Number(r.sold_qty),
    on_hand: Number(r.on_hand),
    stock_sale_value: Number(r.stock_sale_value),
    purchased_cost: Number(r.purchased_cost),
  })) as ProductStock[];
}

export async function createProduct(formData: {
  description: string;
  sale_price: number;
  inventory_code?: string;
}) {
  const { supabase, user, role } = await getAuthed();
  if (!user) return { error: 'You must be authenticated.' };
  if (!isShopManagerRole(role))
    return { error: 'Permission denied. Shop manager role required.' };
  if (!formData.description.trim())
    return { error: 'Inventory description is required.' };
  if (!(formData.sale_price >= 0))
    return { error: 'Sale price cannot be negative.' };

  let code = formData.inventory_code?.trim();
  if (code) {
    if (!/^INV[0-9]+$/.test(code))
      return { error: 'Inventory ID must look like INV0001.' };
  } else {
    const { data } = await supabase.rpc('get_next_inventory_code');
    code = (data as string) || 'INV0001';
  }

  const { data, error } = await supabase
    .from('products')
    .insert([
      {
        inventory_code: code,
        description: formData.description.trim(),
        sale_price: formData.sale_price,
      },
    ])
    .select()
    .single();
  if (error) {
    if (error.code === '23505')
      return { error: 'That Inventory ID is already in use.' };
    return { error: error.message };
  }
  revalidatePath('/shop');
  return { success: true, product: data as Product };
}

export async function updateProduct(
  id: string,
  formData: { description: string; sale_price: number }
) {
  const { supabase, user, role } = await getAuthed();
  if (!user) return { error: 'You must be authenticated.' };
  if (!isShopManagerRole(role))
    return { error: 'Permission denied. Shop manager role required.' };
  if (!formData.description.trim())
    return { error: 'Inventory description is required.' };
  if (!(formData.sale_price >= 0))
    return { error: 'Sale price cannot be negative.' };

  const { data, error } = await supabase
    .from('products')
    .update({
      description: formData.description.trim(),
      sale_price: formData.sale_price,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  if (error) return { error: error.message };
  revalidatePath('/shop');
  return { success: true, product: data as Product };
}

export async function toggleProductStatus(id: string, is_active: boolean) {
  const { supabase, user, role } = await getAuthed();
  if (!user) return { error: 'You must be authenticated.' };
  if (!isShopManagerRole(role))
    return { error: 'Permission denied. Shop manager role required.' };
  const { error } = await supabase
    .from('products')
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/shop');
  return { success: true };
}

// ---------------------------------------------------------------- Purchases

export interface PurchaseLineInput {
  product_id: string;
  qty: number;
  unit_price: number;
  sale_price: number;
}

export async function getPurchases(search?: string) {
  const { supabase } = await getAuthed();
  const { data, error } = await supabase
    .from('stock_purchases')
    .select(
      '*, supplier:suppliers(id, name), items:stock_purchase_items(*, product:products(id, inventory_code, description))'
    )
    .order('purchase_date', { ascending: false });
  if (error) return [];
  let rows = data as StockPurchase[];
  if (search?.trim()) {
    const s = search.trim().toLowerCase();
    rows = rows.filter(
      (p) =>
        p.invoice_grn_no.toLowerCase().includes(s) ||
        (p.supplier?.name ?? '').toLowerCase().includes(s)
    );
  }
  return rows;
}

export async function getPurchaseById(id: string) {
  const { supabase } = await getAuthed();
  const { data, error } = await supabase
    .from('stock_purchases')
    .select(
      '*, supplier:suppliers(*), items:stock_purchase_items(*, product:products(*))'
    )
    .eq('id', id)
    .single();
  if (error) return null;
  return data as StockPurchase;
}

export async function createPurchase(input: {
  supplier_id: string;
  invoice_grn_no: string;
  purchase_date: string;
  notes?: string;
  lines: PurchaseLineInput[];
}) {
  const { supabase, user, role } = await getAuthed();
  if (!user) return { error: 'You must be authenticated.' };
  if (!isShopManagerRole(role))
    return { error: 'Permission denied. Shop manager role required.' };
  if (!input.supplier_id) return { error: 'Supplier is required.' };
  if (!input.invoice_grn_no.trim())
    return { error: 'Invoice / GRN number is required.' };
  if (!input.purchase_date) return { error: 'Purchase date is required.' };
  if (!input.lines.length)
    return { error: 'Add at least one inventory line.' };
  for (const l of input.lines) {
    if (!l.product_id) return { error: 'Every line needs a product.' };
    if (!(l.qty > 0)) return { error: 'Line quantities must be positive.' };
    if (!(l.unit_price >= 0))
      return { error: 'Line unit prices cannot be negative.' };
    if (!(l.sale_price >= 0))
      return { error: 'Line sale prices cannot be negative.' };
  }

  const { data, error } = await supabase.rpc('create_stock_purchase', {
    p_supplier_id: input.supplier_id,
    p_invoice_grn_no: input.invoice_grn_no.trim(),
    p_purchase_date: input.purchase_date,
    p_notes: input.notes?.trim() || null,
    p_items: input.lines,
  });
  if (error) {
    if (error.code === '23505')
      return {
        error: 'That Invoice / GRN number is already recorded for this supplier.',
      };
    return { error: error.message };
  }
  revalidatePath('/shop');
  revalidatePath('/shop/purchases');
  return { success: true, purchase_id: data as string };
}

export async function deletePurchase(id: string) {
  const { supabase, user, role } = await getAuthed();
  if (!user) return { error: 'You must be authenticated.' };
  if (!isShopManagerRole(role))
    return { error: 'Permission denied. Shop manager role required.' };

  // Never delete a GRN whose stock has already been sold.
  const purchase = await getPurchaseById(id);
  if (!purchase) return { error: 'Purchase not found.' };
  const { data: stock } = await supabase.from('v_product_stock').select('*');
  const onHandRows = (stock ?? []) as Pick<StockRow, 'product_id' | 'on_hand'>[];
  const onHand = new Map(
    onHandRows.map((r) => [r.product_id, Number(r.on_hand)])
  );
  for (const item of purchase.items ?? []) {
    if ((onHand.get(item.product_id) ?? 0) < item.qty) {
      return {
        error: `Cannot delete: ${item.qty - (onHand.get(item.product_id) ?? 0)} unit(s) of "${item.product?.description ?? 'an item'}" from this GRN have already been sold.`,
      };
    }
  }

  const { error } = await supabase
    .from('stock_purchases')
    .delete()
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/shop');
  revalidatePath('/shop/purchases');
  return { success: true };
}

// ---------------------------------------------------------------- Sales (POS)

export async function getNextSaleNumber(): Promise<string> {
  const { supabase } = await getAuthed();
  const { data, error } = await supabase.rpc('get_next_sale_number');
  if (error || !data) return 'PS0001';
  return data as string;
}

export async function getSales(search?: string) {
  const { supabase } = await getAuthed();
  const { data, error } = await supabase
    .from('product_sales')
    .select(
      '*, member:members(id, full_name, phone), items:product_sale_items(*, product:products(id, inventory_code, description))'
    )
    .order('sold_at', { ascending: false })
    .limit(200);
  if (error) return [];
  let rows = data as ProductSale[];
  if (search?.trim()) {
    const s = search.trim().toLowerCase();
    rows = rows.filter(
      (sa) =>
        sa.sale_number.toLowerCase().includes(s) ||
        (sa.customer_name ?? '').toLowerCase().includes(s) ||
        (sa.member?.full_name ?? '').toLowerCase().includes(s)
    );
  }
  return rows;
}

export async function getSaleById(id: string) {
  const { supabase } = await getAuthed();
  const { data, error } = await supabase
    .from('product_sales')
    .select(
      '*, member:members(*), items:product_sale_items(*, product:products(*))'
    )
    .eq('id', id)
    .single();
  if (error) return null;
  return data as ProductSale;
}

export async function createSale(input: {
  member_id?: string | null;
  customer_name?: string;
  payment_method: PaymentMethod;
  notes?: string;
  sale_number?: string;
  lines: { product_id: string; qty: number }[];
}) {
  const { supabase, user, role } = await getAuthed();
  if (!user) return { error: 'You must be authenticated.' };
  if (!['cash', 'card', 'bank'].includes(input.payment_method))
    return { error: 'Valid payment method is required.' };
  if (!input.lines.length) return { error: 'Add at least one item.' };
  for (const l of input.lines) {
    if (!l.product_id) return { error: 'Every line needs a product.' };
    if (!(l.qty > 0)) return { error: 'Line quantities must be positive.' };
  }
  // Sale-number override is a shop-manager privilege (mirrors EF invoices).
  if (input.sale_number?.trim() && !isShopManagerRole(role)) {
    return {
      error: 'Permission denied. Only shop managers can set the sale number.',
    };
  }

  const { data, error } = await supabase.rpc('create_product_sale', {
    p_member_id: input.member_id || null,
    p_customer_name: input.customer_name?.trim() || null,
    p_payment_method: input.payment_method,
    p_notes: input.notes?.trim() || null,
    p_sale_number: input.sale_number?.trim() || null,
    p_items: input.lines,
  });
  if (error) {
    if (error.code === '23505')
      return { error: 'That sale number is already in use.' };
    return { error: error.message };
  }
  revalidatePath('/shop');
  revalidatePath('/shop/sales');
  return { success: true, sale_id: data as string };
}

/** Void a counter sale (restores stock). Shop managers only. */
export async function voidSale(id: string) {
  const { supabase, user, role } = await getAuthed();
  if (!user) return { error: 'You must be authenticated.' };
  if (!isShopManagerRole(role))
    return { error: 'Permission denied. Shop manager role required.' };
  const { error } = await supabase.from('product_sales').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/shop');
  revalidatePath('/shop/sales');
  return { success: true };
}

export async function getShopStats() {
  const { supabase } = await getAuthed();
  const [{ data: stock }, { data: revenue }] = await Promise.all([
    supabase.from('v_product_stock').select('*'),
    supabase
      .from('v_shop_daily_revenue')
      .select('*')
      .order('day', { ascending: false })
      .limit(30),
  ]);
  const stockRows = (stock ?? []) as Pick<
    StockRow,
    'on_hand' | 'stock_sale_value' | 'is_active'
  >[];
  const rows = stockRows.map((r) => ({
    on_hand: Number(r.on_hand),
    stock_sale_value: Number(r.stock_sale_value),
    is_active: r.is_active,
  }));
  const lowStock = rows.filter((r) => r.is_active && r.on_hand <= 0).length;
  const revenueRows = (revenue ?? []) as { revenue: number | string }[];
  return {
    activeProducts: rows.filter((r) => r.is_active).length,
    unitsOnHand: rows.reduce((s, r) => s + r.on_hand, 0),
    stockSaleValue: rows.reduce((s, r) => s + r.stock_sale_value, 0),
    outOfStock: lowStock,
    last30DaysRevenue: revenueRows.reduce((s, r) => s + Number(r.revenue), 0),
  };
}
