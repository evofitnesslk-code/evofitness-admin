import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seedData() {
  console.log('Seeding initial sample trainers and members...');

  // 1. Seed sample trainers
  const trainers = [
    {
      name: 'Ashan Rodrigo',
      contact: '077 123 9988',
      remarks: 'Certified IFBB Pro & Elite Strength Conditioning Coach',
      default_charge: 25000,
      is_active: true,
    },
    {
      name: 'Saman Kumara',
      contact: '071 456 7711',
      remarks: 'Functional Mobility, HIIT & Weight Loss Specialist',
      default_charge: 20000,
      is_active: true,
    },
    {
      name: 'Dilini Perera',
      contact: '076 889 2233',
      remarks: 'Female Fitness, Posture Alignment & Nutrition Specialist',
      default_charge: 22000,
      is_active: true,
    },
  ];

  for (const t of trainers) {
    const { data: existing } = await supabase
      .from('trainers')
      .select('id')
      .eq('name', t.name)
      .single();

    if (!existing) {
      await supabase.from('trainers').insert(t);
      console.log(`Inserted trainer: ${t.name}`);
    }
  }

  // 2. Seed a sample member
  const { data: existingMember } = await supabase
    .from('members')
    .select('id')
    .eq('phone', '0771234567')
    .single();

  if (!existingMember) {
    const { data: newMem } = await supabase
      .from('members')
      .insert({
        full_name: 'Dinesh Jayawardena',
        phone: '0771234567',
        email: 'dinesh.j@example.com',
        gender: 'male',
        nic_passport: '199212345678',
        emergency_contact_name: 'Niluka Jayawardena',
        emergency_contact_phone: '0777654321',
        notes: 'Goal: Hypertrophy & core stability',
      })
      .select()
      .single();

    console.log('Inserted sample member:', newMem?.full_name);
  }

  console.log('Sample data seeding complete!');
}

seedData().catch(console.error);
