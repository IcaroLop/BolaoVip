// Script para adicionar notificações routes ao server.js
const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, '../server.js');
let content = fs.readFileSync(serverPath, 'utf8');

// Adicionar import
if (!content.includes("require('./routes/notificacoesRoutes')")) {
  content = content.replace(
    "const saldoRoutes = require('./routes/saldoRoutes');",
    "const saldoRoutes = require('./routes/saldoRoutes');\nconst notificacoesRoutes = require('./routes/notificacoesRoutes');"
  );
}

// Adicionar route
if (!content.includes("app.use('/notificacoes'")) {
  content = content.replace(
    "app.use('/saldo', saldoRoutes);",
    "app.use('/saldo', saldoRoutes);\napp.use('/notificacoes', notificacoesRoutes);"
  );
}

fs.writeFileSync(serverPath, content, 'utf8');
console.log('✅ Routes de notificações adicionadas ao server.js');
