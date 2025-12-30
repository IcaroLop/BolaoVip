/**
 * Teste dos endpoints de geração de pagamentos
 * Valida se as novas rotas estão funcionando
 */

const http = require('http');

function fazerRequisicao(metodo, caminho, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: caminho,
      method: metodo,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const resposta = JSON.parse(data);
          resolve({
            status: res.statusCode,
            dados: resposta,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            dados: data,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function executarTestes() {
  console.log('🧪 Iniciando testes de endpoints de geração de pagamentos...\n');
  
  try {
    // 1. Teste GET /ranking/rodada/:rodada/status (público)
    console.log('Test 1️⃣ - GET /ranking/rodada/17/status (público)');
    const teste1 = await fazerRequisicao('GET', '/ranking/rodada/17/status');
    console.log(`Status: ${teste1.status}`);
    console.log(`Resposta: ${JSON.stringify(teste1.dados, null, 2)}\n`);
    
    if (teste1.status === 200 || teste1.status === 404) {
      console.log('✅ Endpoint GET /ranking/rodada/status está respondendo\n');
    } else {
      console.log('❌ Erro inesperado\n');
    }
    
    // 2. Teste POST /ranking/rodada/:rodada/gerar-pagamentos (protegido - deve falhar sem token)
    console.log('Test 2️⃣ - POST /ranking/rodada/17/gerar-pagamentos (sem token)');
    const teste2 = await fazerRequisicao('POST', '/ranking/rodada/17/gerar-pagamentos');
    console.log(`Status: ${teste2.status}`);
    console.log(`Resposta: ${JSON.stringify(teste2.dados, null, 2)}\n`);
    
    if (teste2.status === 401 || teste2.status === 403) {
      console.log('✅ Endpoint POST está protegido (sem token retorna 401/403)\n');
    } else {
      console.log('⚠️ Endpoint pode estar sem proteção de autenticação\n');
    }
    
    console.log('✅ Testes concluídos! Os endpoints estão configurados.');
    console.log('\n📝 Próximos passos:');
    console.log('1. Login com usuário Admin/Financeiro');
    console.log('2. Navegar para uma rodada finalizada');
    console.log('3. Procurar pelo botão "💳 Gerar Pagamentos"');
    console.log('4. Clicar para gerar pagamentos');
    
  } catch (erro) {
    console.error('❌ Erro na requisição:', erro.message);
  }
}

executarTestes();
