const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kessjvvrgkfbkuzzfztc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtlc3NqdnZyZ2tmYmt1enpmenRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNDE0ODAsImV4cCI6MjA5MzYxNzQ4MH0.B4PtFikQdGU3sqU4408iT2Xs9l6Nd5HUKqVSCeawI2o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateCell26() {
  const { data, error } = await supabase
    .from('cells')
    .update({ 
      login_email: 'THIAGO.ZACCARIAS@ICLOUD.COM', 
      login_password: '123456' 
    })
    .eq('id', 26)
    .select();

  if (error) {
    console.error('Error updating cell 26:', error);
  } else {
    console.log('Cell 26 updated successfully:', data);
  }
}

updateCell26();
