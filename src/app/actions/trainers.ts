'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Trainer } from '@/types/database';

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
}) {
  const supabase = await createClient();

  if (!formData.name || !formData.contact) {
    return { error: 'Trainer name and contact information are required.' };
  }

  if (formData.default_charge < 0) {
    return { error: 'Default PT charge cannot be negative.' };
  }

  const { data, error } = await supabase
    .from('trainers')
    .insert([
      {
        name: formData.name.trim(),
        contact: formData.contact.trim(),
        remarks: formData.remarks?.trim() || null,
        default_charge: formData.default_charge || 0,
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
    is_active?: boolean;
  }
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('trainers')
    .update({
      name: formData.name.trim(),
      contact: formData.contact.trim(),
      remarks: formData.remarks?.trim() || null,
      default_charge: formData.default_charge || 0,
      ...(formData.is_active !== undefined ? { is_active: formData.is_active } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/trainers');
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
