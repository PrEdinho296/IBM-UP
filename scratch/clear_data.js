const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kessjvvrgkfbkuzzfztc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtlc3NqdnZyZ2tmYmt1enpmenRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNDE0ODAsImV4cCI6MjA5MzYxNzQ4MH0.B4PtFikQdGU3sqU4408iT2Xs9l6Nd5HUKqVSCeawI2o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearAttendance() {
  console.log('1. Clearing Cult Attendance (setting attended_cult to false)...');
  const { error: cultError } = await supabase
    .from('members')
    .update({ attended_cult: false })
    .not('id', 'is', null); // Update all
  
  if (cultError) console.error('Error clearing cult attendance:', cultError);
  else console.log('Cult attendance cleared!');

  console.log('2. Clearing Cell Attendance History (deleting all records in cell_attendance)...');
  const { error: cellError } = await supabase
    .from('cell_attendance')
    .delete()
    .not('id', 'is', null); // Delete all
    
  if (cellError) console.error('Error clearing cell attendance:', cellError);
  else console.log('Cell attendance history cleared!');

  console.log('Done!');
}

clearAttendance();
