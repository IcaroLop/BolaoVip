USE bolaovip;

CREATE TABLE IF NOT EXISTS rodadas_status (
  id INT NOT NULL AUTO_INCREMENT,
  campeonato_id INT NOT NULL,
  fase VARCHAR(50) NOT NULL,
  rodada INT NOT NULL,
  nome VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  proxima_rodada INT NULL,
  proxima_nome VARCHAR(100) NULL,
  proxima_status VARCHAR(20) NULL,
  rodada_anterior INT NULL,
  rodada_anterior_nome VARCHAR(100) NULL,
  rodada_anterior_status VARCHAR(20) NULL,
  link VARCHAR(255) NULL,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_campeonato_fase_rodada (campeonato_id, fase, rodada)
);
