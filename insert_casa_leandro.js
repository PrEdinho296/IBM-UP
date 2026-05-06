
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://kessjvvrgkfbkuzzfztc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtlc3NqdnZyZ2tmYmt1enpmenRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNDE0ODAsImV4cCI6MjA5MzYxNzQ4MH0.B4PtFikQdGU3sqU4408iT2Xs9l6Nd5HUKqVSCeawI2o'
);

const cell_id = 15;
const members = [
  { name: 'EDINHO', cell_id, ecc: true, bat: false, con: true, pl: true, address: 'LEANDRO E ANDREIA STO ANDRÉ' },
  { name: 'EDILEUZA', cell_id, ecc: true, bat: false, con: true, pl: true },
  { name: 'LEANDRO', cell_id, ecc: true, bat: false, con: true, pl: true },
  { name: 'ANDRÉIA', cell_id, ecc: true, bat: false, con: true, pl: true },
  { name: 'ADRIANA SARANDINI', cell_id, ecc: true, bat: false, con: true, pl: true }
];

async function insert() {
  console.log('Inserindo membros para CASA LEANDRO...');
  const { data: insertedMembers, error } = await supabase.from('members').insert(members).select();
  
  if (error) {
    console.error('Erro:', error);
    return;
  }
  
  console.log(`Sucesso! ${insertedMembers.length} membros inseridos.`);
  
  // Atualizar o dia da semana da célula para quarta
  await supabase.from('cells').update({ day_of_week: 'quarta' }).eq('id', cell_id);
}

insert();
