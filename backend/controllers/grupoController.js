const pool = require('../database/conexao');

async function isAdminDoGrupo(grupoId, usuarioId) {
  const [rows] = await pool.query(
    `SELECT papel FROM grupo_membros WHERE grupo_id = ? AND usuario_id = ? AND status = 'ativo' LIMIT 1`,
    [grupoId, usuarioId]
  );
  return rows.length > 0 && rows[0].papel === 'admin';
}

exports.criarGrupo = async (req, res) => {
  const { nome, campeonatoId } = req.body;
  const usuarioId = req.usuario?.id;

  if (!nome || !campeonatoId) {
    return res.status(400).json({ erro: 'Campos "nome" e "campeonatoId" são obrigatórios.' });
  }

  try {
    const [resultado] = await pool.query(
      `INSERT INTO grupos (nome, campeonato_id, criado_por) VALUES (?, ?, ?);`,
      [nome, campeonatoId, usuarioId]
    );

    const grupoId = resultado.insertId;

    await pool.query(
      `INSERT INTO grupo_membros (grupo_id, usuario_id, papel, status) VALUES (?, ?, 'admin', 'ativo')
       ON DUPLICATE KEY UPDATE papel = 'admin', status = 'ativo';`,
      [grupoId, usuarioId]
    );

    res.status(201).json({ mensagem: 'Grupo criado com sucesso.', grupoId, nome, campeonatoId });
  } catch (err) {
    console.error('Erro ao criar grupo:', err.message);
    res.status(500).json({ erro: 'Erro ao criar grupo', detalhes: err.message });
  }
};

exports.listarMeusGrupos = async (req, res) => {
  const usuarioId = req.usuario?.id;

  try {
    const [rows] = await pool.query(
      `SELECT g.id AS grupoId, g.nome, g.campeonato_id AS campeonatoId, g.criado_por AS criadoPor,
              c.nome AS campeonatoNome, c.nome_popular AS campeonatoNomePopular,
              gm.papel, gm.status
       FROM grupo_membros gm
       JOIN grupos g ON gm.grupo_id = g.id
       LEFT JOIN campeonatos c ON g.campeonato_id = c.campeonato_id
       WHERE gm.usuario_id = ? AND gm.status = 'ativo'
       ORDER BY g.nome ASC;`,
      [usuarioId]
    );

    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar grupos:', err.message);
    res.status(500).json({ erro: 'Erro ao listar grupos', detalhes: err.message });
  }
};

exports.listarMembros = async (req, res) => {
  const usuarioId = req.usuario?.id;
  const grupoId = req.params.id;

  try {
    // Log para debug
    console.log(`[DEBUG] listarMembros - usuarioId: ${usuarioId}, grupoId: ${grupoId}`);
    
    const admin = await isAdminDoGrupo(grupoId, usuarioId);
    console.log(`[DEBUG] isAdminDoGrupo resultado: ${admin}`);
    
    if (!admin) {
      console.log(`[DEBUG] 403 - Usuário ${usuarioId} não é admin do grupo ${grupoId}`);
      return res.status(403).json({ erro: 'Apenas administradores do grupo podem listar membros.' });
    }

    const [membros] = await pool.query(
      `SELECT gm.usuario_id AS usuarioId, u.nome, u.email, gm.papel, gm.status, gm.criado_em
       FROM grupo_membros gm
       JOIN usuarios u ON gm.usuario_id = u.id
       WHERE gm.grupo_id = ? AND gm.status = 'ativo'
       ORDER BY u.nome ASC;`,
      [grupoId]
    );

    // Busca perfis de cada membro
    const membrosComPerfis = await Promise.all(
      membros.map(async (m) => {
        const [perfis] = await pool.query(
          `SELECT p.id, p.nome, p.descricao FROM perfis p
           JOIN grupo_usuario_perfil gup ON gup.perfil_id = p.id
           WHERE gup.grupo_id = ? AND gup.usuario_id = ? ORDER BY p.nome ASC`,
          [grupoId, m.usuarioId]
        );
        return { ...m, perfis };
      })
    );

    res.json(membrosComPerfis);
  } catch (err) {
    console.error('Erro ao listar membros:', err.message);
    res.status(500).json({ erro: 'Erro ao listar membros', detalhes: err.message });
  }
};

