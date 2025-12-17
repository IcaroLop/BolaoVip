const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',            // ou outro usuário válido
  password: 'isl050382',      // sua senha real
  database: 'bolaovip'
});

module.exports = pool;
