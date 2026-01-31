-- Migration: Adicionar campeonato_id à tabela rodadas
-- Data: 2026-01-30
-- Motivo: Diferenciar rodadas entre campeonatos diferentes (Brasileirão, Copa do Brasil, etc)

-- 1. Adicionar coluna campeonato_id
ALTER TABLE rodadas 
ADD COLUMN campeonato_id INT NULL AFTER numero;

-- 2. Remover constraint UNIQUE de numero (pois agora rodada 1 pode existir em múltiplos campeonatos)
ALTER TABLE rodadas DROP INDEX numero;

-- 3. Criar constraint UNIQUE composto (numero + campeonato_id)
ALTER TABLE rodadas 
ADD UNIQUE KEY unique_rodada_campeonato (numero, campeonato_id);

-- 4. Atualizar rodadas existentes baseado nos jogos
UPDATE rodadas r
SET r.campeonato_id = (
  SELECT j.campeonato_id 
  FROM jogos j 
  WHERE j.rodada = r.numero 
  LIMIT 1
);

-- 5. Tornar campeonato_id NOT NULL após popular
ALTER TABLE rodadas 
MODIFY COLUMN campeonato_id INT NOT NULL;

-- 6. Resetar pagamentos_gerados para permitir regeneração por campeonato
UPDATE rodadas 
SET pagamentos_gerados = 0, 
    pagamentos_gerados_em = NULL;

-- Verificação final
SELECT numero, campeonato_id, pagamentos_gerados, status 
FROM rodadas 
ORDER BY campeonato_id, numero
LIMIT 20;
