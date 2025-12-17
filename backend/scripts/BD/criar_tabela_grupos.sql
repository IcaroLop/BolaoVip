USE bolaovip;

-- Tabelas de grupos de apostadores
CREATE TABLE IF NOT EXISTS grupos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  campeonato_id INT NOT NULL,
  criado_por INT NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_grupos_campeonato FOREIGN KEY (campeonato_id) REFERENCES campeonatos(campeonato_id),
  CONSTRAINT fk_grupos_usuario FOREIGN KEY (criado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_grupos_campeonato ON grupos(campeonato_id);

CREATE TABLE IF NOT EXISTS grupo_membros (
  grupo_id INT NOT NULL,
  usuario_id INT NOT NULL,
  papel ENUM('admin', 'membro') DEFAULT 'membro',
  status ENUM('ativo', 'removido') DEFAULT 'ativo',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (grupo_id, usuario_id),
  CONSTRAINT fk_grupo_membros_grupo FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
  CONSTRAINT fk_grupo_membros_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_grupo_membros_usuario ON grupo_membros(usuario_id);
