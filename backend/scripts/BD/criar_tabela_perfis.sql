USE bolaovip;

-- Criar tabela de perfis (roles/permissions)
CREATE TABLE IF NOT EXISTS perfis (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nome VARCHAR(100) UNIQUE NOT NULL,
  descricao VARCHAR(255),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Criar tabela de relação usuário-perfil (many-to-many)
CREATE TABLE IF NOT EXISTS usuario_perfis (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  perfil_id INT NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_usuario_perfil (usuario_id, perfil_id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (perfil_id) REFERENCES perfis(id) ON DELETE CASCADE
);

-- Inserir perfis iniciais
INSERT INTO perfis (nome, descricao) VALUES
('Administrador', 'Acesso total ao sistema'),
('Apostador', 'Acesso a palpites e rankings'),
('Financeiro', 'Gerenciamento de pagamentos e prêmios'),
('Desenvolvedor', 'Acesso a configurações e logs')
AS novo
ON DUPLICATE KEY UPDATE descricao = novo.descricao;

-- Índices para performance
SET @idx1 = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_NAME='usuario_perfis' AND COLUMN_NAME='usuario_id' AND INDEX_NAME='idx_usuario_perfis_usuario');
SET @idx2 = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_NAME='usuario_perfis' AND COLUMN_NAME='perfil_id' AND INDEX_NAME='idx_usuario_perfis_perfil');

SET @sql1 = IF(@idx1=0, 'CREATE INDEX idx_usuario_perfis_usuario ON usuario_perfis(usuario_id)', 'SELECT "Index idx_usuario_perfis_usuario already exists"');
SET @sql2 = IF(@idx2=0, 'CREATE INDEX idx_usuario_perfis_perfil ON usuario_perfis(perfil_id)', 'SELECT "Index idx_usuario_perfis_perfil already exists"');

PREPARE stmt1 FROM @sql1;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;
