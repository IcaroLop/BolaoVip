-- Criação da tabela de pontos por partida (jogo a jogo)
-- Execução: mysql -u root -p bolaovip < backend/scripts/create_ranking_pontos_partida.sql

USE bolaovip;

CREATE TABLE IF NOT EXISTS ranking_pontos_partida (
  id INT AUTO_INCREMENT PRIMARY KEY,
  grupo_id INT NOT NULL,
  campeonato_id INT NOT NULL,
  rodada INT NOT NULL,
  partida_id BIGINT NOT NULL,
  usuario_id INT NOT NULL,
  pontos DECIMAL(4,2) NOT NULL,
  -- Campos opcionais para critérios de desempate/diagnóstico
  acerto_exato TINYINT(1) DEFAULT 0,
  vencedor_correto TINYINT(1) DEFAULT 0,
  gols_casa_corretos TINYINT(1) DEFAULT 0,
  gols_fora_corretos TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_partida (usuario_id, partida_id, rodada, campeonato_id, grupo_id),
  INDEX idx_rodada_grupo (rodada, grupo_id),
  INDEX idx_grupo_campeonato (grupo_id, campeonato_id)
);

SELECT 'Tabela ranking_pontos_partida criada/validada com sucesso!' AS status;