// Retorna contexto do grupo (para front definir grupo/campeonato ativos)
exports.obterContexto = async (req, res) => {
  const usuarioId = req.usuario?.id;
  const grupoId = req.params.id;

  try {
    // Checa se usuário é membro ativo
    const [membros] = await pool.query(
      `SELECT papel FROM grupo_membros WHERE grupo_id = ? AND usuario_id = ? AND status = 'ativo' LIMIT 1`,
      [grupoId, usuarioId]
    );

    if (!membros.length) {
      return res.status(403).json({ erro: 'Usuário não participa deste grupo.' });
    }

    const [grupos] = await pool.query(
      `SELECT g.id AS grupoId, g.nome, g.campeonato_id AS campeonatoId, c.nome AS campeonatoNome, c.nome_popular AS campeonatoNomePopular
       FROM grupos g
       LEFT JOIN campeonatos c ON g.campeonato_id = c.campeonato_id
       WHERE g.id = ?
       LIMIT 1;`,
      [grupoId]
    );

    if (!grupos.length) {
      return res.status(404).json({ erro: 'Grupo não encontrado.' });
    }

    res.json(grupos[0]);
  } catch (err) {
    console.error('Erro ao obter contexto do grupo:', err.message);
    res.status(500).json({ erro: 'Erro ao obter contexto do grupo', detalhes: err.message });
  }
};

exports.adicionarMembro = async (req, res) => {
  const usuarioId = req.usuario?.id;
  const grupoId = req.params.id;
  const { usuarioId: novoUsuarioId, perfilIds } = req.body;

  if (!novoUsuarioId) {
    return res.status(400).json({ erro: 'Campo "usuarioId" é obrigatório.' });
  }

  const conexao = await pool.getConnection();
  try {
    const admin = await isAdminDoGrupo(grupoId, usuarioId);
    if (!admin) {
      return res.status(403).json({ erro: 'Apenas administradores do grupo podem adicionar membros.' });
    }

    await conexao.beginTransaction();

    // Adiciona/atualiza membro no grupo (sem papel, pois agora é por perfil)
    await conexao.query(
      `INSERT INTO grupo_membros (grupo_id, usuario_id, papel, status)
       VALUES (?, ?, 'membro', 'ativo')
       ON DUPLICATE KEY UPDATE status = 'ativo';`,
      [grupoId, novoUsuarioId]
    );

    // Remove perfis antigos do usuário neste grupo
    await conexao.query(
      `DELETE FROM grupo_usuario_perfil WHERE grupo_id = ? AND usuario_id = ?`,
      [grupoId, novoUsuarioId]
    );

    // Adiciona novos perfis
    if (Array.isArray(perfilIds) && perfilIds.length > 0) {
      for (const perfilId of perfilIds) {
        await conexao.query(
          `INSERT INTO grupo_usuario_perfil (grupo_id, usuario_id, perfil_id)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE atualizado_em = CURRENT_TIMESTAMP;`,
          [grupoId, novoUsuarioId, perfilId]
        );
      }
    }

    await conexao.commit();

    res.status(201).json({ mensagem: 'Membro adicionado/atualizado com sucesso.', grupoId, usuarioId: novoUsuarioId, perfilIds });
  } catch (err) {
    await conexao.rollback();
    console.error('Erro ao adicionar membro:', err.message);
    res.status(500).json({ erro: 'Erro ao adicionar membro', detalhes: err.message });
  } finally {
    conexao.release();
  }
};

exports.removerMembro = async (req, res) => {
  const usuarioId = req.usuario?.id;
  const grupoId = req.params.id;
  const alvoId = req.params.usuarioId;

  try {
    const admin = await isAdminDoGrupo(grupoId, usuarioId);
    if (!admin) {
      return res.status(403).json({ erro: 'Apenas administradores do grupo podem remover membros.' });
    }

    await pool.query(
      `UPDATE grupo_membros SET status = 'removido', atualizado_em = NOW() WHERE grupo_id = ? AND usuario_id = ?;`,
      [grupoId, alvoId]
    );

    res.json({ mensagem: 'Membro removido (status = removido).', grupoId, usuarioId: alvoId });
  } catch (err) {
    console.error('Erro ao remover membro:', err.message);
    res.status(500).json({ erro: 'Erro ao remover membro', detalhes: err.message });
  }
};

exports.atualizarGrupo = async (req, res) => {
  const usuarioId = req.usuario?.id;
  const grupoId = req.params.id;
  const { nome, campeonatoId } = req.body;

  if (!nome && !campeonatoId) {
    return res.status(400).json({ erro: 'Envie "nome" ou "campeonatoId" para atualizar.' });
  }

  try {
    const admin = await isAdminDoGrupo(grupoId, usuarioId);
    if (!admin) {
      return res.status(403).json({ erro: 'Apenas administradores do grupo podem atualizar o grupo.' });
    }

    const campos = [];
    const valores = [];

    if (nome) {
      campos.push('nome = ?');
      valores.push(nome);
    }

    if (campeonatoId) {
      campos.push('campeonato_id = ?');
      valores.push(campeonatoId);
    }

    valores.push(grupoId);

    const sql = `UPDATE grupos SET ${campos.join(', ')}, atualizado_em = NOW() WHERE id = ?;`;

    await pool.query(sql, valores);

    res.json({ mensagem: 'Grupo atualizado com sucesso.', grupoId, nome, campeonatoId });
  } catch (err) {
    console.error('Erro ao atualizar grupo:', err.message);
    res.status(500).json({ erro: 'Erro ao atualizar grupo', detalhes: err.message });
  }
};
