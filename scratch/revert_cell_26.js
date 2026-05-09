const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kessjvvrgkfbkuzzfztc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtlc3NqdnZyZ2tmYmt1enpmenRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNDE0ODAsImV4cCI6MjA5MzYxNzQ4MH0.B4PtFikQdGU3sqU4408iT2Xs9l6Nd5HUKqVSCeawI2o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function revertCell26() {
  const { data, error } = await supabase
    .from('cells')
    .update({ 
      login_email: null, 
      login_password: null 
    })
    .eq('id', 26)
    .select();

  if (error) {
    console.error('Error reverting cell 26:', error);
  } else {
    console.log('Cell 26 reverted to NULL access:', data);
  }
}

revertCell26();
