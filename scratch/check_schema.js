const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://kessjvvrgkfbkuzzfztc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtlc3NqdnZyZ2tmYmt1enpmenRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNDE0ODAsImV4cCI6MjA5MzYxNzQ4MH0.B4PtFikQdGU3sqU4408iT2Xs9l6Nd5HUKqVSCeawI2o'
);

async function main() {
  // 1. Buscar um membro existente para ver as colunas
  const { data: sample, error: sampleErr } = await supabase.from('members').select('*').limit(1);
  console.log('=== COLUNAS DA TABELA MEMBERS ===');
  if (sampleErr) console.log('ERRO:', sampleErr);
  else if (sample && sample.length > 0) {
    const cols = Object.keys(sample[0]);
    console.log('Colunas:', cols);
    console.log('Tipos:');
    cols.forEach(c => console.log(`  ${c}: ${typeof sample[0][c]} = ${JSON.stringify(sample[0][c])}`));
  } else {
    console.log('Tabela vazia');
  }

  // 2. Tentar inserir um membro de teste
  console.log('\n=== TESTE DE INSERT ===');
  const testData = {
    name: 'TESTE_DELETE_ME',
    cell_id: sample?.[0]?.cell_id || 1,
    status: 'active'
  };
  console.log('Enviando:', testData);
  const { data: ins, error: insErr } = await supabase.from('members').insert([testData]).select();
  if (insErr) {
    console.log('ERRO INSERT:', insErr);
  } else {
    console.log('INSERT OK:', ins[0]);
    // Limpar
    await supabase.from('members').delete().eq('name', 'TESTE_DELETE_ME');
    console.log('Registro de teste removido.');
  }
}

main();
