-- Tabela de saldo dos usuários
CREATE TABLE IF NOT EXISTS saldo_usuario (
  usuario_id INT NOT NULL PRIMARY KEY,
  saldo_atual DECIMAL(10, 2) DEFAULT 0.00,
  saldo_bloqueado DECIMAL(10, 2) DEFAULT 0.00,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CHECK (saldo_atual >= 0),
  CHECK (saldo_bloqueado >= 0),
  CHECK (saldo_bloqueado <= saldo_atual)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de extrato de movimentações
CREATE TABLE IF NOT EXISTS extrato_movimentacao (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  tipo VARCHAR(50) NOT NULL, 
  -- Tipos: 'premiacao_creditada', 'debito_rodada', 'palpite_debitado', 'recarga', 'saque'
  valor DECIMAL(10, 2) NOT NULL,
  saldo_anterior DECIMAL(10, 2) NOT NULL,
  saldo_novo DECIMAL(10, 2) NOT NULL,
  descricao VARCHAR(255) NOT NULL,
  referencia_id INT DEFAULT NULL,
  referencia_tipo VARCHAR(50) DEFAULT NULL, 
  -- Tipos: 'premio', 'palpite', 'rodada', 'pix'
  status VARCHAR(20) DEFAULT 'confirmado', 
  -- Status: 'confirmado', 'pendente', 'cancelado'
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_usuario_data (usuario_id, criado_em DESC),
  INDEX idx_referencia (referencia_tipo, referencia_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
