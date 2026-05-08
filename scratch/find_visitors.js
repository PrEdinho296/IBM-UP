const { createClient } = require('@supabase/supabase-js');
const s = createClient(
  'https://kessjvvrgkfbkuzzfztc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtlc3NqdnZyZ2tmYmt1enpmenRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNDE0ODAsImV4cCI6MjA5MzYxNzQ4MH0.B4PtFikQdGU3sqU4408iT2Xs9l6Nd5HUKqVSCeawI2o'
);

(async () => {
  // Visitantes marcados com outros=true
  const { data: visitors } = await s.from('members').select('id,name,cell_id,outros,attended_cult,created_at').eq('outros', true);
  console.log('=== VISITANTES (outros=true) ===');
  console.log('Total:', visitors?.length || 0);
  visitors?.forEach(m => console.log(`  ID:${m.id} | ${m.name} | cell_id:${m.cell_id} | culto:${m.attended_cult}`));

  // Visitantes adicionados via formulário de visitante (attended_cult=true sem cell)
  const { data: recentVisitors } = await s.from('members').select('id,name,cell_id,outros,attended_cult,created_at').eq('attended_cult', true).order('created_at', { ascending: false }).limit(10);
  console.log('\n=== ÚLTIMOS COM PRESENÇA NO CULTO ===');
  recentVisitors?.forEach(m => console.log(`  ID:${m.id} | ${m.name} | cell_id:${m.cell_id} | visitante:${m.outros} | ${m.created_at}`));

  // Total geral
  const { count } = await s.from('members').select('*', { count: 'exact', head: true });
  console.log('\n=== TOTAL GERAL DE MEMBROS NA TABELA ===');
  console.log('Total:', count);
})();
