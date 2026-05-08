const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kessjvvrgkfbkuzzfztc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtlc3NqdnZyZ2tmYmt1enpmenRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNDE0ODAsImV4cCI6MjA5MzYxNzQ4MH0.B4PtFikQdGU3sqU4408iT2Xs9l6Nd5HUKqVSCeawI2o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('Checking cells...');
  const { data: cells } = await supabase.from('cells').select('*');
  console.log('Cells:', cells);

  console.log('Checking recent attendance...');
  const { data: att } = await supabase.from('cell_attendance').select('*').order('date', { ascending: false }).limit(5);
  console.log('Attendance:', att);
}

checkData();
