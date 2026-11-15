'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Trainer } from '@/types/database';

function validateRate(rate: number | undefined): string | null {
  if (rate === undefined) return null;
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    return 'Commission rate must be between 0% and 100%.';
  }
  if (Math.round(rate * 100) !== rate * 100 && Math.abs(rate * 100 - Math.round(rate * 100)) > 1e-9) {
    return 'Commission rate can have at most 2 decimal places.';
  }
  return null;
}

export async function getTrainer(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('trainers').select('*').eq('id', id).maybeSingle();
  if (error) {
    console.error('Error fetching trainer:', error);
    return null;
  }
  return data as Trainer | null;
}

export async function getTrainers(onlyActive: boolean = false) {
  const supabase = await createClient();

  let query = supabase
    .from('trainers')
    .select('*')
    .order('name', { ascending: true });

  if (onlyActive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching trainers:', error);
    return [];
  }
  return data as Trainer[];
}

export async function createTrainer(formData: {
  name: string;
  contact: string;
  remarks?: string;
  default_charge: number;
  commission_rate?: number;
}) {
  const supabase = await createClient();

  if (!formData.name || !formData.contact) {
    return { error: 'Trainer name and contact information are required.' };
  }

  if (formData.default_charge < 0) {
    return { error: 'Default PT charge cannot be negative.' };
  }

  const rateError = validateRate(formData.commission_rate);
  if (rateError) return { error: rateError };

  const { data, error } = await supabase
    .from('trainers')
    .insert([
      {
        name: formData.name.trim(),
        contact: formData.contact.trim(),
        remarks: formData.remarks?.trim() || null,
        default_charge: formData.default_charge || 0,
        commission_rate: formData.commission_rate ?? 0,
        is_active: true,
      },
    ])
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/trainers');
  revalidatePath('/memberships/new');
  return { success: true, trainer: data };
}

export async function updateTrainer(
  id: string,
  formData: {
    name: string;
    contact: string;
    remarks?: string;
    default_charge: number;
    commission_rate?: number;
    is_active?: boolean;
  }
) {
  const supabase = await createClient();

  const rateError = validateRate(formData.commission_rate);
  if (rateError) return { error: rateError };

  const { data: before } = await supabase
    .from('trainers')
    .select('commission_rate')
    .eq('id', id)
    .single();

  const { data, error } = await supabase
    .from('trainers')
    .update({
      name: formData.name.trim(),
      contact: formData.contact.trim(),
      remarks: formData.remarks?.trim() || null,
      default_charge: formData.default_charge || 0,
      ...(formData.commission_rate !== undefined
        ? { commission_rate: formData.commission_rate }
        : {}),
      ...(formData.is_active !== undefined ? { is_active: formData.is_active } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  if (
    formData.commission_rate !== undefined &&
    before &&
    Number(before.commission_rate) !== formData.commission_rate
  ) {
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from('audit_log').insert({
      action: 'update_trainer_commission_rate',
      entity_type: 'trainer',
      entity_id: id,
      user_id: auth.user?.id ?? null,
      user_role: 'admin',
      details: {
        from: Number(before.commission_rate),
        to: formData.commission_rate,
        note: 'Applies to memberships created after this change only.',
      },
    });
  }

  revalidatePath('/trainers');
  revalidatePath(`/trainers/${id}`);
  revalidatePath('/memberships/new');
  return { success: true, trainer: data };
}

export async function toggleTrainerStatus(id: string, is_active: boolean) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('trainers')
    .update({
      is_active,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/trainers');
  return { success: true };
}
