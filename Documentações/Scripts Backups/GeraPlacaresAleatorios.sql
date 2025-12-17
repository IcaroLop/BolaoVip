DELIMITER $$
DROP PROCEDURE IF EXISTS gerar_palpites_e_pix_rodada18;

CREATE PROCEDURE gerar_palpites_e_pix_rodada18()
BEGIN
  DECLARE user_id INT DEFAULT 1;
  DECLARE rodada INT DEFAULT 18;
  DECLARE valor_palpite DECIMAL(10,2) DEFAULT 10.00;
  DECLARE status_pagamento VARCHAR(20) DEFAULT 'pendente';
  DECLARE status_gerada VARCHAR(20) DEFAULT 'gerada';
  DECLARE agora DATETIME DEFAULT NOW();
  DECLARE expiracao INT;
  DECLARE codigo_envio VARCHAR(100);

  WHILE user_id <= 5 DO
    SET codigo_envio = CONCAT('R18-U', user_id, '-', UUID());
    SET expiracao = 3600;

    -- Palpites
    INSERT INTO palpites (id_usuario, rodada, id_jogo, gols_casa, gols_fora, codigo_envio)
    VALUES 
      (user_id, rodada, 23921, FLOOR(RAND()*4), FLOOR(RAND()*4), codigo_envio),
      (user_id, rodada, 23922, FLOOR(RAND()*4), FLOOR(RAND()*4), codigo_envio),
      (user_id, rodada, 23923, FLOOR(RAND()*4), FLOOR(RAND()*4), codigo_envio),
      (user_id, rodada, 23924, FLOOR(RAND()*4), FLOOR(RAND()*4), codigo_envio),
      (user_id, rodada, 23925, FLOOR(RAND()*4), FLOOR(RAND()*4), codigo_envio),
      (user_id, rodada, 23926, FLOOR(RAND()*4), FLOOR(RAND()*4), codigo_envio),
      (user_id, rodada, 23927, FLOOR(RAND()*4), FLOOR(RAND()*4), codigo_envio),
      (user_id, rodada, 23928, FLOOR(RAND()*4), FLOOR(RAND()*4), codigo_envio),
      (user_id, rodada, 23929, FLOOR(RAND()*4), FLOOR(RAND()*4), codigo_envio),
      (user_id, rodada, 23930, FLOOR(RAND()*4), FLOOR(RAND()*4), codigo_envio);

    -- Pix
    INSERT INTO pix_cobrancas (
      id_usuario, codigo_envio, txid, status, status_pagamento, valor_original,
      chave_pix, solicitacao_pagador,
      loc_id, loc_location, loc_tipo,
      pix_copiaecola,
      calendario_criacao, calendario_expiracao,
      payload_raw, webhook_recebido, webhook_payload,
      created_at, updated_at
    )
    VALUES (
      user_id, codigo_envio, UUID(), status_gerada, status_pagamento, valor_palpite,
      'chave-pix-exemplo', 'Pagamento Bolão VIP',
      NULL, NULL, NULL,
      CONCAT('copiacola-', UUID()),
      agora, expiracao,
      NULL, NULL, NULL,
      agora, agora
    );

    SET user_id = user_id + 1;
  END WHILE;
END$$

DELIMITER ;

-- ✅ Agora execute:
CALL gerar_palpites_e_pix_rodada18();
