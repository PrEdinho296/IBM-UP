
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://kessjvvrgkfbkuzzfztc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtlc3NqdnZyZ2tmYmt1enpmenRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNDE0ODAsImV4cCI6MjA5MzYxNzQ4MH0.B4PtFikQdGU3sqU4408iT2Xs9l6Nd5HUKqVSCeawI2o'
);

async function massImport() {
  const jsonData = JSON.parse(fs.readFileSync('c:/Users/Clayton/OneDrive - zaccarias sociedade individual de advocacia/Desktop/IBM UP/dados-importar.json', 'utf8'));
  
  // 1. Garantir que temos um setor
  let { data: sectors } = await supabase.from('sectors').select('id').limit(1);
  if (!sectors || sectors.length === 0) {
    const { data: newSector } = await supabase.from('sectors').insert([{ name: 'Setor de Importação' }]).select();
    sectors = newSector;
  }
  const defaultSectorId = sectors[0].id;

  // 2. Mapear células
  const cellMap = {}; // JSON ID -> DB ID
  const { data: existingCells } = await supabase.from('cells').select('id, name');
  
  console.log('Sincronizando células...');
  for (const jsonCell of jsonData.cells) {
    let dbCell = existingCells.find(c => c.name.toUpperCase() === jsonCell.name.toUpperCase());
    if (!dbCell) {
      const { data: newCell, error } = await supabase.from('cells').insert([{
        name: jsonCell.name,
        sector_id: defaultSectorId,
        day_of_week: jsonCell.dayOfWeek || 'quarta',
        meeting_time: jsonCell.meetingTime || '19:30'
      }]).select();
      if (newCell) dbCell = newCell[0];
    }
    if (dbCell) cellMap[jsonCell.id] = dbCell.id;
  }

  // 3. Inserir membros
  const { data: existingMembers } = await supabase.from('members').select('name');
  const existingNames = new Set((existingMembers || []).map(m => m.name.toUpperCase()));
  
  const membersToInsert = [];
  for (const jsonMember of jsonData.members) {
    if (!existingNames.has(jsonMember.name.toUpperCase())) {
      membersToInsert.push({
        name: jsonMember.name,
        cell_id: cellMap[jsonMember.cellId] || null,
        status: 'active'
      });
    }
  }

  if (membersToInsert.length > 0) {
    console.log(`Inserindo ${membersToInsert.length} novos membros...`);
    const { error } = await supabase.from('members').insert(membersToInsert);
    if (error) console.error('Erro ao inserir membros:', error);
    else console.log('Importação concluída com sucesso!');
  } else {
    console.log('Nenhum novo membro para importar.');
  }
}

massImport();
