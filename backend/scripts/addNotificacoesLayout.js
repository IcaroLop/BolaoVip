// Script para adicionar NotificacoesFloating ao Layout
const fs = require('fs');
const path = require('path');

const layoutPath = path.join(__dirname, '../frontend/bolao-vip/src/components/Layout.js');
let content = fs.readFileSync(layoutPath, 'utf8');

// Adicionar import
if (!content.includes("import NotificacoesFloating")) {
  content = content.replace(
    "import Footer from './Footer';",
    "import Footer from './Footer';\nimport NotificacoesFloating from './NotificacoesFloating';"
  );
}

// Adicionar componente antes do fechamento
if (!content.includes("<NotificacoesFloating")) {
  content = content.replace(
    "      </>\n    );",
    "      <NotificacoesFloating />\n      </>\n    );"
  );
}

fs.writeFileSync(layoutPath, content, 'utf8');
console.log('✅ NotificacoesFloating adicionada ao Layout.js');
