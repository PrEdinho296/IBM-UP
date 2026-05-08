const { createClient } = require('@supabase/supabase-js');
const s = createClient(
  'https://kessjvvrgkfbkuzzfztc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtlc3NqdnZyZ2tmYmt1enpmenRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNDE0ODAsImV4cCI6MjA5MzYxNzQ4MH0.B4PtFikQdGU3sqU4408iT2Xs9l6Nd5HUKqVSCeawI2o'
);

(async () => {
  const { data, error } = await s.from('cells').select('*').limit(1);
  if (data && data.length > 0) {
    console.log('Colunas da tabela cells:', Object.keys(data[0]));
  } else {
    console.log('Nenhum dado ou erro:', error);
  }
})();
