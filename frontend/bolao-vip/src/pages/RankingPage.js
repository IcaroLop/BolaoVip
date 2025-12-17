import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import storage from '../utils/storage';
import './RankingPage.css';
import PalpitesModal from '../components/PalpitesModal';

const API = 'http://192.168.56.127:3001';

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

      const params = new URLSearchParams();
      if (grupoSelecionado) params.append('grupoId', grupoSelecionado);
      if (campeonatoId) params.append('campeonatoId', campeonatoId);

      const res = await axios.get(`${API}/ranking/geral?${params.toString()}`, authHeader);
      setRankingGeral(res.data);
    } catch (err) {
      console.error(err);
      setMensagem('Erro ao carregar ranking geral');
    }
  }, [grupoSelecionado, campeonatoId, authHeader]);

  const buscarRankingRodada = useCallback(async (rodada) => {
    try {
      if (!grupoSelecionado && !campeonatoId) {
        setRankingRodada([]);
        return;
      }

      const params = new URLSearchParams();
      if (grupoSelecionado) params.append('grupoId', grupoSelecionado);
      if (campeonatoId) params.append('campeonatoId', campeonatoId);

      const res = await axios.get(`${API}/ranking/rodada/${rodada}?${params.toString()}`, authHeader);
      setRankingRodada(res.data);
    } catch (err) {
      console.error(err);
      setMensagem('Erro ao carregar ranking da rodada');
    }
  }, [grupoSelecionado, campeonatoId, authHeader]);

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
    }
  }, [rodadaSelecionada, grupoSelecionado, campeonatoId, buscarRankingRodada, buscarPremiacoesRodada, buscarRankingGeral, rodadaVigenteMax]);

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
      <h2 className="ranking-title">🏆 Ranking da Rodada {rodadaSelecionada}</h2>

      <div className="ranking-nav">
        <button
          onClick={() => setRodadaSelecionada(r => Math.max(1, r - 1))}
          className="ranking-nav-btn"
          disabled={rodadaSelecionada <= 1}
        >
          ⬅
        </button>
        <button
          onClick={() => setRodadaSelecionada(r => {
            const limite = rodadaVigenteMax ?? 38;
            return Math.min(limite, r + 1);
          })}
          className="ranking-nav-btn"
          disabled={rodadaVigenteMax ? rodadaSelecionada >= rodadaVigenteMax : rodadaSelecionada >= 38}
        >
          ➡
        </button>
      </div>

      <table className="ranking-table">
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
            const posicao = index + 1;
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
                <td>{premio.valor}</td>
                <td>{premio.status}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2 className="ranking-title" style={{ marginTop: '2rem' }}>📊 Ranking Geral</h2>

      <ul className="ranking-list">
        {rankingGeral.map((item, index) => (
          <li key={item.id_usuario} className="ranking-item">
            <span>{index + 1}º</span>
            <strong>{item.nome}</strong>
            <span>{Number(item.pontos || 0).toFixed(2)} pts</span>
          </li>
        ))}
      </ul>

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

