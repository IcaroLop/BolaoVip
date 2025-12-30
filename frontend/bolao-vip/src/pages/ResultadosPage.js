import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';
import './ResultadosPage.css';
import '../styles/RodadaNav.css';

const API = API_BASE_URL;

const ResultadosPage = () => {
  const [rodada, setRodada] = useState(null);
  const [jogos, setJogos] = useState([]);
  const [grupoSelecionado, setGrupoSelecionado] = useState(null);
  const [campeonatoId, setCampeonatoId] = useState(null);

  const token = useMemo(() => localStorage.getItem('token'), []);
  const authHeader = useMemo(() => (token ? { headers: { Authorization: `Bearer ${token}` } } : {}), [token]);

  // Sincroniza grupo selecionado do Header (localStorage)
  useEffect(() => {
    const grupoIdStorage = localStorage.getItem('grupoId');
    if (grupoIdStorage) {
      setGrupoSelecionado(Number(grupoIdStorage));
    }

    const handleStorageChange = () => {
      const gid = localStorage.getItem('grupoId');
      setGrupoSelecionado(gid ? Number(gid) : null);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Busca campeonato do grupo selecionado
  useEffect(() => {
    if (!grupoSelecionado || !token) return;

    async function carregarCampeonatoDoGrupo() {
      try {
        // Endpoint correto para obter contexto do grupo (inclui campeonato)
        const res = await axios.get(`${API}/grupos/${grupoSelecionado}/contexto`, authHeader);
        setCampeonatoId(res.data.campeonatoId || res.data.campeonato_id || null);
      } catch (err) {
        console.error('Erro ao carregar campeonato do grupo:', err);
        setCampeonatoId(null);
      }
    }

    carregarCampeonatoDoGrupo();
  }, [grupoSelecionado, token, authHeader]);

  // Busca rodada vigente considerando campeonato/grupo
  useEffect(() => {
    if (!campeonatoId && !grupoSelecionado) return;

    async function buscarRodadaVigente() {
      try {
        const params = new URLSearchParams();
        if (grupoSelecionado) params.append('grupoId', grupoSelecionado);
        if (campeonatoId) params.append('campeonatoId', campeonatoId);

        const res = await axios.get(`${API}/resultados/rodada-vigente?${params.toString()}`);
        setRodada(res.data.rodada || null);
        setJogos(res.data.jogos || []);
      } catch (err) {
        console.error('Erro ao buscar rodada vigente:', err);
        setRodada(null);
      }
    }

    buscarRodadaVigente();
  }, [campeonatoId, grupoSelecionado]);

  // Busca resultados quando a rodada muda
  useEffect(() => {
    if (rodada === null) return;

    async function buscarResultados() {
      try {
        const params = new URLSearchParams();
        if (grupoSelecionado) params.append('grupoId', grupoSelecionado);
        if (campeonatoId) params.append('campeonatoId', campeonatoId);

        const res = await axios.get(`${API}/resultados/rodada/${rodada}?${params.toString()}`);
        setJogos(res.data.jogos || []);
      } catch (err) {
        console.error('Erro ao buscar resultados:', err);
      }
    }

    buscarResultados();
    const interval = setInterval(buscarResultados, 10000);
    return () => clearInterval(interval);
  }, [rodada, grupoSelecionado, campeonatoId]);

  const formatarDataHora = (data) => {
    const dt = new Date(data);
    return `${dt.toLocaleDateString()} - ${dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const calcularContagemRegressiva = (data) => {
    const agora = new Date();
    const inicio = new Date(data);
    const diff = inicio - agora;

    if (diff <= 0) return null;

    const horas = Math.floor(diff / (1000 * 60 * 60));
    const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const segundos = Math.floor((diff % (1000 * 60)) / 1000);

    return `${horas}h ${minutos}m ${segundos}s`;
  };

  if (rodada === null) {
    return <div className="resultados-container"><p>Carregando rodada vigente...</p></div>;
  }

  return (
    <div className="resultados-container">
      <div className="rodada-nav-bar">
        <button
          className="rodada-nav-btn rodada-nav-prev"
          disabled={!rodada || rodada <= 1}
          onClick={() => setRodada(r => Math.max(1, (r || 1) - 1))}
        >
          &lt;
        </button>
        <button
          className="rodada-nav-btn rodada-nav-next"
          onClick={() => setRodada(r => (r || 1) + 1)}
        >
          &gt;
        </button>
      </div>

      <h2 className="title">Resultados - Rodada {rodada}</h2>

      {jogos.map(jogo => {
        const status = jogo.status ? jogo.status.toLowerCase() : 'indefinido';
        const emAndamento = status === 'andamento';
        const finalizado = status === 'finalizado' || status === 'concluído';
        const agendado = status === 'agendado';
        const contagem = calcularContagemRegressiva(jogo.data);

        return (
          <div
            key={jogo.partida_id}
            className={`card ${emAndamento ? 'holograma' : ''} ${finalizado ? 'finalizado' : ''} ${agendado ? 'agendado' : ''}`}
          >
            <div className="info">
              <div>{formatarDataHora(jogo.data)}</div>
              <div className="estadio">Estádio: {jogo.estadio}</div>
              <div className={`status ${status.replace(/\s/g, '-')}`}>
                Status: {status}
              </div>
              {contagem && <div className="contagem">Começa em: {contagem}</div>}
            </div>

            <div className="times">
              <div className="time">
                <img
                  src={jogo.escudo_mandante || '/assets/escudo-placeholder.svg'}
                  className="escudo"
                  alt="mandante"
                  width={48}
                  height={48}
                  onError={(e) => { e.currentTarget.src = '/assets/escudo-placeholder.svg'; }}
                />
                <span className="team-name">{jogo.time_mandante}</span>
              </div>

              <div className="placar">
                {typeof jogo.placar_mandante === 'number' && typeof jogo.placar_visitante === 'number'
                  ? `${jogo.placar_mandante} x ${jogo.placar_visitante}`
                  : 'x'}
              </div>

              <div className="time">
                <img
                  src={jogo.escudo_visitante || '/assets/escudo-placeholder.svg'}
                  className="escudo"
                  alt="visitante"
                  width={48}
                  height={48}
                  onError={(e) => { e.currentTarget.src = '/assets/escudo-placeholder.svg'; }}
                />
                <span className="team-name">{jogo.time_visitante}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ResultadosPage;

