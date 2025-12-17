USE bolaovip;

-- Criar tabela de relação: grupo_usuario_perfil (usuário pode ter diferentes perfis em diferentes grupos)
CREATE TABLE IF NOT EXISTS grupo_usuario_perfil (
  id INT PRIMARY KEY AUTO_INCREMENT,
  grupo_id INT NOT NULL,
  usuario_id INT NOT NULL,
  perfil_id INT NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_grupo_usuario_perfil (grupo_id, usuario_id, perfil_id),
  FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (perfil_id) REFERENCES perfis(id) ON DELETE CASCADE
);

-- Índices para performance
SET @idx1 = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_NAME='grupo_usuario_perfil' AND COLUMN_NAME='grupo_id' AND INDEX_NAME='idx_grupo_usuario_perfil_grupo');
SET @idx2 = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_NAME='grupo_usuario_perfil' AND COLUMN_NAME='usuario_id' AND INDEX_NAME='idx_grupo_usuario_perfil_usuario');
SET @idx3 = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_NAME='grupo_usuario_perfil' AND COLUMN_NAME='perfil_id' AND INDEX_NAME='idx_grupo_usuario_perfil_perfil');

SET @sql1 = IF(@idx1=0, 'CREATE INDEX idx_grupo_usuario_perfil_grupo ON grupo_usuario_perfil(grupo_id)', 'SELECT "Index idx_grupo_usuario_perfil_grupo already exists"');
SET @sql2 = IF(@idx2=0, 'CREATE INDEX idx_grupo_usuario_perfil_usuario ON grupo_usuario_perfil(usuario_id)', 'SELECT "Index idx_grupo_usuario_perfil_usuario already exists"');
SET @sql3 = IF(@idx3=0, 'CREATE INDEX idx_grupo_usuario_perfil_perfil ON grupo_usuario_perfil(perfil_id)', 'SELECT "Index idx_grupo_usuario_perfil_perfil already exists"');

PREPARE stmt1 FROM @sql1;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

PREPARE stmt3 FROM @sql3;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;
