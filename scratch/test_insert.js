const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://kessjvvrgkfbkuzzfztc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtlc3NqdnZyZ2tmYmt1enpmenRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNDE0ODAsImV4cCI6MjA5MzYxNzQ4MH0.B4PtFikQdGU3sqU4408iT2Xs9l6Nd5HUKqVSCeawI2o'
);

async function main() {
  // Simular EXATAMENTE o que o addMember faria com o formulário preenchido só com nome "EDEL"
  const memberForm = {
    name: 'EDEL', email: '', phone: '', cell_id: '', status: 'active',
    cep: '', address: '', number: '', neighborhood: '', city: '',
    pl: false, ecc: false, bat: false, con: false,
    maturidade: false, ctl: false, ministerios: false, integracao: false, outros: false,
    attended_cell: false, attended_cult: false
  };

  const cId = 8; // uma célula existente

  const booleanFields = [
    'pl', 'ecc', 'bat', 'con', 'maturidade', 'ctl',
    'integracao', 'outros', 'attended_cell', 'attended_cult',
    'ministerios'
  ];
  const textFields = [
    'name', 'email', 'phone', 'status',
    'cep', 'address', 'number', 'neighborhood', 'city'
  ];
  const finalData = { cell_id: Number(cId) };
  textFields.forEach(field => {
    const val = memberForm[field];
    finalData[field] = (val && val.toString().trim() !== '') ? val : null;
  });
  finalData.name = memberForm.name || '';
  finalData.status = memberForm.status || 'active';
  booleanFields.forEach(field => {
    finalData[field] = !!memberForm[field];
  });

  console.log('=== PAYLOAD FINAL ===');
  console.log(JSON.stringify(finalData, null, 2));

  console.log('\n=== TENTANDO INSERT ===');
  const { data, error } = await supabase.from('members').insert([finalData]).select();
  if (error) {
    console.log('ERRO:', JSON.stringify(error, null, 2));
  } else {
    console.log('SUCESSO:', JSON.stringify(data[0], null, 2));
    // Limpar
    await supabase.from('members').delete().eq('id', data[0].id);
    console.log('Registro de teste removido.');
  }

  // Testar também com campos de texto preenchidos com ""
  console.log('\n=== TESTE COM EMPTY STRINGS ===');
  const payload2 = {
    name: 'TESTE2',
    email: '',
    phone: '',
    cell_id: 8,
    status: 'active',
    cep: '',
    address: '',
    number: '',
    neighborhood: '',
    city: '',
    pl: false, ecc: false, bat: false, con: false,
    maturidade: false, ctl: false, ministerios: false,
    integracao: false, outros: false,
    attended_cell: false, attended_cult: false
  };
  console.log('Payload:', JSON.stringify(payload2, null, 2));
  const { data: d2, error: e2 } = await supabase.from('members').insert([payload2]).select();
  if (e2) {
    console.log('ERRO COM EMPTY STRINGS:', JSON.stringify(e2, null, 2));
  } else {
    console.log('SUCESSO COM EMPTY STRINGS:', d2[0].id);
    await supabase.from('members').delete().eq('id', d2[0].id);
    console.log('Removido.');
  }
}

main();
