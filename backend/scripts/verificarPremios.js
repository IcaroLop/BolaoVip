const pool = require('../database/conexao');

(async () => {
  const [cols] = await pool.execute('SHOW COLUMNS FROM premios');
  console.log('Colunas da tabela premios:');
  cols.forEach(c => console.log(`  - ${c.Field} (${c.Type})`));
  const [enumRow] = cols.filter(c => c.Field === 'status_pagamento');
  if (enumRow) console.log(`\nstatus_pagamento enum: ${enumRow.Type}`);
  await pool.end();
})();
