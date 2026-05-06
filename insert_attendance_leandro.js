
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://kessjvvrgkfbkuzzfztc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtlc3NqdnZyZ2tmYmt1enpmenRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNDE0ODAsImV4cCI6MjA5MzYxNzQ4MH0.B4PtFikQdGU3sqU4408iT2Xs9l6Nd5HUKqVSCeawI2o'
);

const attendance = [
  // 01/abr
  { member_id: 203, cell_id: 15, date: '2026-04-01', status: 'P' },
  { member_id: 204, cell_id: 15, date: '2026-04-01', status: 'P' },
  { member_id: 205, cell_id: 15, date: '2026-04-01', status: 'P' },
  { member_id: 206, cell_id: 15, date: '2026-04-01', status: 'P' },
  { member_id: 207, cell_id: 15, date: '2026-04-01', status: 'P' },
  // 17/abr
  { member_id: 203, cell_id: 15, date: '2026-04-17', status: 'P' },
  { member_id: 204, cell_id: 15, date: '2026-04-17', status: 'P' },
  { member_id: 205, cell_id: 15, date: '2026-04-17', status: 'P' },
  { member_id: 206, cell_id: 15, date: '2026-04-17', status: 'P' },
  { member_id: 207, cell_id: 15, date: '2026-04-17', status: 'F' },
  // 24/abr
  { member_id: 203, cell_id: 15, date: '2026-04-24', status: 'P' },
  { member_id: 204, cell_id: 15, date: '2026-04-24', status: 'P' },
  { member_id: 205, cell_id: 15, date: '2026-04-24', status: 'P' },
  { member_id: 206, cell_id: 15, date: '2026-04-24', status: 'P' },
  { member_id: 207, cell_id: 15, date: '2026-04-24', status: 'F' }
];

async function insertAttendance() {
  console.log('Inserindo frequência para CASA LEANDRO...');
  const { error } = await supabase.from('cell_attendance').insert(attendance);
  if (error) console.error('Erro:', error);
  else console.log('Sucesso! Frequência inserida.');
}

insertAttendance();
