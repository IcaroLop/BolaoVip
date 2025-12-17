const mysql = require('mysql2/promise');
const pool = mysql.createPool({host:'localhost',user:'root',password:'isl050382',database:'bolaovip'});

(async()=>{
  const conn = await pool.getConnection();
  
  const [tables] = await conn.query('SHOW TABLES');
  console.log('Tabelas:', tables.map(t=>Object.values(t)[0]).join(', '));
  
  conn.release();
  process.exit(0);
})();
