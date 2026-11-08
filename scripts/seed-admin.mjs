import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seed() {
  const adminEmail = 'admin@evofitness.lk';
  const adminPassword = 'Password123!';

  console.log(`Checking if admin user ${adminEmail} exists...`);
  const { data: users } = await supabase.auth.admin.listUsers();

  let adminUser = users?.users?.find(u => u.email === adminEmail);

  if (!adminUser) {
    console.log(`Creating initial admin user: ${adminEmail}`);
    const { data, error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: 'EVO Admin' },
    });

    if (error) {
      console.error('Failed to create admin auth user:', error);
      process.exit(1);
    }
    adminUser = data.user;
    console.log('Admin auth user created with ID:', adminUser.id);
  } else {
    console.log('Admin auth user already exists with ID:', adminUser.id);
  }

  // Ensure profile exists and has role 'admin'
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .upsert({
      id: adminUser.id,
      email: adminEmail,
      full_name: 'EVO Admin',
      role: 'admin',
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (profileErr) {
    console.error('Failed to upsert admin profile:', profileErr);
    process.exit(1);
  }

  console.log('Successfully configured Admin profile:', profile);
  console.log('----------------------------------------------------');
  console.log('DEFAULT LOGIN CREDENTIALS:');
  console.log(`Email:    ${adminEmail}`);
  console.log(`Password: ${adminPassword}`);
  console.log('----------------------------------------------------');
}

seed().catch(console.error);
