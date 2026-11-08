'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { MembershipPlan } from '@/types/database';

export async function getPlans(onlyActive: boolean = true) {
  const supabase = await createClient();

  let query = supabase
    .from('membership_plans')
    .select('*')
    .order('price', { ascending: true });

  if (onlyActive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching plans:', error);
    return [];
  }
  return data as MembershipPlan[];
}

export async function updatePlanPrice(id: string, newPrice: number) {
  const supabase = await createClient();

  if (newPrice < 0) {
    return { error: 'Price cannot be negative.' };
  }

  const { data, error } = await supabase
    .from('membership_plans')
    .update({
      price: newPrice,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/memberships/new');
  return { success: true, plan: data };
}
