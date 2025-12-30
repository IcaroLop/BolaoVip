import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import storage from '../utils/storage';
import API_BASE_URL from '../config';
import './RankingPage.css';
import PalpitesModal from '../components/PalpitesModal';

const API = API_BASE_URL;

const RankingPage = () => {
  const [rankingRodada, setRankingRodada] = useState([]);
  const [premiacoesRodada, setPremiacoesRodada] = useState([]);
  const [rankingGeral, setRankingGeral] = useState([]);
  const [rodadaSelecionada, setRodadaSelecionada] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const [palpitesModal, setPalpitesModal] = useState({ aberto: false, nome: '', dados: [] });
  const [grupoSelecionado, setGrupoSelecionado] = useState(null);
  const [campeonatoId, setCampeonatoId] = useState(null);
  const [contextKey, setContextKey] = useState(0);
  const [rodadaVigenteMax, setRodadaVigenteMax] = useState(null);
  const [statusRodada, setStatusRodada] = useState({ 
    rodadaFinalizada: false, 
    pagamentosGerados: false,
    ultimoStatus: 'N/A',
    pagamentosGeradosEm: null
  });
  const [usuarioPerfis, setUsuarioPerfis] = useState([]);
  const [carregandoPagamentos, setCarregandoPagamentos] = useState(false);
  const [showDebug, setShowDebug] = useState(true);
  const [pageRodada, setPageRodada] = useState(0);
  const [pageGeral, setPageGeral] = useState(0);
  const PAGE_SIZE = 20;

  const token = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const tParam = params.get('token');
    if (tParam) {
      storage.setItem('token', tParam);
      return tParam;
    }
    const tStorage = storage.getItem('token');
    if (tStorage) return tStorage;
    
    if (process.env.REACT_APP_DEV_TOKEN && process.env.NODE_ENV !== 'production') {
      return process.env.REACT_APP_DEV_TOKEN;
    }
    return null;
  }, []);

  const authHeader = useMemo(() => (token ? { headers: { Authorization: `Bearer ${token}` } } : {}), [token]);

  // Carregar dados do usuário autenticado (perfis)
  useEffect(() => {
    if (!token) {
      console.log('[RankingPage] Sem token, perfis não carregados');
      return;
    }
    
    const carregarUsuario = async () => {
      try {
        console.log('[RankingPage] Carregando dados do usuário...');
        console.log('[RankingPage] URL:', `${API}/usuarios/me`);
        console.log('[RankingPage] Headers:', authHeader);
        const res = await axios.get(`${API}/usuarios/me`, authHeader);
        console.log('[RankingPage] Resposta completa:', res.data);
        const perfis = res.data.perfis || [];
        console.log('[RankingPage] Perfis array:', perfis);
        const nomePerfis = perfis.map(p => p.nome);
        console.log('[RankingPage] Nomes dos perfis:', nomePerfis);
        console.log('[RankingPage] Tem Admin:', nomePerfis.includes('Administrador'));
        console.log('[RankingPage] Tem Financeiro:', nomePerfis.includes('Financeiro'));
        setUsuarioPerfis(nomePerfis);
      } catch (err) {
        console.error('[RankingPage] Erro ao carregar dados do usuário:', err);
        console.error('[RankingPage] Error message:', err.message);
        console.error('[RankingPage] Response status:', err.response?.status);
        console.error('[RankingPage] Response data:', err.response?.data);
        setUsuarioPerfis([]);
      }
    };
    
    carregarUsuario();
  }, [token, authHeader]);

  // **CRÍTICO**: Sincroniza grupo do Header IMEDIATAMENTE ao montar
  useEffect(() => {
    const timestamp = new Date().toISOString();
    const gidStr = storage.getItem('grupoId');
    const gidNum = gidStr ? Number(gidStr) : null;
    console.log(`[RankingPage ${timestamp}] Mount - Sincronizando grupoId do storage:`, gidNum);
    setGrupoSelecionado(gidNum);
  }, []);

  // Monitora mudanças no grupo após o mount inicial
  useEffect(() => {
    const cleanupStorageEvent = storage.onStorageChange(() => {
      const timestamp = new Date().toISOString();
      const gid = storage.getItem('grupoId');
      const gidNum = gid ? Number(gid) : null;
      console.log(`[RankingPage ${timestamp}] Storage event - grupoId mudou para:`, gidNum);
      setGrupoSelecionado(gidNum);
      setContextKey((k) => k + 1);
    });

    const cleanupWatcher = storage.createStorageWatcher('grupoId', (newValue) => {
      const timestamp = new Date().toISOString();
      const gidNum = newValue ? Number(newValue) : null;
      if (gidNum !== grupoSelecionado) {
        console.log(`[RankingPage ${timestamp}] Polling - grupoId mudou de ${grupoSelecionado} para ${gidNum}`);
        setGrupoSelecionado(gidNum);
        setContextKey((k) => k + 1);
      }
    }, 250);

    return () => {
      cleanupStorageEvent();
      cleanupWatcher();
    };
  }, [grupoSelecionado]);

  // Reset ao mudar grupo e busca campeonato do grupo selecionado
  useEffect(() => {
    if (!grupoSelecionado || !token) return;
    
    const timestamp = new Date().toISOString();
    console.log(`[RankingPage ${timestamp}] 🔄 Grupo mudou para: ${grupoSelecionado}, contextKey: ${contextKey}`);

    async function carregarCampeonatoDoGrupo() {
      try {
        const res = await axios.get(`${API}/grupos/${grupoSelecionado}/contexto`, authHeader);
        const campId = res.data.campeonatoId || res.data.campeonato_id || null;
        setCampeonatoId(campId);
        console.log(`[RankingPage ${timestamp}] ✅ Campeonato carregado para grupo ${grupoSelecionado}: ${campId}`);
      } catch (err) {
        console.error(`[RankingPage ${timestamp}] ❌ Erro ao carregar campeonato do grupo:`, err);
        setCampeonatoId(null);
      }
    }

    // Reset estado ao trocar o grupo para evitar dados defasados
    setRodadaSelecionada(null);
    setRankingRodada([]);
    setRankingGeral([]);
    setPremiacoesRodada([]);
    setMensagem('');
    setPageRodada(0);
    setPageGeral(0);

    carregarCampeonatoDoGrupo();
  }, [grupoSelecionado, token, authHeader]);

  useEffect(() => {
    async function buscarRodadaVigente() {
      const myKey = contextKey;
      const timestamp = new Date().toISOString();
      
      try {
        // Se não houver grupo ou campeonato definido, não chama a API
        if (!grupoSelecionado && !campeonatoId) {
          console.log(`[RankingPage ${timestamp}] ⚠️ Sem grupo/campeonato - não buscando rodada vigente`);
          if (myKey !== contextKey) return;
          setRodadaSelecionada(null);
          setRankingRodada([]);
          setMensagem('Selecione um grupo no topo para ver o ranking.');
          return;
        }

        const params = new URLSearchParams();
        if (grupoSelecionado) params.append('grupoId', grupoSelecionado);
        if (campeonatoId) params.append('campeonatoId', campeonatoId);

        console.log(`[RankingPage ${timestamp}] 🔍 Buscando rodada vigente - grupoId: ${grupoSelecionado}, campeonatoId: ${campeonatoId}`);
        const res = await axios.get(`${API}/resultados/rodada-vigente?${params.toString()}`, authHeader);
        const rodadaVigente = res.data?.rodada ?? res.data?.rodada_vigente ?? null;
        
        if (myKey !== contextKey) return;
        setRodadaSelecionada(rodadaVigente);
        setRodadaVigenteMax(rodadaVigente);
        
        if (!rodadaVigente) {
          setRankingRodada([]);
          setMensagem('Nenhuma rodada disponível para este grupo.');
        } else {
          setMensagem('');
        }
      } catch (err) {
        console.error('Erro ao buscar rodada vigente:', err);
        if (myKey !== contextKey) return;
        setRodadaSelecionada(null);
        setRankingRodada([]);
        setMensagem('Erro ao buscar rodada vigente');
      }
    }

    buscarRodadaVigente();
  }, [contextKey, grupoSelecionado, campeonatoId, authHeader]);

  const buscarRankingGeral = useCallback(async () => {
    try {
      if (!grupoSelecionado && !campeonatoId) {
        setRankingGeral([]);
        return;
      }
      if (!rodadaSelecionada) {
        setRankingGeral([]);
        return;
      }

      const params = new URLSearchParams();
      if (grupoSelecionado) params.append('grupoId', grupoSelecionado);
      if (campeonatoId) params.append('campeonatoId', campeonatoId);
      params.append('rodadaFinal', rodadaSelecionada);
      params.append('limit', PAGE_SIZE);
      params.append('offset', pageGeral * PAGE_SIZE);

      const res = await axios.get(`${API}/ranking/geral?${params.toString()}`, authHeader);
      setRankingGeral(res.data);
    } catch (err) {
      console.error(err);
      setMensagem('Erro ao carregar ranking geral');
    }
  }, [grupoSelecionado, campeonatoId, authHeader, rodadaSelecionada, pageGeral]);

  const buscarRankingRodada = useCallback(async (rodada) => {
    try {
      if (!grupoSelecionado && !campeonatoId) {
        setRankingRodada([]);
        return;
      }

      // Se paginação retrocedeu além do total retornado, normalizar para 0
      if (pageRodada > 0 && rankingRodada.length === 0) {
        setPageRodada(0);
        return;
      }

      const params = new URLSearchParams();
      if (grupoSelecionado) params.append('grupoId', grupoSelecionado);
      if (campeonatoId) params.append('campeonatoId', campeonatoId);
      params.append('limit', PAGE_SIZE);
      params.append('offset', pageRodada * PAGE_SIZE);

      const res = await axios.get(`${API}/ranking/rodada/${rodada}?${params.toString()}`, authHeader);
      setRankingRodada(res.data);
    } catch (err) {
      console.error(err);
      setMensagem('Erro ao carregar ranking da rodada');
    }
  }, [grupoSelecionado, campeonatoId, authHeader, pageRodada, rankingRodada.length]);

  const buscarPremiacoesRodada = useCallback(async (rodada) => {
    try {
      const params = new URLSearchParams();
      if (grupoSelecionado) params.append('grupoId', grupoSelecionado);
      if (campeonatoId) params.append('campeonatoId', campeonatoId);

      // Usar novo endpoint com detalhes (RECEBE/PAGA)
      const res = await axios.get(`${API}/premiacoes/rodada/${rodada}/detalhes?${params.toString()}`, authHeader);
      setPremiacoesRodada(res.data);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        // Premiações ainda não cadastradas - comportamento esperado
        setPremiacoesRodada([]);
      } else {
        console.error(err);
      }
    }
  }, [grupoSelecionado, campeonatoId, authHeader]);

  const buscarStatusRodada = useCallback(async (rodada) => {
    try {
      const params = new URLSearchParams();
      if (grupoSelecionado) params.append('grupoId', grupoSelecionado);
      if (campeonatoId) params.append('campeonatoId', campeonatoId);
      
      console.log(`[RankingPage] Buscando status da rodada ${rodada}...`);
      // GET /ranking/rodada/:rodada/status é público, não precisa de token
      const res = await axios.get(`${API}/ranking/rodada/${rodada}/status?${params.toString()}`);
      console.log('[RankingPage] Status da rodada carregado:', res.data);
      console.log('[RankingPage] rodadaFinalizada:', res.data.rodadaFinalizada, typeof res.data.rodadaFinalizada);
      console.log('[RankingPage] pagamentosGerados:', res.data.pagamentosGerados, typeof res.data.pagamentosGerados);
      
      const statusObj = {
        rodadaFinalizada: Boolean(res.data.rodadaFinalizada),
        pagamentosGerados: Boolean(res.data.pagamentosGerados),
        ultimoStatus: res.data.ultimoStatus || 'N/A',
        pagamentosGeradosEm: res.data.pagamentosGeradosEm || null
      };
      
      console.log('[RankingPage] Status final após conversão:', statusObj);
      setStatusRodada(statusObj);
    } catch (err) {
      console.error('[RankingPage] Erro ao buscar status da rodada:', err);
      console.error('[RankingPage] Erro details:', err.response?.data);
      setStatusRodada({ rodadaFinalizada: false, pagamentosGerados: false, ultimoStatus: 'erro' });
    }
  }, [grupoSelecionado, campeonatoId]);

  useEffect(() => {
    if (rodadaSelecionada) {
      // Não permitir navegar além da rodada vigente máxima conhecida
      if (rodadaVigenteMax && rodadaSelecionada > rodadaVigenteMax) {
        setRodadaSelecionada(rodadaVigenteMax);
        setMensagem('Você só pode avançar até a rodada vigente. Aguarde o encerramento para continuar.');
        return;
      }
      setMensagem('');
      buscarRankingRodada(rodadaSelecionada);
      buscarPremiacoesRodada(rodadaSelecionada);
      buscarRankingGeral();
      buscarStatusRodada(rodadaSelecionada);
    }
  }, [rodadaSelecionada, grupoSelecionado, campeonatoId, buscarRankingRodada, buscarPremiacoesRodada, buscarRankingGeral, buscarStatusRodada, rodadaVigenteMax]);

  // Atualização automática a cada 30s (ranking da rodada + geral + status)
  useEffect(() => {
    if (!rodadaSelecionada) return;
    const intervalId = setInterval(() => {
      buscarRankingRodada(rodadaSelecionada);
      buscarPremiacoesRodada(rodadaSelecionada);
      buscarRankingGeral();
      buscarStatusRodada(rodadaSelecionada);
    }, 30000);
    return () => clearInterval(intervalId);
  }, [rodadaSelecionada, buscarRankingRodada, buscarPremiacoesRodada, buscarRankingGeral, buscarStatusRodada]);

  const gerarPagamentosRodada = async () => {
    if (!rodadaSelecionada) {
      setMensagem('⚠️ Selecione uma rodada');
      return;
    }

    setCarregandoPagamentos(true);
    setMensagem('');

    try {
      const params = new URLSearchParams();
      if (grupoSelecionado) params.append('grupoId', grupoSelecionado);
      if (campeonatoId) params.append('campeonatoId', campeonatoId);

      console.log('[RankingPage] Gerando pagamentos para rodada:', rodadaSelecionada);
      console.log('[RankingPage] Token:', token ? 'Sim' : 'Não');
      console.log('[RankingPage] authHeader:', authHeader);
      
      const res = await axios.post(
        `${API}/ranking/rodada/${rodadaSelecionada}/gerar-pagamentos?${params.toString()}`,
        {},
        authHeader
      );

      console.log('[RankingPage] Resposta de gerar pagamentos:', res.data);
      setMensagem(`✅ ${res.data.mensagem}`);
      // Recarregar status da rodada
      await buscarStatusRodada(rodadaSelecionada);
    } catch (err) {
      const errorMsg = err.response?.data?.erro || err.message;
      console.error('[RankingPage] Erro ao gerar pagamentos:', err);
      console.error('[RankingPage] Erro response:', err.response?.data);
      setMensagem(`❌ Erro: ${errorMsg}`);
    } finally {
      setCarregandoPagamentos(false);
    }
  };

  const buscarPalpitesUsuario = async (id_usuario, nome) => {
    try {
      const params = new URLSearchParams();
      if (grupoSelecionado) params.append('grupoId', grupoSelecionado);
      if (campeonatoId) params.append('campeonatoId', campeonatoId);

      const res = await axios.get(`${API}/palpites/rodada/${rodadaSelecionada}/usuario/${id_usuario}?${params.toString()}`, authHeader);
      setPalpitesModal({
        aberto: true,
        nome,
        dados: res.data
      });
    } catch (err) {
      console.error(`Erro ao buscar palpites do usuário ${id_usuario}:`, err);
    }
  };


  const premiacaoPorPosicao = (posicao) => {
    // Buscar prêmio específico para a posição
    let premio = premiacoesRodada.find(p => p.posicao === posicao);
    
    // Se não encontrou prêmio específico, buscar "Demais participantes" (tipo "outro")
    if (!premio) {
      premio = premiacoesRodada.find(p => p.tipo_premio === 'Demais participantes');
    }
    
    if (!premio) return { tipo: '-', acao: '-', valor: '-', status: '-', emoji: '' };
    
    let emoji = '';
    if (premio.tipo_premio === 'Campeão') emoji = '🏆';
    else if (premio.tipo_premio === 'Vice') emoji = '🥈';
    else if (premio.tipo_premio === 'Lanterna') emoji = '🔦';
    
    return {
      tipo: premio.tipo_premio || '-',
      acao: premio.acao || '-',
      valor: `R$ ${Number(premio.valor_premio).toFixed(2)}`,
      status: premio.status_pagamento,
      emoji
    };
  };

  if (rodadaSelecionada === null) {
    return (
      <div className="ranking-container">
        <h2 className="ranking-title">Carregando rodada vigente...</h2>
      </div>
    );
  }

  return (
    <div className="ranking-container">
      {mensagem && (
        <div className="info-banner bg-yellow-100 text-yellow-800 border border-yellow-300 px-3 py-2 rounded mb-3">
          {mensagem}
        </div>
      )}
      <div className="ranking-nav-bar">
        <button
          onClick={() => setRodadaSelecionada(r => Math.max(1, r - 1))}
          className="ranking-nav-btn nav-prev"
          disabled={rodadaSelecionada <= 1}
        >
          &lt;
        </button>
        <button
          onClick={() => setRodadaSelecionada(r => {
            const limite = rodadaVigenteMax ?? 38;
            return Math.min(limite, r + 1);
          })}
          className="ranking-nav-btn nav-next"
          disabled={rodadaVigenteMax ? rodadaSelecionada >= rodadaVigenteMax : rodadaSelecionada >= 38}
        >
          &gt;
        </button>
      </div>

      <h2 className="ranking-title">🏆 Ranking da Rodada {rodadaSelecionada}</h2>

      {/* DEBUG INFO - Apenas em desenvolvimento */}
      {(() => {
        const podeGerar = statusRodada.rodadaFinalizada && !statusRodada.pagamentosGerados &&
          (usuarioPerfis.includes('Administrador') || usuarioPerfis.includes('Financeiro'));
        return process.env.NODE_ENV === 'development' && showDebug && (
          <div className={`debug-banner ${podeGerar ? 'is-ok' : 'is-warn'}`}>
            <div className="debug-left">
              <span className="debug-title">🔍 Debug</span>
              <span className="debug-item">Rodada: {String(statusRodada.rodadaFinalizada)}</span>
              <span className="debug-item">Pagtos: {String(statusRodada.pagamentosGerados)}</span>
              <span className="debug-item debug-perfis" title={usuarioPerfis.join(', ') || 'nenhum'}>
                Perfis: {usuarioPerfis.join(', ') || 'nenhum'}
              </span>
              <span className="debug-item">Botão: {podeGerar ? '✅ visível' : '❌ oculto'}</span>
            </div>
            <button className="debug-close" onClick={() => setShowDebug(false)} aria-label="Fechar debug">×</button>
          </div>
        );
      })()}

      {/* Legendas compactas (sempre visíveis) */}
      <div className="ranking-legends" aria-label="Legendas do ranking">
        <span className="legend-badge badge-recebe" title="Quem recebe premiação">RECEBE</span>
        <span className="legend-badge badge-paga" title="Quem paga taxa de participação">PAGA</span>
        <span className="legend-badge badge-pendente" title="Pagamento ainda pendente">PENDENTE</span>
      </div>

      {/* Botão Gerar Pagamentos - Visível apenas para Admin/Financeiro quando rodada finalizada */}
      {statusRodada.rodadaFinalizada && !statusRodada.pagamentosGerados && 
       (usuarioPerfis.includes('Administrador') || usuarioPerfis.includes('Financeiro')) && (
        <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <button
            onClick={gerarPagamentosRodada}
            disabled={carregandoPagamentos}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: carregandoPagamentos ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold',
              opacity: carregandoPagamentos ? 0.6 : 1
            }}
          >
            {carregandoPagamentos ? '⏳ Gerando...' : '💳 Gerar Pagamentos'}
          </button>
          <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
            {statusRodada.rodadaFinalizada ? '✅ Rodada finalizada - Pronto para gerar pagamentos' : ''}
          </p>
        </div>
      )}

      <table className="ranking-table" key={`ranking-${rodadaSelecionada}`}>
        <thead>
          <tr>
            <th>Posição</th>
            <th>Nome</th>
            <th>Pontos</th>
            <th>Premiação</th>
            <th>Ação</th>
            <th>Valor</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rankingRodada.map((item, index) => {
            const posicao = item.posicao || (pageRodada * PAGE_SIZE + index + 1);
            const premio = premiacaoPorPosicao(posicao);
            return (
              <tr key={index}>
                <td>
                  {posicao}º {premio.emoji && <span className="emoji">{premio.emoji}</span>}
                </td>
                <td className="nome-coluna">
                  <button
                    className="nome-link"
                    onClick={() => buscarPalpitesUsuario(item.id_usuario, item.nome_apostador)}
                  >
                    {(() => {
                      const partes = String(item.nome_apostador || '').trim().split(/\s+/);
                      const primeiro = partes[0] || '';
                      const restante = partes.slice(1).join(' ');
                      return (
                        <span>
                          {primeiro}
                          {restante && (<><br />{restante}</>) }
                        </span>
                      );
                    })()}
                  </button>
                </td>

                <td>{Number(item.pontos_totais || 0).toFixed(2)}</td>
                <td>{premio.tipo}</td>
                <td className={premio.acao === 'RECEBE' ? 'acao-recebe' : 'acao-paga'}>
                  {premio.acao || '-'}
                </td>
                <td data-status={premio.status}>{premio.valor}</td>
                <td>{premio.status}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Paginação Ranking da Rodada */}
      <div className="ranking-pagination">
        <button
          onClick={() => setPageRodada(p => Math.max(0, p - 1))}
          disabled={pageRodada === 0}
          className="ranking-nav-btn nav-prev"
        >
          ◀ Anterior
        </button>
        <span className="pagination-info">Página {pageRodada + 1}</span>
        <button
          onClick={() => setPageRodada(p => (rankingRodada.length < PAGE_SIZE ? p : p + 1))}
          disabled={rankingRodada.length < PAGE_SIZE}
          className="ranking-nav-btn nav-next"
        >
          Próxima ▶
        </button>
      </div>

      <h2 className="ranking-title" style={{ marginTop: '2rem' }}>📊 Ranking Geral</h2>

      <ul className="ranking-list">
        {rankingGeral.map((item, index) => (
          <li key={item.id_usuario} className="ranking-item">
            <span>{pageGeral * PAGE_SIZE + index + 1}º</span>
            <strong>{item.nome}</strong>
            <span>{Number(item.pontos || 0).toFixed(2)} pts</span>
          </li>
        ))}
      </ul>

      {/* Paginação Ranking Geral */}
      <div className="ranking-pagination">
        <button
          onClick={() => setPageGeral(p => Math.max(0, p - 1))}
          disabled={pageGeral === 0}
          className="ranking-nav-btn nav-prev"
        >
          ◀ Anterior
        </button>
        <span className="pagination-info">Página {pageGeral + 1}</span>
        <button
          onClick={() => setPageGeral(p => (rankingGeral.length < PAGE_SIZE ? p : p + 1))}
          disabled={rankingGeral.length < PAGE_SIZE}
          className="ranking-nav-btn nav-next"
        >
          Próxima ▶
        </button>
      </div>

      {mensagem && <p className="ranking-message">{mensagem}</p>}
      <PalpitesModal
        aberto={palpitesModal.aberto}
        nome={palpitesModal.nome}
        dados={palpitesModal.dados}
        onClose={() => setPalpitesModal({ aberto: false, nome: '', dados: [] })}
      />

    </div> 
  );
};

export default RankingPage;

