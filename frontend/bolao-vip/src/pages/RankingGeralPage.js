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

  const token = useMemo(() => storage.getItem('token') || localStorage.getItem('token'), []);
  const authHeader = useMemo(() => (token ? { headers: { Authorization: `Bearer ${token}` } } : {}), [token]);

  const fetchRanking = useCallback(async () => {
      try {
        setCarregando(true);
        setErro('');

        const grupoIdStr = storage.getItem('grupoId') || localStorage.getItem('grupoId');
        const grupoId = grupoIdStr ? Number(grupoIdStr) : null;
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

        const res = await axios.get(`${API_BASE_URL}/ranking/geral?${params.toString()}`, authHeader);
        setRanking(res.data);

        // Resumo campeão/vice/lanterna
        const resumoRes = await axios.get(`${API_BASE_URL}/ranking/geral/resumo-posicoes?${params.toString()}`, authHeader);
        setCampeoesResumo(resumoRes.data?.campeoes || []);
        setLanternasResumo(resumoRes.data?.lanternas || []);
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
    </div>
  );
};

export default RankingGeralPage;

