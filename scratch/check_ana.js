const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kessjvvrgkfbkuzzfztc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtlc3NqdnZyZ2tmYmt1enpmenRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNDE0ODAsImV4cCI6MjA5MzYxNzQ4MH0.B4PtFikQdGU3sqU4408iT2Xs9l6Nd5HUKqVSCeawI2o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMembers() {
  console.log('Checking Ana members...');
  const { data: members } = await supabase.from('members').select('id, name, cell_id').ilike('name', 'ANA%');
  console.log('Members:', members);

  console.log('Checking attendance for these members...');
  if (members && members.length > 0) {
    const ids = members.map(m => m.id);
    const { data: att } = await supabase.from('cell_attendance').select('*').in('member_id', ids).order('date', { ascending: false });
    console.log('Attendance:', att);
  }
}

checkMembers();
