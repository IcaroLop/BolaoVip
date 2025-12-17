-- Tabela para armazenar resposta crua da API-Futebol por campeonato/rodada
-- Guarda metadados da rodada e o payload completo de partidas para uso interno

CREATE TABLE IF NOT EXISTS api_rodadas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  campeonato_id INT NOT NULL,
  rodada INT NOT NULL,
  nome VARCHAR(100) NULL,
  slug VARCHAR(100) NULL,
  status VARCHAR(50) NULL,
  proxima_rodada_json JSON NULL,
  rodada_anterior_json JSON NULL,
  api_link VARCHAR(255) NULL,
  partidas_json JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_campeonato_rodada (campeonato_id, rodada)
);
