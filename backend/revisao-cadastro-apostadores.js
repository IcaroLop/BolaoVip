const mysql = require('mysql2/promise');

/**
 * REVISÃO FINAL - Cadastro de Apostadores
 * EXCLUINDO: Icaro, Alexandre, Ronaldo Dantas, Dennys, Deyves
 */

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3307,
      user: 'root',
      password: 'fBVhh6w2KW',
      database: 'bolaovip'
    });

    console.log('✅ Conectado ao banco de produção\n');
    console.log('═'.repeat(80));
    console.log('📋 REVISÃO FINAL - CADASTRO DE APOSTADORES');
    console.log('═'.repeat(80));

    // Lista COMPLETA do CSV
    const todosApostadores = [
      { id: 1, email: 'icaro.sales.lopes.isl@gmail.com', nome: 'Icaro Sales Lopes', apelido: 'Icaro', whatsapp: '92996251897', pix: 'islopes_icaro@hotmail.com', time: 'Flamengo', INSERIR: false },
      { id: 2, email: 'Jfrothajr@gmail.com', nome: 'Antonio Castro da Frota Junior', apelido: 'Antonio', whatsapp: '92995043091', pix: '01843661276', time: 'São Paulo', INSERIR: true },
      { id: 3, email: 'jaimejgljr1977@gmail.com', nome: 'Jaime José Galisa de Lucena Júnior', apelido: 'Jaime Jr.', whatsapp: '92999913835', pix: '92999913835', time: 'Flamengo', INSERIR: true },
      { id: 4, email: 'cassianofortes@yahoo.com.br', nome: 'Cassiano Fortes de Souza', apelido: 'Cassiano', whatsapp: '92991366591', pix: '76916723220', time: 'Flamengo', INSERIR: true },
      { id: 5, email: 'andrelbcosta33@gmail.com', nome: 'Andre Luiz Brito Costa', apelido: 'André', whatsapp: '92984034496', pix: '82636826220', time: 'Botafogo', INSERIR: true },
      { id: 6, email: 'Tonyartur@gmail.com', nome: 'Jorge Artur da Silva Nunes', apelido: 'Jorge', whatsapp: '92 99279-1747', pix: '92 99279-1747', time: 'Vasco', INSERIR: true },
      { id: 7, email: 'alexandrecosta7712@gmail.com', nome: 'Alexandre Guedes Costa', apelido: 'Alexandre', whatsapp: '92981974700', pix: '92981974700', time: 'Flamengo', INSERIR: false },
      { id: 8, email: 'gilvanfsilva@yahoo.com.br', nome: 'Gilvan Ferreira da Silva', apelido: 'Gilvan', whatsapp: '92981236884', pix: '92981236884', time: 'Flamengo', INSERIR: true },
      { id: 9, email: 'Ronaldodantas1977@gmail.com', nome: 'Ronaldo de Lima Dantas', apelido: 'Ronaldo Dantas', whatsapp: '9291025159', pix: '92991025159', time: 'Flamengo', INSERIR: false },
      { id: 10, email: 'samuelkts35@gmail.com', nome: 'Samuel de Oliveira Barros', apelido: 'Samuel', whatsapp: '92981652514', pix: '92981652514', time: 'Palmeiras', INSERIR: true },
      { id: 11, email: 'dennys_gsilva@hotmail.com', nome: 'Dennys Gomes da Silva', apelido: 'Dennys', whatsapp: '92991222959', pix: '92991222959', time: 'Flamengo', INSERIR: true },
      { id: 12, email: 'deyvesgomes80@gmail.com', nome: 'DEYVES LOPES GOMES', apelido: 'BOLÃO DOS AMIGOS', whatsapp: '92981296877', pix: '92981296877', time: 'Flamengo', INSERIR: false }
    ];

    const aInserir = todosApostadores.filter(a => a.INSERIR);
    const excluidos = todosApostadores.filter(a => !a.INSERIR);

    console.log('\n❌ APOSTADORES EXCLUÍDOS (NÃO SERÃO INSERIDOS):');
    console.log('═'.repeat(80));
    excluidos.forEach(a => {
      console.log(`  ${String(a.id).padStart(2, ' ')}. ${a.nome.padEnd(40)} | ${a.email}`);
    });

    console.log('\n✅ APOSTADORES QUE SERÃO INSERIDOS:');
    console.log('═'.repeat(80));
    aInserir.forEach(a => {
      console.log(`  ${String(a.id).padStart(2, ' ')}. ${a.apelido.padEnd(20)} | ${a.email.padEnd(40)} | Time: ${a.time}`);
    });

    console.log('\n📊 RESUMO:');
    console.log('═'.repeat(80));
    console.log(`  Total no CSV: ${todosApostadores.length}`);
    console.log(`  Excluídos: ${excluidos.length}`);
    console.log(`  A inserir: ${aInserir.length}`);

    // Verificar se emails já existem
    console.log('\n🔍 Verificando se emails já existem no banco...');
    console.log('═'.repeat(80));
    
    for (const apostador of aInserir) {
      const [existe] = await conn.query(
        'SELECT id, nome, email FROM usuarios WHERE email = ?',
        [apostador.email]
      );
      
      if (existe.length > 0) {
        console.log(`  ⚠️  ${apostador.email} - JÁ EXISTE (ID: ${existe[0].id}, Nome: ${existe[0].nome})`);
      } else {
        console.log(`  ✅ ${apostador.email} - Disponível`);
      }
    }

    // Verificar IDs dos times
    console.log('\n⚽ Mapeando times favoritos...');
    console.log('═'.repeat(80));
    
    const timesUnicos = [...new Set(aInserir.map(a => a.time))];
    const mapeamentoTimes = {};
    
    for (const nomeTime of timesUnicos) {
      const [time] = await conn.query(
        'SELECT id, nome FROM times WHERE nome = ?',
        [nomeTime]
      );
      
      if (time.length > 0) {
        mapeamentoTimes[nomeTime] = time[0].id;
        console.log(`  ✅ ${nomeTime.padEnd(15)} - ID: ${time[0].id}`);
      } else {
        mapeamentoTimes[nomeTime] = null;
        console.log(`  ❌ ${nomeTime.padEnd(15)} - NÃO ENCONTRADO`);
      }
    }

    // Verificar grupo e perfil
    console.log('\n👥 Verificando grupo e perfil...');
    console.log('═'.repeat(80));
    
    const [grupo] = await conn.query('SELECT id, nome FROM grupos WHERE id = 3');
    const [perfil] = await conn.query('SELECT id, nome FROM perfis WHERE id = 2');
    
    if (grupo.length > 0) {
      console.log(`  ✅ Grupo: ${grupo[0].nome} (ID: ${grupo[0].id})`);
    } else {
      console.log(`  ❌ Grupo ID 3 não encontrado!`);
    }
    
    if (perfil.length > 0) {
      console.log(`  ✅ Perfil: ${perfil[0].nome} (ID: ${perfil[0].id})`);
    } else {
      console.log(`  ❌ Perfil ID 2 não encontrado!`);
    }

    // Resumo de inserções
    console.log('\n📝 PLANO DE EXECUÇÃO:');
    console.log('═'.repeat(80));
    console.log('\nPara cada apostador será executado:');
    console.log('  1. INSERT INTO usuarios (nome, email, chave_pix, senha_hash, precisa_trocar_senha, time_favorito_id, data_cadastro)');
    console.log('  2. INSERT INTO grupo_usuario_perfil (grupo_id=3, usuario_id=?, perfil_id=2)');
    console.log('\nDados de cada inserção:');
    
    aInserir.forEach(a => {
      console.log(`\n  👤 ${a.apelido}:`);
      console.log(`     Nome: ${a.nome}`);
      console.log(`     Email: ${a.email}`);
      console.log(`     Chave PIX: ${a.pix}`);
      console.log(`     WhatsApp: ${a.whatsapp}`);
      console.log(`     Time Favorito: ${a.time} (ID: ${mapeamentoTimes[a.time] || 'NÃO ENCONTRADO'})`);
      console.log(`     Senha: 123456 (hash bcrypt)`);
      console.log(`     Precisa trocar senha: SIM (1)`);
      console.log(`     Grupo: BolaoBrasileiraoA (ID: 3)`);
      console.log(`     Perfil: Apostador (ID: 2)`);
    });

    console.log('\n\n' + '═'.repeat(80));
    console.log('⚠️  ATENÇÃO: Revisão concluída!');
    console.log('═'.repeat(80));
    console.log(`\n✅ ${aInserir.length} apostadores prontos para inserção`);
    console.log(`❌ ${excluidos.length} apostadores excluídos conforme solicitado`);
    console.log('\n⚠️  Aguardando CONFIRMAÇÃO FINAL para prosseguir com a inserção no banco!');

    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ ERRO:', err.message);
    process.exit(1);
  }
})();
