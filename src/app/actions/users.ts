'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import type { Profile, UserRole } from '@/types/database';

export async function getUsers() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Check admin
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (currentProfile?.role !== 'admin') {
    return { error: 'Permission denied. Admin role required.' };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return { error: error.message };
  }

  return { users: data as Profile[] };
}

export async function createStaffUser(formData: {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Check admin role
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (currentProfile?.role !== 'admin') {
    return { error: 'Permission denied. Only Admins can create staff accounts.' };
  }

  if (!formData.email || !formData.password || !formData.full_name) {
    return { error: 'All fields are required.' };
  }

  if (formData.password.length < 6) {
    return { error: 'Password must be at least 6 characters long.' };
  }

  try {
    const adminClient = createAdminClient();

    // 1. Create auth user with pre-confirmed email
    const { data: newUser, error: authError } =
      await adminClient.auth.admin.createUser({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        email_confirm: true,
        user_metadata: {
          full_name: formData.full_name.trim(),
        },
      });

    if (authError || !newUser.user) {
      return { error: authError?.message || 'Failed to create user account.' };
    }

    // 2. Insert into profiles table
    const { error: profileError } = await adminClient.from('profiles').insert([
      {
        id: newUser.user.id,
        email: formData.email.trim().toLowerCase(),
        full_name: formData.full_name.trim(),
        role: formData.role || 'staff',
      },
    ]);

    if (profileError) {
      return { error: profileError.message };
    }

    revalidatePath('/users');
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
