
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://kessjvvrgkfbkuzzfztc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtlc3NqdnZyZ2tmYmt1enpmenRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNDE0ODAsImV4cCI6MjA5MzYxNzQ4MH0.B4PtFikQdGU3sqU4408iT2Xs9l6Nd5HUKqVSCeawI2o'
);

async function compare() {
  const jsonData = JSON.parse(fs.readFileSync('c:/Users/Clayton/OneDrive - zaccarias sociedade individual de advocacia/Desktop/IBM UP/dados-importar.json', 'utf8'));
  const { data: dbMembers } = await supabase.from('members').select('name');
  
  const dbNames = new Set((dbMembers || []).map(m => m.name.toUpperCase()));
  
  console.log('--- Membros no JSON que NÃO estão no banco ---');
  jsonData.members.forEach(m => {
    if (!dbNames.has(m.name.toUpperCase())) {
      console.log(`${m.name} (Cell JSON ID: ${m.cellId})`);
    }
  });
}

compare();
