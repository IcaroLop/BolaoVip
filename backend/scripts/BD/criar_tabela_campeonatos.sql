USE bolaovip;

-- Cria tabela de campeonatos (api-futebol)
CREATE TABLE IF NOT EXISTS campeonatos (
  campeonato_id INT PRIMARY KEY,
  nome VARCHAR(255),
  nome_popular VARCHAR(255),
  slug VARCHAR(255),
  tipo VARCHAR(50),
  status VARCHAR(50),
  logo VARCHAR(255),
  regiao VARCHAR(50),
  edicao_id INT,
  temporada VARCHAR(10),
  nome_edicao VARCHAR(255),
  nome_edicao_popular VARCHAR(255),
  slug_edicao VARCHAR(255),
  fase_id INT,
  fase_nome VARCHAR(255),
  fase_slug VARCHAR(255),
  fase_tipo VARCHAR(50),
  rodada_atual INT,
  rodada_status VARCHAR(50),
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Exemplo de upsert (Série B retornada pelo token dev)
INSERT INTO campeonatos (
  campeonato_id, nome, nome_popular, slug, tipo, status, logo, regiao,
  edicao_id, temporada, nome_edicao, nome_edicao_popular, slug_edicao,
  fase_id, fase_nome, fase_slug, fase_tipo,
  rodada_atual, rodada_status
) VALUES
(14, 'Campeonato Brasileiro Série B', 'Brasileirão Série B', 'campeonato-brasileiro-serie-b',
 'Pontos Corridos', 'andamento',
 'https://cdn.api-futebol.com.br/campeonatos/escudos/brasileiro-serieb.png', 'nacional',
 180, '2025', 'Campeonato Brasileiro Série B 2025', 'Brasileirão Série B 2025', 'campeonato-brasileiro-serie-b-2025',
 769, 'Fase única', 'brasileiro-serie-b-2025-fase-unica', 'pontos-corridos',
 38, 'encerrada') AS new
ON DUPLICATE KEY UPDATE
  nome=new.nome,
  nome_popular=new.nome_popular,
  slug=new.slug,
  tipo=new.tipo,
  status=new.status,
  logo=new.logo,
  regiao=new.regiao,
  edicao_id=new.edicao_id,
  temporada=new.temporada,
  nome_edicao=new.nome_edicao,
  nome_edicao_popular=new.nome_edicao_popular,
  slug_edicao=new.slug_edicao,
  fase_id=new.fase_id,
  fase_nome=new.fase_nome,
  fase_slug=new.fase_slug,
  fase_tipo=new.fase_tipo,
  rodada_atual=new.rodada_atual,
  rodada_status=new.rodada_status;
