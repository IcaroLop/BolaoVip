const pool = require('../database/conexao');

async function criarTabelaNotificacoesJogos() {
  const conexao = await pool.getConnection();
  try {
    // Verificar se a tabela existe
    const [tables] = await conexao.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notificacoes_enviadas_jogos'`
    );

    if (tables.length > 0) {
      console.log('✅ Tabela notificacoes_enviadas_jogos já existe');
      return;
    }

    // Criar a tabela
    await conexao.query(`
      CREATE TABLE notificacoes_enviadas_jogos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        jogo_id INT NOT NULL,
        partida_id INT NOT NULL,
        rodada INT NOT NULL,
        campeonato_id INT,
        tempo_alerta INT NOT NULL COMMENT '60, 30, 15, ou 5 minutos antes',
        notification_id BIGINT UNIQUE,
        data_agendada DATETIME NOT NULL,
        data_enviada DATETIME,
        status ENUM('agendada', 'enviada', 'cancelada', 'expirada') DEFAULT 'agendada',
        titulo VARCHAR(255),
        mensagem TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_jogo_status (jogo_id, status),
        INDEX idx_data_status (data_agendada, status),
        FOREIGN KEY (jogo_id) REFERENCES jogos(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Tabela notificacoes_enviadas_jogos criada com sucesso');
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    conexao.release();
    process.exit(0);
  }
}

criarTabelaNotificacoesJogos();
