
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://kessjvvrgkfbkuzzfztc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtlc3NqdnZyZ2tmYmt1enpmenRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNDE0ODAsImV4cCI6MjA5MzYxNzQ4MH0.B4PtFikQdGU3sqU4408iT2Xs9l6Nd5HUKqVSCeawI2o'
);

async function check() {
  const { data: cells } = await supabase.from('cells').select('id, name');
  const { data: members } = await supabase.from('members').select('cell_id');
  
  if (!cells) return;
  
  cells.forEach(c => {
    const count = (members || []).filter(m => Number(m.cell_id) === c.id).length;
    console.log(`${c.name}: ${count} membros`);
  });
}

check();
