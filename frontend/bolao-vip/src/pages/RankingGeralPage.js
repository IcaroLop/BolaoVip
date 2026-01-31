// src/pages/RankingGeralPage.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';
import storage from '../utils/storage';
import './RankingGeralPage.css';

const RankingGeralPage = () => {
  const [ranking, setRanking] = useState([]);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [campeoesResumo, setCampeoesResumo] = useState([]);
  const [lanternasResumo, setLanternasResumo] = useState([]);
  const [estadisticas, setEstatisticas] = useState({
    placarExato: [],
    vitorias: [],
    gols: [],
    wo: [],
    zeros: []
  });

  const token = useMemo(() => storage.getItem('token') || localStorage.getItem('token'), []);
  const authHeader = useMemo(() => (token ? { headers: { Authorization: `Bearer ${token}` } } : {}), [token]);

  const fetchRanking = useCallback(async () => {
      try {
        setCarregando(true);
        setErro('');

        const grupoIdStr = storage.getItem('grupoId') || localStorage.getItem('grupoId');
        const grupoId = grupoIdStr ? Number(grupoIdStr) : null;
        console.log('[RankingGeral] fetchRanking - grupoIdStr:', grupoIdStr, '| grupoId:', grupoId);
        
        if (!grupoId) {
          setErro('Selecione um grupo no topo para ver o ranking geral.');
          setRanking([]);
          setCarregando(false);
          return;
        }

        // Descobrir campeonato do grupo
        let campeonatoId = null;
        try {
          const ctxRes = await axios.get(`${API_BASE_URL}/grupos/${grupoId}/contexto`, authHeader);
          campeonatoId = ctxRes.data.campeonatoId || ctxRes.data.campeonato_id || null;
        } catch (err) {
          console.error('[RankingGeral] Erro ao obter contexto do grupo:', err?.response?.data || err.message);
        }

        // Rodada vigente usada como rodadaFinal
        let rodadaFinal = 1;
        try {
          const params = new URLSearchParams();
          params.append('grupoId', grupoId);
          if (campeonatoId) params.append('campeonatoId', campeonatoId);
          const rvRes = await axios.get(`${API_BASE_URL}/resultados/rodada-vigente?${params.toString()}`, authHeader);
          rodadaFinal = rvRes.data?.rodada ?? rvRes.data?.rodada_vigente ?? 1;
        } catch (err) {
          console.error('[RankingGeral] Erro ao obter rodada vigente:', err?.response?.data || err.message);
        }

        const params = new URLSearchParams();
        params.append('grupoId', grupoId);
        params.append('rodadaFinal', rodadaFinal);
        if (campeonatoId) params.append('campeonatoId', campeonatoId);

        console.log('[RankingGeral] Chamando endpoints com params:', params.toString());

        // Buscar dados em paralelo
        const [res, resumoRes, statsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/ranking/geral?${params.toString()}`, authHeader),
          axios.get(`${API_BASE_URL}/ranking/geral/resumo-posicoes?${params.toString()}`, authHeader),
          axios.get(`${API_BASE_URL}/ranking/geral/estatisticas?${params.toString()}`, authHeader).catch(err => {
            console.warn('[RankingGeral] Erro ao obter estatísticas:', err?.response?.data || err.message);
            return { data: { placarExato: [], vitorias: [], gols: [], wo: [], zeros: [] } };
          })
        ]);

        console.log('[RankingGeral] Respostas recebidas:', {
          ranking: res.data?.length || 0,
          resumo: resumoRes.data,
          stats: {
            placarExato: statsRes.data?.placarExato?.length || 0,
            vitorias: statsRes.data?.vitorias?.length || 0,
            gols: statsRes.data?.gols?.length || 0,
            wo: statsRes.data?.wo?.length || 0,
            zeros: statsRes.data?.zeros?.length || 0
          }
        });

        setRanking(res.data);
        setCampeoesResumo(resumoRes.data?.campeoes || []);
        setLanternasResumo(resumoRes.data?.lanternas || []);
        setEstatisticas(statsRes.data);
      } catch (err) {
        console.error('Erro ao buscar ranking geral:', err?.response?.data || err.message);
        setErro('Erro ao carregar ranking geral.');
      } finally {
        setCarregando(false);
      }
  }, [authHeader, token]);

  useEffect(() => {
    fetchRanking();
  }, [fetchRanking]);

  // Atualização automática a cada 30s
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchRanking();
    }, 30000);
    return () => clearInterval(intervalId);
  }, [fetchRanking]);

  return (
    <div className="ranking-geral-container">
      <h2>🏆 Ranking Geral</h2>

      {carregando && <p className="erro">Carregando...</p>}
      {erro && <p className="erro">{erro}</p>}

      <div className="ranking-card">
        <table className="ranking-tabela">
        <thead>
          <tr>
            <th>Posição</th>
            <th>Nome</th>
            <th>Pontos</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((user, index) => (
            <tr key={user.id_usuario}>
              <td>{index + 1}º</td>
              <td>{user.nome}</td>
              <td>{user.pontos.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>

      <div className="ranking-card">
        <h3>🏅 Campeão e Vice por Rodada</h3>
        <table className="ranking-tabela">
          <thead>
            <tr>
              <th>Posição</th>
              <th>Nome</th>
              <th>Campeão</th>
              <th>Vice</th>
            </tr>
          </thead>
          <tbody>
            {campeoesResumo.map((user, index) => (
              <tr key={user.id_usuario}>
                <td>{index + 1}º</td>
                <td>{user.nome}</td>
                <td className="icons-cell">{'🏆'.repeat(user.campeao || 0) || '—'}</td>
                <td className="icons-cell">{'🥈'.repeat(user.vice || 0) || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ranking-card">
        <h3>🔻 Lanternas por Rodada</h3>
        <table className="ranking-tabela">
          <thead>
            <tr>
              <th>Posição</th>
              <th>Nome</th>
              <th>Lanterna</th>
            </tr>
          </thead>
          <tbody>
            {lanternasResumo.map((user, index) => (
              <tr key={user.id_usuario}>
                <td>{index + 1}º</td>
                <td>{user.nome}</td>
                <td className="icons-cell">{'🏮'.repeat(user.lanterna || 0) || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* =============== G4 GRIDS =============== */}
      <div className="grids-container g4-section">
        <h2>📊 G4 - Top 4 Acertadores</h2>
        {console.log('[RankingGeral] Renderizando G4 grids - estadisticas:', estadisticas)}

        {/* GRID 1: Placar Exato */}
        <div className="ranking-card grid-g4">
          <h3>🎯 Placar Exato</h3>
          <table className="ranking-tabela">
            <thead>
              <tr>
                <th>Posição</th>
                <th>Nome</th>
                <th>Acertos</th>
              </tr>
            </thead>
            <tbody>
              {estadisticas.placarExato && estadisticas.placarExato.length > 0 ? (
                estadisticas.placarExato.map((user) => (
                  <tr key={user.id_usuario}>
                    <td className="posicao-g4">{user.posicao}º</td>
                    <td>{user.nome}</td>
                    <td className="acertos-cell">{user.acertos}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="sem-dados">Sem dados disponíveis</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* GRID 2: Vitórias */}
        <div className="ranking-card grid-g4">
          <h3>⚽ Vitórias</h3>
          <table className="ranking-tabela">
            <thead>
              <tr>
                <th>Posição</th>
                <th>Nome</th>
                <th>Acertos</th>
              </tr>
            </thead>
            <tbody>
              {estadisticas.vitorias && estadisticas.vitorias.length > 0 ? (
                estadisticas.vitorias.map((user) => (
                  <tr key={user.id_usuario}>
                    <td className="posicao-g4">{user.posicao}º</td>
                    <td>{user.nome}</td>
                    <td className="acertos-cell">{user.acertos}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="sem-dados">Sem dados disponíveis</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* GRID 3: Gols */}
        <div className="ranking-card grid-g4">
          <h3>⛳ Gols (Casa ou Fora)</h3>
          <table className="ranking-tabela">
            <thead>
              <tr>
                <th>Posição</th>
                <th>Nome</th>
                <th>Acertos</th>
              </tr>
            </thead>
            <tbody>
              {estadisticas.gols && estadisticas.gols.length > 0 ? (
                estadisticas.gols.map((user) => (
                  <tr key={user.id_usuario}>
                    <td className="posicao-g4">{user.posicao}º</td>
                    <td>{user.nome}</td>
                    <td className="acertos-cell">{user.acertos}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="sem-dados">Sem dados disponíveis</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =============== Z4 GRIDS =============== */}
      <div className="grids-container z4-section">
        <h2>📉 Z4 - Top 4 Com Mais Ocorrências</h2>

        {/* GRID 4: W.O */}
        <div className="ranking-card grid-z4">
          <h3>🚫 Walk Over (W.O)</h3>
          <table className="ranking-tabela">
            <thead>
              <tr>
                <th>Posição</th>
                <th>Nome</th>
                <th>W.Os</th>
              </tr>
            </thead>
            <tbody>
              {estadisticas.wo && estadisticas.wo.length > 0 ? (
                estadisticas.wo.map((user) => (
                  <tr key={user.id_usuario}>
                    <td className="posicao-z4">{user.posicao}º</td>
                    <td>{user.nome}</td>
                    <td className="acertos-cell z4-value">{user.acertos}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="sem-dados">Sem dados disponíveis</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* GRID 5: Zero Pontos */}
        <div className="ranking-card grid-z4">
          <h3>💔 Zero Pontos por Jogo</h3>
          <table className="ranking-tabela">
            <thead>
              <tr>
                <th>Posição</th>
                <th>Nome</th>
                <th>Zeros</th>
              </tr>
            </thead>
            <tbody>
              {estadisticas.zeros && estadisticas.zeros.length > 0 ? (
                estadisticas.zeros.map((user) => (
                  <tr key={user.id_usuario}>
                    <td className="posicao-z4">{user.posicao}º</td>
                    <td>{user.nome}</td>
                    <td className="acertos-cell z4-value">{user.acertos}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="sem-dados">Sem dados disponíveis</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RankingGeralPage;