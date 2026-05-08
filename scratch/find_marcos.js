const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://kessjvvrgkfbkuzzfztc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtlc3NqdnZyZ2tmYmt1enpmenRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNDE0ODAsImV4cCI6MjA5MzYxNzQ4MH0.B4PtFikQdGU3sqU4408iT2Xs9l6Nd5HUKqVSCeawI2o'
);

async function main() {
  // Buscar MARCOS no banco
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .ilike('name', '%marcos%');

  if (error) {
    console.log('ERRO:', error);
    return;
  }

  console.log(`=== MARCOS NO SUPABASE (${data.length} registro(s)) ===`);
  data.forEach(m => {
    console.log(JSON.stringify(m, null, 2));
  });

  // Buscar a célula para confirmar
  if (data.length > 0) {
    const { data: cell } = await supabase
      .from('cells')
      .select('*')
      .eq('id', data[0].cell_id)
      .single();
    console.log(`\n=== CÉLULA ===`);
    console.log(`Nome: ${cell?.name}, Líder: ${cell?.leader}`);
  }
}

main();
