-- Tabela de Saldo do Usuário
CREATE TABLE IF NOT EXISTS saldo_usuario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL UNIQUE,
  saldo_atual DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  saldo_bloqueado DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_usuario_id (usuario_id)
);

-- Tabela de Extrato de Movimentação
CREATE TABLE IF NOT EXISTS extrato_movimentacao (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  tipo ENUM('deposito', 'saque', 'palpite_debitado', 'premiacao_creditada') NOT NULL,
  valor DECIMAL(15, 2) NOT NULL,
  saldo_anterior DECIMAL(15, 2) NOT NULL,
  saldo_novo DECIMAL(15, 2) NOT NULL,
  descricao VARCHAR(255),
  referencia_id INT,
  referencia_tipo VARCHAR(50),
  status ENUM('pendente', 'confirmado', 'cancelado') NOT NULL DEFAULT 'confirmado',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_usuario_id (usuario_id),
  INDEX idx_tipo (tipo),
  INDEX idx_criado_em (criado_em),
  INDEX idx_status (status)
);

-- Trigger para inicializar saldo quando usuário é criado
DELIMITER $$

CREATE TRIGGER criar_saldo_novo_usuario
AFTER INSERT ON usuarios
FOR EACH ROW
BEGIN
  INSERT INTO saldo_usuario (usuario_id, saldo_atual, saldo_bloqueado)
  VALUES (NEW.id, 0.00, 0.00);
END$$

DELIMITER ;
