
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://kessjvvrgkfbkuzzfztc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtlc3NqdnZyZ2tmYmt1enpmenRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNDE0ODAsImV4cCI6MjA5MzYxNzQ4MH0.B4PtFikQdGU3sqU4408iT2Xs9l6Nd5HUKqVSCeawI2o'
);

const dates = ['2026-04-15', '2026-04-22', '2026-04-29', '2026-05-06', '2026-05-13'];

async function importAttendance() {
  console.log('Fetching members...');
  const { data: members } = await supabase.from('members').select('id, name, cell_id');
  const jsonData = JSON.parse(fs.readFileSync('c:/Users/Clayton/OneDrive - zaccarias sociedade individual de advocacia/Desktop/IBM UP/dados-detalhados-celula-claudinha.json', 'utf8'));

  const attendanceRecords = [];

  for (const memberData of jsonData.members) {
    const dbMember = members.find(m => m.name.toUpperCase() === memberData.name.toUpperCase());
    if (dbMember) {
      memberData.cellAttendance.slice(0, 5).forEach((isPresent, index) => {
        attendanceRecords.push({
          member_id: dbMember.id,
          cell_id: dbMember.cell_id,
          date: dates[index],
          status: isPresent ? 'P' : 'F'
        });
      });
    }
  }

  if (attendanceRecords.length === 0) {
    console.log('No records to import.');
    return;
  }

  console.log(`Importing ${attendanceRecords.length} records...`);
  const { error } = await supabase.from('cell_attendance').upsert(attendanceRecords, { onConflict: 'member_id,date' });
  
  if (error) console.error('Error:', error);
  else console.log('Successfully imported attendance history!');
}

importAttendance();
