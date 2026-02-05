import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { DateTime } from 'luxon';
import API_BASE_URL from '../config';
import './ConfiguracoesPage.css';

const API = API_BASE_URL;

function ConfiguracoesPage() {
  const [campeonatos, setCampeonatos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [grupoSelecionado, setGrupoSelecionado] = useState(null);
  const [membros, setMembros] = useState([]);
  const [nomeGrupo, setNomeGrupo] = useState('');
  const [campeonatoIdForm, setCampeonatoIdForm] = useState('');
  const [novoUsuarioId, setNovoUsuarioId] = useState('');
  const [perfisEdit, setPerfisEdit] = useState([]);
  const [perfisDisponiveis, setPerfisDisponiveis] = useState([]);
  const [editandoMembroId, setEditandoMembroId] = useState(null);
  const [perfisEditMembro, setPerfisEditMembro] = useState([]);
  const [mensagem, setMensagem] = useState('');
  const [loading, setLoading] = useState(false);
  const [importandoPartidas, setImportandoPartidas] = useState(false);
  const [importandoRodadas, setImportandoRodadas] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('grupos'); // 'grupos' | 'api-futebol' | 'agendador' | 'logs'
  const [abaLogsAtiva, setAbaLogsAtiva] = useState('sistema');
  const [logsSistema, setLogsSistema] = useState({ itens: [], total: 0, pagina: 1 });
  const [logsUsuarios, setLogsUsuarios] = useState({ itens: [], total: 0, pagina: 1 });
  const [filtroSistema, setFiltroSistema] = useState({ origem: '', nivel: '' });
  const [filtroUsuarios, setFiltroUsuarios] = useState({ usuario_id: '', tipo_evento: '' });
  const [tokenAtivo, setTokenAtivo] = useState(null);
  const [configuracoes, setConfiguracoes] = useState(null);

  const token = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const tParam = params.get('token');
    if (tParam) {
      try { localStorage.setItem('token', tParam); } catch {}
      try { sessionStorage.setItem('token', tParam); } catch {}
      return tParam;
    }
    try {
      const tLocal = localStorage.getItem('token');
      if (tLocal) return tLocal;
    } catch {}
    try {
      const tSession = sessionStorage.getItem('token');
      if (tSession) return tSession;
    } catch {}
    if (process.env.REACT_APP_DEV_TOKEN && process.env.NODE_ENV !== 'production') {
      return process.env.REACT_APP_DEV_TOKEN;
    }
    return null;
  }, []);

  const authHeader = useMemo(() => (token ? { headers: { Authorization: `Bearer ${token}` } } : {}), [token]);

  useEffect(() => {
    if (!token) {
      setMensagem('Faça login para gerenciar grupos.');
      return;
    }
    
    const inicializar = async () => {
      // Carregar grupo selecionado do localStorage (sincroniza com Header)
      const grupoIdStorage = localStorage.getItem('grupoId');
      if (grupoIdStorage) {
        setGrupoSelecionado(Number(grupoIdStorage));
      }
      
      await carregarCampeonatos();
      await carregarUsuarios();
      await carregarGrupos();
      await carregarPerfis();
      await carregarTokenAtivo();
      await carregarConfiguracoes();
    };
    
    inicializar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Listener para sincronizar quando o grupo for alterado no Header
  useEffect(() => {
    const handleStorageChange = () => {
      const grupoIdStorage = localStorage.getItem('grupoId');
      if (grupoIdStorage) {
        setGrupoSelecionado(Number(grupoIdStorage));
      } else {
        setGrupoSelecionado(null);
      }
    };

    // Escutar mudanças no storage (funciona entre abas)
    window.addEventListener('storage', handleStorageChange);
    
    // Polling para detectar mudanças na mesma aba (workaround)
    const interval = setInterval(() => {
      const grupoIdStorage = localStorage.getItem('grupoId');
      const grupoIdAtual = Number(grupoIdStorage);
      if (grupoIdAtual !== grupoSelecionado) {
        setGrupoSelecionado(grupoIdAtual || null);
      }
    }, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [grupoSelecionado]);

  const carregarPerfis = async () => {
    try {
      const res = await axios.get(`${API}/usuarios/perfis/lista`, authHeader);
      setPerfisDisponiveis(res.data || []);
    } catch (err) {
      console.error('Erro ao carregar perfis', err);
    }
  };

  const carregarTokenAtivo = async () => {
    try {
      const res = await axios.get(`${API}/api/config/token-status`, authHeader);
      setTokenAtivo(res.data.info);
    } catch (err) {
      console.error('Erro ao carregar status do token', err);
    }
  };

  const alternarAmbienteToken = async () => {
    try {
      await axios.post(`${API}/api/config/toggle-token`, {}, authHeader);
      await carregarTokenAtivo();
      await carregarConfiguracoes();
      setMensagem('✅ Ambiente de token alternado.');
    } catch (err) {
      console.error('Erro ao alternar ambiente do token', err);
      setMensagem('Erro ao alternar ambiente do token.');
    }
  };

  const carregarConfiguracoes = async () => {
    try {
      const res = await axios.get(`${API}/configuracoes`, authHeader);
      setConfiguracoes(res.data || null);
    } catch (err) {
      console.error('Erro ao carregar configurações', err);
    }
  };

  const carregarLogsSistema = async (paginaLocal = 1) => {
    try {
      const params = new URLSearchParams();
      params.set('pagina', paginaLocal);
      params.set('limite', 20);
      if (filtroSistema.origem) params.set('origem', filtroSistema.origem);
      if (filtroSistema.nivel) params.set('nivel', filtroSistema.nivel);
      const res = await axios.get(`${API}/configuracoes/logs/sistema?${params.toString()}`, authHeader);
      const json = res.data || {};
      setLogsSistema({ itens: json.logs || json.itens || [], total: json.total || 0, pagina: paginaLocal });
    } catch (err) {
      console.error('Erro ao carregar logs do sistema', err);
    }
  };

  const carregarLogsUsuarios = async (paginaLocal = 1) => {
    try {
      const params = new URLSearchParams();
      params.set('pagina', paginaLocal);
      params.set('limite', 20);
      if (filtroUsuarios.usuario_id) params.set('usuario_id', filtroUsuarios.usuario_id);
      if (filtroUsuarios.tipo_evento) params.set('tipo_evento', filtroUsuarios.tipo_evento);
      const res = await axios.get(`${API}/configuracoes/logs/usuarios?${params.toString()}`, authHeader);
      const json = res.data || {};
      setLogsUsuarios({ itens: json.logs || json.itens || [], total: json.total || 0, pagina: paginaLocal });
    } catch (err) {
      console.error('Erro ao carregar logs de usuários', err);
    }
  };

  const carregarCampeonatos = async () => {
    try {
      const res = await axios.get(`${API}/campeonatos`, authHeader);
      setCampeonatos(res.data || []);
    } catch (err) {
      console.error('Erro ao carregar campeonatos', err);
      setMensagem('Erro ao carregar campeonatos.');
    }
  };

  const carregarUsuarios = async () => {
    try {
      const res = await axios.get(`${API}/usuarios`, authHeader);
      setUsuarios(res.data || []);
    } catch (err) {
      console.error('Erro ao carregar usuários', err);
      setMensagem('Erro ao carregar usuários.');
    }
  };

  const carregarGrupos = async () => {
    try {
      const res = await axios.get(`${API}/grupos`, authHeader);
      setGrupos(res.data || []);
    } catch (err) {
      console.error('Erro ao carregar grupos', err);
      setMensagem('Erro ao carregar grupos.');
    }
  };

  const selecionarGrupo = async (id) => {
    setGrupoSelecionado(id);
    
    // Sincronizar com localStorage (usado pelo Header)
    if (id) {
      localStorage.setItem('grupoId', id);
    } else {
      localStorage.removeItem('grupoId');
    }
    
    setMembros([]);
    if (!id) return;
    try {
      const res = await axios.get(`${API}/grupos/${id}/membros`, authHeader);
      setMembros(res.data || []);
      setMensagem('');
    } catch (err) {
      console.error('Erro ao buscar membros', err);
      if (err?.response?.status === 403) {
        setMensagem('⚠️ Você não é administrador deste grupo. Apenas administradores podem gerenciar membros.');
      } else {
        const msg = err?.response?.data?.erro || 'Erro ao buscar membros.';
        setMensagem(msg);
      }
    }
  };

  const criarGrupo = async (e) => {
    e.preventDefault();
    if (!nomeGrupo || !campeonatoIdForm) {
      setMensagem('Informe nome do grupo e campeonato.');
      return;
    }
    setLoading(true);
    try {
      await axios.post(
        `${API}/grupos`,
        { nome: nomeGrupo, campeonatoId: Number(campeonatoIdForm) },
        authHeader
      );
      setMensagem('Grupo criado com sucesso!');
      setNomeGrupo('');
      setCampeonatoIdForm('');
      carregarGrupos();
    } catch (err) {
      console.error('Erro ao criar grupo', err);
      const msg = err?.response?.data?.erro || 'Erro ao criar grupo.';
      setMensagem(msg);
    } finally {
      setLoading(false);
    }
  };

  const adicionarMembro = async (e) => {
    e.preventDefault();
    if (!grupoSelecionado) {
      setMensagem('Selecione um grupo antes de adicionar membros.');
      return;
    }
    if (!novoUsuarioId) {
      setMensagem('Informe o usuário.');
      return;
    }
    if (perfisEdit.length === 0) {
      setMensagem('Selecione pelo menos um perfil para o usuário.');
      return;
    }
    setLoading(true);
    try {
      await axios.post(
        `${API}/grupos/${grupoSelecionado}/membros`,
        { usuarioId: Number(novoUsuarioId), perfilIds: perfisEdit },
        authHeader
      );
      setMensagem('Membro adicionado/atualizado com sucesso!');
      setNovoUsuarioId('');
      setPerfisEdit([]);
      selecionarGrupo(grupoSelecionado);
    } catch (err) {
      console.error('Erro ao adicionar membro', err);
      const msg = err?.response?.data?.erro || 'Erro ao adicionar membro (verifique se você é admin).';
      setMensagem(msg);
    } finally {
      setLoading(false);
    }
  };

  const togglePerfil = (perfilId) => {
    if (perfisEdit.includes(perfilId)) {
      setPerfisEdit(perfisEdit.filter((p) => p !== perfilId));
    } else {
      setPerfisEdit([...perfisEdit, perfilId]);
    }
  };

  const iniciarEdicaoMembro = (membro) => {
    setEditandoMembroId(membro.usuarioId);
    setPerfisEditMembro(membro.perfis?.map((p) => p.id) || []);
  };

  const cancelarEdicaoMembro = () => {
    setEditandoMembroId(null);
    setPerfisEditMembro([]);
  };

  const togglePerfilMembro = (perfilId) => {
    if (perfisEditMembro.includes(perfilId)) {
      setPerfisEditMembro(perfisEditMembro.filter((p) => p !== perfilId));
    } else {
      setPerfisEditMembro([...perfisEditMembro, perfilId]);
    }
  };

  const salvarPerfisDoMembro = async () => {
    if (perfisEditMembro.length === 0) {
      setMensagem('Selecione pelo menos um perfil.');
      return;
    }
    setLoading(true);
    try {
      await axios.post(
        `${API}/grupos/${grupoSelecionado}/membros`,
        { usuarioId: editandoMembroId, perfilIds: perfisEditMembro },
        authHeader
      );
      setMensagem('Perfis atualizados com sucesso!');
      cancelarEdicaoMembro();
      await selecionarGrupo(grupoSelecionado);
    } catch (err) {
      console.error('Erro ao atualizar perfis', err);
      const msg = err?.response?.data?.erro || 'Erro ao atualizar perfis.';
      setMensagem(msg);
    } finally {
      setLoading(false);
    }
  };

  const campeonatoNome = (campeonatoId) => {
    const c = campeonatos.find((item) => Number(item.id) === Number(campeonatoId));
    return c?.nomePopular || c?.nome || `Campeonato ${campeonatoId}`;
  };

  const importarPartidasCampeonato = async () => {
    if (!grupoSelecionado) {
      setMensagem('⚠️ Selecione um grupo antes de importar partidas.');
      return;
    }

    setImportandoPartidas(true);
    setMensagem('');

    try {
      const res = await axios.post(
        `${API}/api/partidas/importar-campeonato`,
        { grupoId: grupoSelecionado },
        authHeader
      );

      if (res.data.sucesso) {
        if (res.data.modo === 'teste') {
          // Token de teste: apenas mostra informações
          const fases = res.data.fases ? res.data.fases.join(', ') : 'N/A';
          setMensagem(
            `🧪 MODO TESTE - Conexão com API OK!\n\n` +
            `✅ ${res.data.mensagem}\n\n` +
            `📊 Total de partidas: ${res.data.total}\n` +
            `📋 Fases disponíveis: ${fases}\n\n` +
            `⚠️ Nota: Como você está usando um token de TESTE, nenhum dado foi gravado no banco de dados. ` +
            `Para importar de verdade, use um token de PRODUÇÃO.`
          );
        } else if (res.data.modo === 'producao') {
          // Token de produção: mostra gravação com detalhes
          await carregarConfiguracoes(); // Atualiza contador
          setMensagem(
            `${res.data.mensagem}\n\n` +
            `📊 Resumo da operação:\n` +
            `  • Total de partidas processadas: ${res.data.total}\n` +
            `  • Novas partidas inseridas: ${res.data.inseridas}\n` +
            `  • Partidas atualizadas: ${res.data.atualizadas}\n\n` +
            `🎯 Dados gravados com sucesso no banco de dados!\n` +
            `⏰ Importação realizada em: ${res.data.timestamp}`
          );
        } else {
          // Fallback se modo não for especificado
          setMensagem(
            `✅ Importação concluída!\n\n` +
            `📊 Total de partidas: ${res.data.total}\n` +
            `  • Inseridas: ${res.data.inseridas}\n` +
            `  • Atualizadas: ${res.data.atualizadas}`
          );
        }
      } else {
        setMensagem('⚠️ A API retornou dados inesperados.');
      }
    } catch (err) {
      console.error('Erro ao importar partidas:', err);
      
      let mensagemErro = 'Erro ao importar partidas.';
      let detalhes = '';
      
      if (err?.response?.data?.erro) {
        mensagemErro = err.response.data.erro;
      }
      if (err?.response?.data?.detalhes) {
        detalhes = `\n\n📝 Detalhes: ${err.response.data.detalhes}`;
      }
      if (err?.response?.data?.timestamp) {
        detalhes += `\n⏰ Timestamp: ${err.response.data.timestamp}`;
      }
      
      setMensagem(`${mensagemErro}${detalhes}`);
    } finally {
      setImportandoPartidas(false);
    }
  };

  const importarRodadasCampeonato = async () => {
    if (!grupoSelecionado) {
      setMensagem('⚠️ Selecione um grupo antes de importar status das rodadas.');
      return;
    }

    setImportandoRodadas(true);
    setMensagem('');

    try {
      const res = await axios.post(
        `${API}/api/partidas/importar-rodadas`,
        { grupoId: grupoSelecionado },
        authHeader
      );

      if (res.data.sucesso) {
        if (res.data.modo === 'teste') {
          const total = res.data.total || 0;
          const detalhes = (res.data.resumo || [])
            .map((item) => `• ${item.fase}: ${item.totalRodadas} rodadas (${item.statusPorRodada.map((r) => `${r.rodada}:${r.status}`).join(', ')})`)
            .join('\n');

          setMensagem(
            `🧪 MODO TESTE - Conexão com API OK!\n\n` +
            `✅ ${res.data.mensagem}\n` +
            `📊 Total de rodadas: ${total}\n` +
            `${detalhes ? `\n${detalhes}\n` : ''}` +
            `⚠️ Nota: Como você está usando um token de TESTE, nenhum dado foi gravado no banco. Use token de PRODUÇÃO para salvar.`
          );
        } else if (res.data.modo === 'producao') {
          await carregarConfiguracoes(); // Atualiza contador
          setMensagem(
            `${res.data.mensagem}\n\n` +
            `📊 Resumo da operação:\n` +
            `  • Total de rodadas processadas: ${res.data.total}\n` +
            `  • Novas rodadas inseridas: ${res.data.inseridas}\n` +
            `  • Rodadas atualizadas: ${res.data.atualizadas}\n\n` +
            `🎯 Status das rodadas salvo no banco de dados!\n` +
            `⏰ Importação realizada em: ${res.data.timestamp}`
          );
        } else {
          setMensagem(
            `✅ Importação concluída!\n\n` +
            `📊 Total de rodadas: ${res.data.total}\n` +
            `  • Inseridas: ${res.data.inseridas}\n` +
            `  • Atualizadas: ${res.data.atualizadas}`
          );
        }
      } else {
        setMensagem('⚠️ A API retornou dados inesperados.');
      }
    } catch (err) {
      console.error('Erro ao importar rodadas:', err);

      let mensagemErro = 'Erro ao importar rodadas.';
      let detalhes = '';

      if (err?.response?.data?.erro) {
        mensagemErro = err.response.data.erro;
      }
      if (err?.response?.data?.detalhes) {
        detalhes = `\n\n📝 Detalhes: ${err.response.data.detalhes}`;
      }
      if (err?.response?.data?.timestamp) {
        detalhes += `\n⏰ Timestamp: ${err.response.data.timestamp}`;
      }

      setMensagem(`${mensagemErro}${detalhes}`);
    } finally {
      setImportandoRodadas(false);
    }
  };

  return (
    <div className="cfg-container">
      <header className="cfg-hero">
        <div>
          <p className="chip">⚙️ Configurações</p>
          <h1>Gestão de Grupos e API</h1>
          <p className="muted">Crie grupos, gerencie membros e importe partidas da API-Futebol.</p>
        </div>
        <div className="hero-actions">
          <button className="ghost" onClick={carregarGrupos}>↻ Atualizar grupos</button>
          <button className="ghost" onClick={carregarCampeonatos}>↻ Atualizar campeonatos</button>
          <button className="ghost" onClick={carregarUsuarios}>↻ Atualizar usuários</button>
          <button className="ghost" onClick={() => { carregarTokenAtivo(); carregarConfiguracoes(); }}>🔄 Atualizar Token/Config</button>
        </div>
      </header>

      {/* Abas de navegação */}
      <div className="cfg-tabs">
        <button 
          className={abaAtiva === 'grupos' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setAbaAtiva('grupos')}
        >
          👥 Grupos
        </button>
        <button 
          className={abaAtiva === 'api-futebol' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setAbaAtiva('api-futebol')}
        >
          🔄 API Futebol
        </button>
        <button 
          className={abaAtiva === 'agendador' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setAbaAtiva('agendador')}
        >
          🗓️ Agendador
        </button>
        <button 
          className={abaAtiva === 'logs' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => {
            setAbaAtiva('logs');
            // Carrega logs ao entrar na aba
            if (abaLogsAtiva === 'sistema') carregarLogsSistema(1); else carregarLogsUsuarios(1);
          }}
        >
          📜 Logs
        </button>
      </div>

      {mensagem && <div className="cfg-alert">{mensagem}</div>}

      {/* Conteúdo da aba GRUPOS */}
      {abaAtiva === 'grupos' && (
        <section className="cfg-grid">
          <div className="panel">
            <h3>1) Criar novo grupo</h3>
          <form className="cfg-form" onSubmit={criarGrupo}>
            <label>
              Nome do grupo
              <input
                type="text"
                value={nomeGrupo}
                onChange={(e) => setNomeGrupo(e.target.value)}
                placeholder="Ex: Amigos Série A"
                required
              />
            </label>
            <label>
              Campeonato do grupo
              <select
                value={campeonatoIdForm}
                onChange={(e) => setCampeonatoIdForm(e.target.value)}
                required
              >
                <option value="">Selecione</option>
                {campeonatos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nomePopular || c.nome || c.id}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" disabled={loading}>Criar grupo</button>
          </form>
        </div>

        <div className="panel">
          <h3>2) Meus grupos</h3>
          <div className="grupo-lista">
            {grupos.length === 0 && <p className="muted">Nenhum grupo encontrado.</p>}
            {grupos.map((g) => (
              <div
                key={g.grupoId || g.id}
                className={`grupo-card ${Number(grupoSelecionado) === Number(g.grupoId || g.id) ? 'ativo' : ''}`}
                onClick={() => selecionarGrupo(g.grupoId || g.id)}
              >
                <div className="grupo-titulo">{g.nome}</div>
                <div className="grupo-meta">{campeonatoNome(g.campeonatoId || g.campeonato_id)}</div>
                <div className="grupo-chip">{g.papel ? g.papel.toUpperCase() : 'membro'}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>3) Participantes do grupo</h3>
          {!grupoSelecionado && <p className="muted">Selecione um grupo para ver os membros.</p>}
          {grupoSelecionado && (
            <div className="membros-lista">
              {membros.length === 0 ? (
                <p className="muted">Nenhum membro listado (necessário ser admin).</p>
              ) : (
                membros.map((m) => (
                  <div key={m.usuarioId} className="membro-container">
                    {editandoMembroId === m.usuarioId ? (
                      <div className="membro-edit-form">
                        <div className="membro-edit-header">
                          <div className="membro-nome">{m.nome}</div>
                          <button type="button" onClick={cancelarEdicaoMembro} className="btn-close">✕</button>
                        </div>
                        <div className="perfis-checkboxes">
                          {perfisDisponiveis.map((p) => (
                            <label key={p.id} className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={perfisEditMembro.includes(p.id)}
                                onChange={() => togglePerfilMembro(p.id)}
                              />
                              <span>
                                <strong>{p.nome}</strong>
                                <div className="descricao">{p.descricao}</div>
                              </span>
                            </label>
                          ))}
                        </div>
                        <div className="membro-edit-actions">
                          <button type="button" onClick={salvarPerfisDoMembro} disabled={loading || perfisEditMembro.length === 0}>
                            Salvar
                          </button>
                          <button type="button" onClick={cancelarEdicaoMembro} className="btn-secondary">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="membro-row" onClick={() => iniciarEdicaoMembro(m)}>
                        <div style={{ flex: 1 }}>
                          <div className="membro-nome">{m.nome}</div>
                          <div className="membro-meta">ID {m.usuarioId} · {m.email}</div>
                          <div className="membro-perfis">
                            {m.perfis && m.perfis.length > 0 ? (
                              m.perfis.map((p) => (
                                <span key={p.id} className="badge-small">{p.nome}</span>
                              ))
                            ) : (
                              <span className="muted">Sem perfis</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="panel">
          <h3>4) Adicionar participante</h3>
          <form className="cfg-form" onSubmit={adicionarMembro}>
            <label>
              Selecione usuário
              <select
                value={novoUsuarioId}
                onChange={(e) => setNovoUsuarioId(e.target.value)}
                required
              >
                <option value="">Escolha um participante</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome} ({u.email})
                  </option>
                ))}
              </select>
            </label>

            <label>Perfis do grupo</label>
            <div className="perfis-checkboxes">
              {perfisDisponiveis.length === 0 ? (
                <p className="muted">Nenhum perfil disponível.</p>
              ) : (
                perfisDisponiveis.map((p) => (
                  <label key={p.id} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={perfisEdit.includes(p.id)}
                      onChange={() => togglePerfil(p.id)}
                    />
                    <span>
                      <strong>{p.nome}</strong>
                      <div className="descricao">{p.descricao}</div>
                    </span>
                  </label>
                ))
              )}
            </div>

            <button type="submit" disabled={loading || !grupoSelecionado || !novoUsuarioId || perfisEdit.length === 0}>
              {grupoSelecionado ? 'Adicionar ao grupo' : 'Selecione um grupo'}
            </button>
            <p className="muted">Apenas administradores do grupo podem adicionar/atualizar membros.</p>
          </form>
        </div>
      </section>
      )}

      {/* Conteúdo da aba API FUTEBOL */}
      {abaAtiva === 'api-futebol' && (
        <section className="cfg-grid">
          <div className="panel">
            <h3>🔄 Importar Partidas da API-Futebol</h3>
            
            {tokenAtivo && (
              <div className="token-status-box" style={{
                background: tokenAtivo.environment === 'production' ? '#1a4d2e' : '#4a3a0a',
                border: `1px solid ${tokenAtivo.environment === 'production' ? '#2d7a4d' : '#8a6a1a'}`,
                borderRadius: '8px',
                padding: '0.75rem',
                marginBottom: '1rem'
              }}>
                <p style={{margin: 0, fontSize: '0.9rem', color: '#fff'}}>
                  <strong>🔑 Token Ativo:</strong> {tokenAtivo.environment === 'production' ? '✅ Produção (live_*)' : '🧪 Desenvolvimento (test_*)'}
                </p>
                <div style={{ marginTop: '0.5rem' }}>
                  <button className="ghost" onClick={alternarAmbienteToken}>🔁 Alternar Dev/Prod</button>
                  <button className="ghost" style={{ marginLeft: '0.5rem' }} onClick={carregarTokenAtivo}>↻ Recarregar Status</button>
                </div>
                {tokenAtivo.environment === 'production' && configuracoes?.requisicoes_api_futebol !== undefined && (
                  <p style={{margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#ffd700'}}>
                    <strong>📊 Requisições à API:</strong> {configuracoes.requisicoes_api_futebol}
                  </p>
                )}
              </div>
            )}
            
            <p className="muted">
              Sincronize automaticamente todas as partidas do campeonato vinculado ao grupo selecionado.
            </p>

            {grupoSelecionado ? (
              <>
                <div className="api-info-box">
                  <p><strong>Grupo selecionado:</strong></p>
                  <p className="highlight">
                    {grupos.find((g) => (g.grupoId || g.id) === grupoSelecionado)?.nome || 'Carregando...'}
                  </p>
                  <p><strong>Campeonato:</strong></p>
                  <p className="highlight">
                    {campeonatoNome(grupos.find((g) => (g.grupoId || g.id) === grupoSelecionado)?.campeonatoId || grupos.find((g) => (g.grupoId || g.id) === grupoSelecionado)?.campeonato_id)}
                  </p>
                  <p className="muted small">
                    (ID do campeonato: {grupos.find((g) => (g.grupoId || g.id) === grupoSelecionado)?.campeonatoId || grupos.find((g) => (g.grupoId || g.id) === grupoSelecionado)?.campeonato_id || 'N/A'})
                  </p>
                </div>

                <button
                  className="btn-import"
                  onClick={importarPartidasCampeonato}
                  disabled={importandoPartidas}
                >
                  {importandoPartidas ? '⏳ Importando...' : '🚀 Importar Todas as Partidas'}
                </button>

                <button
                  className="btn-import secondary"
                  onClick={importarRodadasCampeonato}
                  disabled={importandoRodadas}
                  style={{ marginTop: '0.75rem' }}
                >
                  {importandoRodadas ? '⏳ Atualizando rodadas...' : '📅 Atualizar Status das Rodadas'}
                </button>

                <p className="muted small">
                  ⚠️ Esta ação buscará todas as partidas do campeonato na API-Futebol e salvará no banco de dados.
                  Partidas existentes serão atualizadas automaticamente (baseado no partida_id).
                </p>
              </>
            ) : (
              <div className="warning-box">
                <p>⚠️ Selecione um grupo na aba "Grupos" antes de importar partidas.</p>
              </div>
            )}
          </div>

          <div className="panel">
            <h3>ℹ️ Informações sobre a Importação</h3>
            <ul className="info-list">
              <li><strong>Endpoint utilizado:</strong> <code>GET /v1/campeonatos/{'{campeonato_id}'}/partidas</code></li>
              <li><strong>Endpoint de status de rodadas:</strong> <code>GET /v1/campeonatos/{'{campeonato_id}'}/rodadas</code></li>
              <li><strong>Autenticação:</strong> Bearer Token (configurado no backend)</li>
              <li><strong>⚠️ Modo de operação:</strong> 
                <ul style={{marginTop: '0.5rem', paddingLeft: '1.5rem'}}>
                  <li>🧪 <strong>Token de TESTE</strong> (test_*): Apenas testa conexão, NÃO grava no banco</li>
                  <li>✅ <strong>Token de PRODUÇÃO</strong> (live_*): Importa e grava partidas no banco de dados</li>
                </ul>
              </li>
              <li><strong>Estrutura importada:</strong> Fases → Rodadas → Partidas</li>
              <li><strong>Dados salvos:</strong> time_mandante, time_visitante, data, hora, escudos, fase, rodada</li>
              <li><strong>Tratamento de duplicatas:</strong> Partidas existentes (mesmo partida_id) são atualizadas</li>
              <li><strong>Placares:</strong> Salvos como NULL (serão preenchidos em sincronização posterior)</li>
            </ul>

            <h4>📋 Fases suportadas:</h4>
            <div className="fases-badges">
              <span className="badge">primeira-fase</span>
              <span className="badge">oitavas-de-final</span>
              <span className="badge">quartas-de-final</span>
              <span className="badge">semi-final</span>
              <span className="badge">final</span>
            </div>
          </div>
        </section>
      )}
      {/* Conteúdo da aba AGENDADOR */}
      {abaAtiva === 'agendador' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="panel">
            <h3>⏰ Cron Jobs Automáticos</h3>
            <p className="muted">Jobs agendados que executam automaticamente em horários específicos (America/Manaus).</p>
            <CronJobsBox />
          </div>

          <div className="panel">
            <h3>🗓️ Agendador de Requisições</h3>
            <p className="muted">Agenda de disparos por grupos de partidas (todos os grupos de bolão), respeitando o limite diário de requisições.</p>
            <AgendadorBox />
          </div>
        </section>
      )}
      {abaAtiva === 'logs' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="panel">
            <h3>📜 Logs do Sistema</h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button className={abaLogsAtiva==='sistema' ? 'tab-btn active' : 'tab-btn'} onClick={() => { setAbaLogsAtiva('sistema'); carregarLogsSistema(1); }}>Sistema</button>
              <button className={abaLogsAtiva==='usuarios' ? 'tab-btn active' : 'tab-btn'} onClick={() => { setAbaLogsAtiva('usuarios'); carregarLogsUsuarios(1); }}>Usuários</button>
            </div>
            {abaLogsAtiva==='sistema' ? (
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <input placeholder="Origem (ex: server, cron)" value={filtroSistema.origem} onChange={(e)=>setFiltroSistema(s=>({ ...s, origem: e.target.value }))} />
                  <select className="compact-select" value={filtroSistema.nivel} onChange={(e)=>setFiltroSistema(s=>({ ...s, nivel: e.target.value }))}>
                    <option value="">Nível</option>
                    <option value="info">info</option>
                    <option value="warn">warn</option>
                    <option value="error">error</option>
                  </select>
                  <button className="ghost" onClick={()=>carregarLogsSistema(1)}>Atualizar</button>
                </div>
                <LogsSistemaTable logsSistema={logsSistema} onPaginar={(p)=>carregarLogsSistema(p)} />
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <input className="compact-input" placeholder="Usuário ID" value={filtroUsuarios.usuario_id} onChange={(e)=>setFiltroUsuarios(s=>({ ...s, usuario_id: e.target.value }))} />
                  <input className="compact-input" placeholder="Tipo Evento" value={filtroUsuarios.tipo_evento} onChange={(e)=>setFiltroUsuarios(s=>({ ...s, tipo_evento: e.target.value }))} />
                  <button className="ghost" onClick={()=>carregarLogsUsuarios(1)}>Atualizar</button>
                </div>
                <LogsUsuariosTable logsUsuarios={logsUsuarios} onPaginar={(p)=>carregarLogsUsuarios(p)} />
              </div>
            )}
          </div>
        </section>
      )}
      {abaAtiva === 'api-futebol' && (
        <section className="cfg-grid">
          <div className="panel">
            <h3>🔎 Consultar Rodada Específica (API-Futebol)</h3>
            <p className="muted">Informe a rodada para o campeonato do grupo selecionado e salve os jogos no banco.</p>

            {grupoSelecionado ? (
              <ConsultarRodadaBox
                API={API}
                authHeader={authHeader}
                grupoSelecionado={grupoSelecionado}
                grupos={grupos}
                campeonatoNome={campeonatoNome}
                onDone={() => carregarConfiguracoes()}
              />
            ) : (
              <div className="warning-box">
                <p>⚠️ Selecione um grupo na aba "Grupos" para habilitar esta opção.</p>
              </div>
            )}
          </div>

          <div className="panel">
            <h3>🏆 Importar Classificação (Tabela)</h3>
            <p className="muted">Sincronize a tabela de classificação do campeonato do grupo selecionado.</p>

            {grupoSelecionado ? (
              <ImportarClassificacaoBox
                API={API}
                authHeader={authHeader}
                grupoSelecionado={grupoSelecionado}
                grupos={grupos}
                campeonatoNome={campeonatoNome}
              />
            ) : (
              <div className="warning-box">
                <p>⚠️ Selecione um grupo na aba "Grupos" para habilitar esta opção.</p>
              </div>
            )}
          </div>

          <div className="panel">
            <h3>⚙️ Limite de Requisições Diárias</h3>
            <p className="muted">Plano atual de requisições à API-Futebol por dia (máximo 100).</p>
            <LimiteRequisicoesDiaBox
              configuracoes={configuracoes}
              authHeader={authHeader}
              onSalvarSucesso={(configsAtualizadas) => setConfiguracoes(configsAtualizadas)}
            />
          </div>
        </section>
      )}
    </div>
  );
}

export default ConfiguracoesPage;

function LogsSistemaTable({ logsSistema, onPaginar }) {
  return (
    <div className="cfg-form">
      <div className="table-like agendador-grid">
        <div className="row header">
          <div className="cell" style={{ width: '140px' }}>Data/Hora</div>
          <div className="cell" style={{ width: '120px' }}>Origem</div>
          <div className="cell" style={{ width: '90px' }}>Nível</div>
          <div className="cell" style={{ flex: 1 }}>Descrição</div>
        </div>
        {(logsSistema.itens || []).map((l) => (
          <div className="row" key={`s-${l.id}`}>
            <div className="cell" style={{ width: '140px' }}>{new Date(l.data_hora || l.criado_em).toLocaleString()}</div>
            <div className="cell" style={{ width: '120px' }}>{l.origem}</div>
            <div className="cell" style={{ width: '90px' }}>{l.nivel}</div>
            <div className="cell" style={{ flex: 1, whiteSpace: 'pre-wrap', textAlign: 'left' }}>{l.descricao}</div>
          </div>
        ))}
        {(logsSistema.itens || []).length === 0 && (
          <div className="row"><div className="cell">Sem logs do sistema</div></div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, fontSize: '0.85rem', color: '#9fb0bd' }}>
        <span>Total: {logsSistema.total} items | Página {logsSistema.pagina}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ghost" onClick={() => onPaginar(Math.max(1, (logsSistema.pagina || 1) - 1))} disabled={(logsSistema.pagina || 1) <= 1}>← Anterior</button>
          <button className="ghost" onClick={() => onPaginar((logsSistema.pagina || 1) + 1)} disabled={(logsSistema.pagina * 20) >= (logsSistema.total || 0)}>Próxima →</button>
        </div>
      </div>
    </div>
  );
}

function LogsUsuariosTable({ logsUsuarios, onPaginar }) {
  return (
    <div className="cfg-form">
      <div className="table-like agendador-grid">
        <div className="row header">
          <div className="cell" style={{ width: '140px' }}>Data/Hora</div>
          <div className="cell" style={{ width: '160px' }}>Usuário</div>
          <div className="cell" style={{ width: '140px' }}>Tipo</div>
          <div className="cell" style={{ flex: 1 }}>Descrição</div>
        </div>
        {(logsUsuarios.itens || []).map((l) => (
          <div className="row" key={`u-${l.id}`}>
            <div className="cell" style={{ width: '140px' }}>{new Date(l.data_hora || l.criado_em).toLocaleString()}</div>
            <div className="cell" style={{ width: '160px' }}>{l.usuario_nome || l.usuario_id}</div>
            <div className="cell" style={{ width: '140px' }}>{l.tipo_evento}</div>
            <div className="cell" style={{ flex: 1, whiteSpace: 'pre-wrap', textAlign: 'left' }}>{l.descricao}</div>
          </div>
        ))}
        {(logsUsuarios.itens || []).length === 0 && (
          <div className="row"><div className="cell">Sem logs de usuários</div></div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, fontSize: '0.85rem', color: '#9fb0bd' }}>
        <span>Total: {logsUsuarios.total} items | Página {logsUsuarios.pagina}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ghost" onClick={() => onPaginar(Math.max(1, (logsUsuarios.pagina || 1) - 1))} disabled={(logsUsuarios.pagina || 1) <= 1}>← Anterior</button>
          <button className="ghost" onClick={() => onPaginar((logsUsuarios.pagina || 1) + 1)} disabled={(logsUsuarios.pagina * 20) >= (logsUsuarios.total || 0)}>Próxima →</button>
        </div>
      </div>
    </div>
  );
}
function CronJobsBox() {
  const cronJobs = [
    {
      id: 1,
      nome: 'Zerar Contador de Requisições',
      descricao: 'Reseta o contador diário de requisições à API-Futebol',
      horario: '00:01',
      icone: '🔄',
      frequencia: 'Diário',
      timezone: 'America/Manaus',
      funcao: 'Atualiza configuracoes.requisicoes_api_futebol = 0'
    },
    {
      id: 2,
      nome: 'Atualizar Status das Rodadas',
      descricao: 'Sincroniza status de todas as rodadas dos campeonatos via API-Futebol',
      horario: '01:00',
      icone: '📊',
      frequencia: 'Diário',
      timezone: 'America/Manaus',
      funcao: 'Consulta API e atualiza tabela rodadas_status'
    },
    {
      id: 3,
      nome: 'Atualizar Classificação',
      descricao: 'Importa a tabela de classificação de cada campeonato dos grupos',
      horario: '01:10',
      icone: '🏆',
      frequencia: 'Diário',
      timezone: 'America/Manaus',
      funcao: 'GET /campeonatos/{id}/tabela e atualiza classificacao'
    },
    {
      id: 4,
      nome: 'Planejar Agendamentos',
      descricao: 'Gera o planejamento de requisições de placares agrupados por data/horário',
      horario: '02:00',
      icone: '🗓️',
      frequencia: 'Diário',
      timezone: 'America/Manaus',
      funcao: 'Persiste agenda na tabela agendador_requisicoes'
    }
  ];

  return (
    <div className="cfg-form">
      <div className="table-like agendador-grid">
        <div className="row header">
          <div className="cell" style={{ width: '60px' }}>Ícone</div>
          <div className="cell" style={{ width: '80px' }}>Horário</div>
          <div className="cell" style={{ flex: 2 }}>Nome do Job</div>
          <div className="cell" style={{ flex: 3 }}>Descrição</div>
          <div className="cell" style={{ width: '100px' }}>Frequência</div>
          <div className="cell" style={{ width: '120px' }}>Timezone</div>
        </div>
        {cronJobs.map((job) => (
          <div className="row" key={job.id}>
            <div className="cell" style={{ width: '60px', fontSize: '1.5rem' }}>{job.icone}</div>
            <div className="cell" style={{ width: '80px', fontWeight: 'bold', color: '#60a5fa' }}>{job.horario}</div>
            <div className="cell" style={{ flex: 2 }}>
              <strong>{job.nome}</strong>
            </div>
            <div className="cell" style={{ flex: 3, fontSize: '0.85rem', color: '#9fb0bd' }}>
              {job.descricao}
            </div>
            <div className="cell" style={{ width: '100px' }}>
              <span style={{ 
                background: 'rgba(34, 197, 94, 0.2)', 
                color: '#4ade80', 
                padding: '2px 8px', 
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 'bold'
              }}>
                {job.frequencia}
              </span>
            </div>
            <div className="cell" style={{ width: '120px', fontSize: '0.8rem' }}>
              🌎 {job.timezone.split('/')[1]}
            </div>
          </div>
        ))}
      </div>
      
      <div style={{ 
        marginTop: '16px', 
        padding: '12px', 
        background: 'rgba(59, 130, 246, 0.1)', 
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '8px'
      }}>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#9fb0bd' }}>
          ℹ️ <strong>Informação:</strong> Os cron jobs são executados automaticamente pelo servidor backend. 
          Não é necessário nenhuma ação manual. Os jobs estão ativos enquanto o servidor estiver rodando.
        </p>
      </div>
      
      <div style={{ 
        marginTop: '12px', 
        padding: '12px', 
        background: 'rgba(251, 191, 36, 0.1)', 
        border: '1px solid rgba(251, 191, 36, 0.3)',
        borderRadius: '8px'
      }}>
        <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#fbbf24', fontWeight: 'bold' }}>
          📋 Fluxo Diário Automatizado:
        </p>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8rem', color: '#9fb0bd' }}>
          <li><strong>00:01 AM</strong> → Zera contador de requisições (novo ciclo diário)</li>
          <li><strong>01:00 AM</strong> → Atualiza status de todas as rodadas via API</li>
          <li><strong>02:00 AM</strong> → Planeja e persiste agenda de requisições do dia</li>
        </ul>
      </div>
    </div>
  );
}

function AgendadorBox() {
  const [agenda, setAgenda] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [campeonatosMapa, setCampeonatosMapa] = useState({});
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [limiteDiario, setLimiteDiario] = useState(0);
  const [requisicoesUsadas, setRequisicoesUsadas] = useState(0);
  const [saldoDisponivel, setSaldoDisponivel] = useState(0);
  const limit = 10;
  const [diaFiltro, setDiaFiltro] = useState(() => {
    const hoje = new Date();
    const y = hoje.getFullYear();
    const m = String(hoje.getMonth() + 1).padStart(2, '0');
    const d = String(hoje.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  // Reusa API base e auth da página
  const token = useMemo(() => {
    try { return localStorage.getItem('token'); } catch { return null; }
  }, []);
  const authHeader = useMemo(() => (token ? { headers: { Authorization: `Bearer ${token}` } } : {}), [token]);

  const carregarAgenda = async (pageNum = 1) => {
    // Se onClick passar o evento por engano, ignora
    if (typeof pageNum !== 'number') {
      pageNum = 1;
    }
    setLoading(true);
    setMensagem('');
    try {
      const url = `${API}/configuracoes/agendador/agenda?page=${pageNum}&limit=${limit}${diaFiltro ? `&dia=${diaFiltro}` : ''}`;
      const res = await axios.get(url, authHeader);
      // Garante que dataHora seja string ISO para Luxon; se vier Date, converte
      const agendaFmt = (res.data.agenda || []).map((item) => {
        if (item?.dataHora instanceof Date) {
          const iso = DateTime.fromJSDate(item.dataHora, { zone: 'utc' }).toISO();
          return { ...item, dataHora: iso };
        }
        return item;
      });
      setAgenda(agendaFmt);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 0);
      setLimiteDiario(res.data.limiteDiario || 0);
      setRequisicoesUsadas(res.data.requisicoesUsadas || 0);
      setSaldoDisponivel(res.data.saldoDisponivel || 0);
      setPage(pageNum);
      if (!res.data.agenda || res.data.agenda.length === 0) {
        setMensagem('⚠️ Nenhum jogo agendado encontrado.');
      }
    } catch (err) {
      console.error('Erro ao carregar agenda:', err);
      setMensagem(err?.response?.data?.erro || err.message || 'Falha ao carregar agenda.');
    } finally {
      setLoading(false);
    }
  };

  const carregarCampeonatosMapa = async () => {
    try {
      const res = await axios.get(`${API}/campeonatos`, authHeader);
      const lista = res.data || [];
      const mapa = {};
      lista.forEach(c => { mapa[Number(c.id)] = c.nomePopular || c.nome || `${c.id}`; });
      setCampeonatosMapa(mapa);
    } catch (err) {
      // Silencioso; mantém IDs se falhar
    }
  };

  const planejar = async () => {
    setLoading(true);
    setMensagem('');
    try {
      const res = await axios.post(`${API}/configuracoes/agendador/planejar`, {}, authHeader);
      setMensagem(res.data.mensagem || 'Agenda planejada.');
      await carregarAgenda(1);
    } catch (err) {
      setMensagem(err?.response?.data?.erro || 'Falha ao planejar agenda.');
    } finally {
      setLoading(false);
    }
  };

  const executarDevidos = async () => {
    setLoading(true);
    setMensagem('');
    try {
      const res = await axios.post(`${API}/configuracoes/agendador/executar-devidos`, {}, authHeader);
      setMensagem(res.data.mensagem || 'Execução disparada.');
      await carregarAgenda(1);
    } catch (err) {
      setMensagem(err?.response?.data?.erro || 'Falha ao executar devidos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && authHeader?.headers) {
      carregarAgenda(1);
      carregarCampeonatosMapa();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="cfg-form">
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <div className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34d399', padding: '6px 10px' }}>
          Limite diário: {limiteDiario}
        </div>
        <div className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.4)', color: '#60a5fa', padding: '6px 10px' }}>
          Requisições usadas: {requisicoesUsadas}
        </div>
        <div className="badge" style={{ background: 'rgba(251, 191, 36, 0.15)', border: '1px solid rgba(251, 191, 36, 0.4)', color: '#fbbf24', padding: '6px 10px' }}>
          Saldo disponível: {saldoDisponivel}
        </div>
      </div>
      <div className="actions agendador-actions" style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <button className="btn-import" onClick={() => carregarAgenda()} disabled={loading}>🔄 Atualizar Agenda</button>
        <button className="btn-import" onClick={planejar} disabled={loading}>🗓️ Planejar</button>
        <button className="btn-import" onClick={executarDevidos} disabled={loading}>🚀 Executar Devidos</button>
        <div className="agendador-filtro-dia" style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
          <input
            type="date"
            value={diaFiltro}
            onChange={(e) => setDiaFiltro(e.target.value)}
            style={{ background: '#161b22', border: '1px solid #2d333b', color: '#fff', padding: '6px 10px', borderRadius: 6, minWidth: 160 }}
            disabled={loading}
          />
          <button className="btn-import" onClick={() => carregarAgenda(1)} disabled={loading}>📅 Filtrar Dia</button>
        </div>
      </div>
      {mensagem && <p className="muted" style={{ whiteSpace: 'pre-wrap' }}>{mensagem}</p>}
      <div className="table-like agendador-grid">
        <div className="row header">
          <div className="cell">Data/Hora</div>
          <div className="cell">Campeonato</div>
          <div className="cell">Rodada</div>
          <div className="cell">Tipo</div>
          <div className="cell">Jogos no Grupo</div>
          <div className="cell">Req. Previstas</div>
          <div className="cell">Intervalo (min)</div>
          <div className="cell">Permitido</div>
        </div>
        {agenda.map((a, idx) => {
          // O backend já retorna o horário correto em Manaus (com offset -04:00), não aplicar setZone novamente!
          const dt = DateTime.fromISO(a.dataHora, { setZone: true });
          const dataFmt = dt?.isValid ? dt.toFormat('dd/LL/yyyy') : new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
          }).format(new Date(a.dataHora));
          const horaFmt = dt?.isValid ? dt.toFormat('HH:mm') : new Intl.DateTimeFormat('pt-BR', {
            hour: '2-digit', minute: '2-digit', hour12: false,
          }).format(new Date(a.dataHora));
          return (
            <div
              className="row"
              key={idx}
              style={a.tipo === 'classificacao' ? { background: 'rgba(59, 130, 246, 0.08)' } : {}}
            >
              <div className="cell">{dataFmt} {horaFmt}</div>
              <div className="cell">{campeonatosMapa[Number(a.campeonatoId)] || a.campeonatoId}</div>
              <div className="cell">{a.rodada}</div>
              <div className="cell">{a.tipo === 'classificacao' ? 'Classificação' : 'Placar'}</div>
              <div className="cell">{a.jogosNoGrupo}</div>
              <div className="cell">{a.disparosPrevistos ?? '-'}</div>
              <div className="cell">{a.intervaloMinutos ? a.intervaloMinutos.toFixed(1) : '-'}</div>
              <div className="cell">{a.permitido ? 'Sim' : 'Não'}</div>
            </div>
          );
        })}
        {agenda.length === 0 && !loading && (
          <div className="row"><div className="cell">Sem itens de agenda</div></div>
        )}
      </div>
      {total > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, fontSize: '0.85rem', color: '#9fb0bd' }}>
          <span>Total: {total} items | Página {page} de {totalPages}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              className="ghost" 
              onClick={() => carregarAgenda(page - 1)} 
              disabled={loading || page <= 1}
            >
              ← Anterior
            </button>
            <button 
              className="ghost" 
              onClick={() => carregarAgenda(page + 1)} 
              disabled={loading || page >= totalPages}
            >
              Próxima →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
function ConsultarRodadaBox({ API, authHeader, grupoSelecionado, grupos, campeonatoNome, onDone }) {
  const [rodadaDe, setRodadaDe] = useState('');
  const [rodadaAte, setRodadaAte] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensagemLocal, setMensagemLocal] = useState('');
  const [selectedGrupoId, setSelectedGrupoId] = useState(grupoSelecionado || null);

  useEffect(() => {
    setSelectedGrupoId(grupoSelecionado || null);
  }, [grupoSelecionado]);

  // Lista de campeonatos distintos a partir dos grupos
  const campeonatosDosGrupos = useMemo(() => {
    const setIds = new Set();
    const lista = [];
    grupos.forEach(g => {
      const id = g.campeonatoId || g.campeonato_id;
      if (id && !setIds.has(id)) {
        setIds.add(id);
        lista.push({ id, nome: campeonatoNome(id) });
      }
    });
    return lista;
  }, [grupos, campeonatoNome]);

  const campeonatoId = useMemo(() => {
    const g = grupos.find((x) => (x.grupoId || x.id) === selectedGrupoId);
    return g?.campeonatoId || g?.campeonato_id || null;
  }, [grupos, selectedGrupoId]);

  const handleConsultar = async () => {
    if (!campeonatoId) {
      setMensagemLocal('⚠️ Grupo selecionado não possui campeonato definido.');
      return;
    }
    
    const rodadaDeNum = Number(rodadaDe);
    const rodadaAteNum = Number(rodadaAte);
    
    if (!rodadaDeNum || rodadaDeNum < 1) {
      setMensagemLocal('⚠️ Informe um número válido no campo "Rodada De" (>= 1).');
      return;
    }
    
    if (!rodadaAteNum || rodadaAteNum < 1) {
      setMensagemLocal('⚠️ Informe um número válido no campo "Rodada Até" (>= 1).');
      return;
    }
    
    if (rodadaDeNum > rodadaAteNum) {
      setMensagemLocal('⚠️ O campo "Rodada De" deve ser menor ou igual ao campo "Rodada Até".');
      return;
    }
    
    setLoading(true);
    setMensagemLocal('');
    
    let totalJogosSalvos = 0;
    let rodadasProcessadas = 0;
    let rodadasComErro = [];
    
    try {
      const totalRodadas = rodadaAteNum - rodadaDeNum + 1;
      
      for (let rodada = rodadaDeNum; rodada <= rodadaAteNum; rodada++) {
        setMensagemLocal(`⏳ Processando rodada ${rodada} de ${totalRodadas}... (${rodada - rodadaDeNum + 1}/${totalRodadas})`);
        
        try {
          const url = `${API}/configuracoes/api-futebol/campeonatos/${campeonatoId}/rodadas/${rodada}`;
          const res = await axios.post(url, {}, authHeader);
          
          totalJogosSalvos += res.data.partidas || 0;
          rodadasProcessadas++;
        } catch (err) {
          console.error(`Erro ao processar rodada ${rodada}:`, err);
          const msg = err?.response?.data?.erro || err.message || 'Erro desconhecido';
          rodadasComErro.push({ rodada, erro: msg });
        }
      }
      
      // Mensagem final
      let mensagemFinal = `✅ Processamento concluído!\n`;
      mensagemFinal += `📊 Rodadas processadas: ${rodadasProcessadas}/${totalRodadas}\n`;
      mensagemFinal += `⚽ Total de jogos salvos: ${totalJogosSalvos}\n`;
      mensagemFinal += `🏆 Campeonato ID: ${campeonatoId}`;
      
      if (rodadasComErro.length > 0) {
        mensagemFinal += `\n\n⚠️ Rodadas com erro (${rodadasComErro.length}):\n`;
        rodadasComErro.forEach(({ rodada, erro }) => {
          mensagemFinal += `  • Rodada ${rodada}: ${erro}\n`;
        });
      }
      
      setMensagemLocal(mensagemFinal);
      onDone && onDone();
    } catch (err) {
      console.error('Erro geral ao consultar rodadas:', err);
      setMensagemLocal(`❌ Erro geral: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cfg-form">
      <label>
        Grupo
        <select
          value={selectedGrupoId || ''}
          onChange={(e) => setSelectedGrupoId(Number(e.target.value))}
          disabled={loading}
        >
          <option value="">Selecione um grupo</option>
          {grupos.map(g => (
            <option key={g.grupoId || g.id} value={g.grupoId || g.id}>
              {g.nome} — {campeonatoNome(g.campeonatoId || g.campeonato_id)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Campeonato (dos grupos)
        <select value={campeonatoId || ''} disabled>
          <option value="">Selecione um grupo acima</option>
          {campeonatosDosGrupos.map(c => (
            <option key={c.id} value={c.id}>{c.nome} (ID {c.id})</option>
          ))}
        </select>
      </label>
      <div style={{ display: 'flex', gap: '10px' }}>
        <label style={{ flex: 1 }}>
          Rodada De
          <input
            type="number"
            min={1}
            max={50}
            value={rodadaDe}
            onChange={(e) => setRodadaDe(e.target.value)}
            placeholder="Ex: 1"
            disabled={loading}
          />
        </label>
        <label style={{ flex: 1 }}>
          Rodada Até
          <input
            type="number"
            min={1}
            max={50}
            value={rodadaAte}
            onChange={(e) => setRodadaAte(e.target.value)}
            placeholder="Ex: 10"
            disabled={loading}
          />
        </label>
      </div>
      <button className="btn-import" onClick={handleConsultar} disabled={loading || !rodadaDe || !rodadaAte}>
        {loading ? '⏳ Processando...' : '🔎 Consultar e Salvar'}
      </button>
      {mensagemLocal && <p className="muted" style={{ whiteSpace: 'pre-wrap' }}>{mensagemLocal}</p>}
    </div>
  );
}

function ImportarClassificacaoBox({ API, authHeader, grupoSelecionado, grupos, campeonatoNome }) {
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [selectedGrupoId, setSelectedGrupoId] = useState(grupoSelecionado || null);
  useEffect(() => {
    setSelectedGrupoId(grupoSelecionado || null);
  }, [grupoSelecionado]);

  const handleImportar = async () => {
    if (!selectedGrupoId) {
      setMensagem('⚠️ Selecione um grupo.');
      return;
    }
    setLoading(true);
    setMensagem('');
    try {
      const res = await axios.post(`${API}/configuracoes/api-futebol/classificacao`, { grupoId: selectedGrupoId }, authHeader);
      setMensagem(`✅ ${res.data.mensagem}\n📊 Inseridas: ${res.data.inseridas} | Atualizadas: ${res.data.atualizadas}`);
    } catch (err) {
      console.error('Erro ao importar classificação:', err);
      const msg = err?.response?.data?.erro || err.message || 'Erro ao importar.';
      setMensagem(`❌ ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cfg-form">
      <label>
        Grupo
        <select
          value={selectedGrupoId || ''}
          onChange={(e) => setSelectedGrupoId(Number(e.target.value))}
          disabled={loading}
        >
          <option value="">Selecione um grupo</option>
          {grupos.map(g => (
            <option key={g.grupoId || g.id} value={g.grupoId || g.id}>
              {g.nome} — {campeonatoNome(g.campeonatoId || g.campeonato_id)}
            </option>
          ))}
        </select>
      </label>
      <button className="btn-import" onClick={handleImportar} disabled={loading || !selectedGrupoId}>
        {loading ? '⏳ Importando...' : '🏆 Importar Classificação'}
      </button>
      {mensagem && <p className="muted" style={{ whiteSpace: 'pre-wrap' }}>{mensagem}</p>}
      
      {/* classificação omitida */}
    </div>
  );
}

function LimiteRequisicoesDiaBox({ configuracoes, authHeader, onSalvarSucesso }) {
  const [limite, setLimite] = useState(configuracoes?.limite_requisicoes_dia || 1000);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    if (configuracoes?.limite_requisicoes_dia) {
      setLimite(configuracoes.limite_requisicoes_dia);
    }
  }, [configuracoes]);

  const salvarLimite = async () => {
    if (!limite || limite < 1 || limite > 50000) {
      setMensagem('❌ Limite deve ser entre 1 e 50000.');
      return;
    }

    setLoading(true);
    setMensagem('');
    try {
      const res = await axios.post(
        `${API}/configuracoes/limite-requisicoes-dia`,
        { limite_requisicoes_dia: parseInt(limite, 10) },
        authHeader
      );
      setMensagem(`✅ ${res.data.mensagem}`);
      if (onSalvarSucesso) {
        onSalvarSucesso(res.data.configuracoes);
      }
    } catch (err) {
      console.error('Erro ao salvar limite:', err);
      const msg = err?.response?.data?.erro || 'Erro ao salvar limite.';
      setMensagem(`❌ ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const recarregar = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/configuracoes`, authHeader);
      setLimite(res.data?.limite_requisicoes_dia || 1000);
      setMensagem('✅ Limite recarregado do servidor.');
    } catch (err) {
      setMensagem('❌ Erro ao recarregar limite.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cfg-form">
      <label>
        Limite de Requisições por Dia (Plano API-Futebol)
        <input
          type="number"
          value={limite}
          onChange={(e) => setLimite(Math.max(1, Math.min(999, parseInt(e.target.value, 10))))}
          disabled={loading}
          min="1"
          max="999"
          step="1"
        />
      </label>
      <p className="muted" style={{ fontSize: '0.85rem', marginTop: '-8px' }}>
        Quantidade máxima de requisições que podem ser feitas à API-Futebol por dia.
      </p>
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <button className="btn-import" onClick={salvarLimite} disabled={loading}>
          {loading ? '⏳ Salvando...' : '💾 Salvar Limite'}
        </button>
        <button className="ghost" onClick={recarregar} disabled={loading}>
          ↻ Recarregar
        </button>
      </div>
      {mensagem && <p className="muted" style={{ whiteSpace: 'pre-wrap', marginTop: '12px' }}>{mensagem}</p>}
    </div>
  );
}
