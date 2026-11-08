'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Member } from '@/types/database';

export async function getMembers(searchQuery?: string) {
  const supabase = await createClient();

  let query = supabase
    .from('members')
    .select('*')
    .order('created_at', { ascending: false });

  if (searchQuery && searchQuery.trim().length > 0) {
    const q = searchQuery.trim();
    query = query.or(
      `full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%,nic_passport.ilike.%${q}%,city.ilike.%${q}%`
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching members:', error);
    return [];
  }
  return data as Member[];
}

export async function getMemberById(id: string) {
  const supabase = await createClient();

  const { data: member, error } = await supabase
    .from('members')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !member) {
    return null;
  }

  // Also fetch member's memberships
  const { data: memberships } = await supabase
    .from('memberships')
    .select(`
      *,
      plan:membership_plans(*),
      trainer:trainers(*),
      payments(*)
    `)
    .eq('member_id', id)
    .order('created_at', { ascending: false });

  return {
    ...member,
    memberships: memberships || [],
  };
}

export interface MemberFormData {
  full_name: string;
  phone: string;
  email?: string | null;
  gender: 'male' | 'female' | 'other';
  nic_passport?: string | null;
  date_of_birth?: string | null;
  residence?: string | null;
  city?: string | null;
  post_code?: string | null;
  land_phone?: string | null;
  civil_status?: string | null;
  profession?: string | null;
  office_address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_relationship?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_land_phone?: string | null;
  reasons_for_joining?: string | null;
  how_did_you_hear?: string | null;
  parq_has_condition?: boolean;
  parq_details?: string | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  fat_percentage?: number | null;
  preferred_plan?: string | null;
  notes?: string | null;
}

export async function createMember(formData: MemberFormData) {
  const supabase = await createClient();

  // Validate required fields
  if (!formData.full_name || !formData.phone || !formData.gender) {
    return { error: 'Full name, phone number, and gender are required.' };
  }

  const { data, error } = await supabase
    .from('members')
    .insert([
      {
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
        email: formData.email ? formData.email.trim().toLowerCase() : null,
        gender: formData.gender,
        nic_passport: formData.nic_passport ? formData.nic_passport.trim() : null,
        date_of_birth: formData.date_of_birth || null,
        residence: formData.residence?.trim() || null,
        city: formData.city?.trim() || null,
        post_code: formData.post_code?.trim() || null,
        land_phone: formData.land_phone?.trim() || null,
        civil_status: formData.civil_status?.trim() || null,
        profession: formData.profession?.trim() || null,
        office_address: formData.office_address?.trim() || null,
        emergency_contact_name: formData.emergency_contact_name?.trim() || null,
        emergency_contact_relationship: formData.emergency_contact_relationship?.trim() || null,
        emergency_contact_phone: formData.emergency_contact_phone?.trim() || null,
        emergency_contact_land_phone: formData.emergency_contact_land_phone?.trim() || null,
        reasons_for_joining: formData.reasons_for_joining?.trim() || null,
        how_did_you_hear: formData.how_did_you_hear?.trim() || null,
        parq_has_condition: Boolean(formData.parq_has_condition),
        parq_details: formData.parq_details?.trim() || null,
        weight_kg: formData.weight_kg != null ? Number(formData.weight_kg) : null,
        height_cm: formData.height_cm != null ? Number(formData.height_cm) : null,
        fat_percentage: formData.fat_percentage != null ? Number(formData.fat_percentage) : null,
        preferred_plan: formData.preferred_plan?.trim() || null,
        notes: formData.notes?.trim() || null,
      },
    ])
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/members');
  return { success: true, member: data };
}

export async function updateMember(
  id: string,
  formData: Partial<MemberFormData>
) {
  const supabase = await createClient();

  const updatePayload: Record<string, string | number | boolean | null> = {
    updated_at: new Date().toISOString(),
  };

  for (const [key, value] of Object.entries(formData)) {
    if (value !== undefined) {
      if (typeof value === 'string') {
        updatePayload[key] = value.trim() || null;
      } else {
        updatePayload[key] = value;
      }
    }
  }

  const { data, error } = await supabase
    .from('members')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/members');
  revalidatePath(`/members/${id}`);
  return { success: true, member: data };
}

export async function deleteMember(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from('members').delete().eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/members');
  return { success: true };
}
