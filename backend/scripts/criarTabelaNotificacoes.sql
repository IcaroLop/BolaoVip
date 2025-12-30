-- Tabela de Notificações de Usuários
CREATE TABLE IF NOT EXISTS notificacoes_usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  tipo ENUM('palpite_enviado', 'pagamento_confirmado', 'inicio_rodada', 'resultado_publicado', 'premio_recebido', 'sistema') NOT NULL DEFAULT 'sistema',
  titulo VARCHAR(255) NOT NULL,
  mensagem TEXT NOT NULL,
  dados_json JSON NULL COMMENT 'Dados adicionais em formato JSON (PIX, valores, etc)',
  lida BOOLEAN DEFAULT FALSE,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_leitura TIMESTAMP NULL,
  
  INDEX idx_usuario_id (usuario_id),
  INDEX idx_lida (lida),
  INDEX idx_data_criacao (data_criacao),
  
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserir notificação de exemplo para testes
-- INSERT INTO notificacoes_usuarios (usuario_id, tipo, titulo, mensagem, dados_json) 
-- VALUES (1, 'sistema', '🎉 Bem-vindo ao Sistema!', 'Aqui você receberá notificações sobre seus palpites, pagamentos e muito mais!', '{}');
