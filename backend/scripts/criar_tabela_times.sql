-- Criação da tabela times e migração de dados da tabela jogos
-- Este script extrai todos os times únicos (mandante + visitante) da tabela jogos

USE bolaovip;

-- Desabilitar safe update mode temporariamente
SET SQL_SAFE_UPDATES = 0;

-- 1. Criar tabela times
CREATE TABLE IF NOT EXISTS times (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE,
  escudo_url VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Popular tabela times com dados únicos dos times mandantes
INSERT IGNORE INTO times (nome, escudo_url)
SELECT DISTINCT time_mandante, escudo_mandante 
FROM jogos 
WHERE time_mandante IS NOT NULL 
  AND time_mandante != ''
ORDER BY time_mandante;

-- 3. Popular tabela times com dados únicos dos times visitantes
-- (INSERT IGNORE vai pular duplicatas devido ao UNIQUE em nome)
INSERT IGNORE INTO times (nome, escudo_url)
SELECT DISTINCT time_visitante, escudo_visitante 
FROM jogos 
WHERE time_visitante IS NOT NULL 
  AND time_visitante != ''
  AND time_visitante NOT IN (SELECT nome FROM times)
ORDER BY time_visitante;

-- 4. Adicionar coluna time_favorito_id na tabela usuarios
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS time_favorito_id INT NULL,
ADD CONSTRAINT fk_usuario_time_favorito 
  FOREIGN KEY (time_favorito_id) REFERENCES times(id) 
  ON DELETE SET NULL 
  ON UPDATE CASCADE;

-- Reabilitar safe update mode
SET SQL_SAFE_UPDATES = 1;

-- 5. Verificar resultados
SELECT COUNT(*) as total_times FROM times;
SELECT * FROM times ORDER BY nome LIMIT 10;

SELECT 'Tabela times criada e populada com sucesso!' AS status;
