-- Adiciona flag para indicar se os pagamentos/cobranças da rodada já foram gerados
ALTER TABLE rodadas
  ADD COLUMN IF NOT EXISTS pagamentos_gerados TINYINT(1) NOT NULL DEFAULT 0 AFTER status,
  ADD COLUMN IF NOT EXISTS pagamentos_gerados_em DATETIME NULL AFTER pagamentos_gerados;

-- Índice para consultas rápidas por estado da rodada
CREATE INDEX IF NOT EXISTS idx_rodadas_pagamentos ON rodadas (pagamentos_gerados, numero);
