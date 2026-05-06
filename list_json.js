
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('c:/Users/Clayton/OneDrive - zaccarias sociedade individual de advocacia/Desktop/IBM UP/dados-importar.json', 'utf8'));
const cellNames = {};
data.cells.forEach(c => cellNames[c.id] = c.name);
data.members.forEach(m => {
  console.log(`${m.name} -> ${cellNames[m.cellId]}`);
});
