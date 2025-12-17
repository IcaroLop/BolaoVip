import React, { useEffect, useMemo, useState, useCallback } from 'react';
import axios from 'axios';
import storage from '../utils/storage';
import './HistoricoPage.css';

const API = 'http://192.168.56.127:3001';

const HistoricoPage = () => {
  const [rodada, setRodada] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [mensagem, setMensagem] = useState('');
  const [grupoSelecionado, setGrupoSelecionado] = useState(null);
  const [campeonatoId, setCampeonatoId] = useState(null);
  const [contextKey, setContextKey] = useState(0);

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

  // Define buscarHistorico com useCallback antes de qualquer useEffect que o use
  const buscarHistorico = useCallback(async () => {
    try {
      const timestamp = new Date().toISOString();
      const params = new URLSearchParams();
      if (grupoSelecionado) params.append('grupoId', grupoSelecionado);
      if (campeonatoId) params.append('campeonatoId', campeonatoId);

      if (rodada === null) return; // Não buscar se rodada não está definida
      
      console.log(`[HistoricoPage ${timestamp}] 📋 Buscando histórico rodada ${rodada} - grupoId: ${grupoSelecionado}, campeonatoId: ${campeonatoId}`);
      const res = await axios.get(`${API}/palpites/historico/${rodada}?${params.toString()}`, authHeader);
      setHistorico(res.data);
      setMensagem('');
    } catch (err) {
      console.error(err);
      setMensagem('Erro ao carregar o histórico.');
    }
  }, [rodada, grupoSelecionado, campeonatoId, authHeader]);

  // **CRÍTICO**: Sincroniza grupo do Header IMEDIATAMENTE ao montar, antes de qualquer fetch
  useEffect(() => {
    const timestamp = new Date().toISOString();
    const gidStr = storage.getItem('grupoId');
    const gidNum = gidStr ? Number(gidStr) : null;
    console.log(`[HistoricoPage ${timestamp}] Mount - Sincronizando grupoId do storage:`, gidNum);
    setGrupoSelecionado(gidNum);
  }, []); // Roda apenas no mount

  // Monitora mudanças no grupo após o mount inicial
  useEffect(() => {
    const cleanupStorageEvent = storage.onStorageChange(() => {
      const timestamp = new Date().toISOString();
      const gid = storage.getItem('grupoId');
      const gidNum = gid ? Number(gid) : null;
      console.log(`[HistoricoPage ${timestamp}] Storage event - grupoId mudou para:`, gidNum);
      setGrupoSelecionado(gidNum);
      setContextKey((k) => k + 1);
    });

    const cleanupWatcher = storage.createStorageWatcher('grupoId', (newValue) => {
      const timestamp = new Date().toISOString();
      const gidNum = newValue ? Number(newValue) : null;
      if (gidNum !== grupoSelecionado) {
        console.log(`[HistoricoPage ${timestamp}] Polling - grupoId mudou de ${grupoSelecionado} para ${gidNum}`);
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
    console.log(`[HistoricoPage ${timestamp}] 🔄 Grupo mudou para: ${grupoSelecionado}`);

    async function carregarCampeonatoDoGrupo() {
      try {
        const res = await axios.get(`${API}/grupos/${grupoSelecionado}/contexto`, authHeader);
        const campId = res.data.campeonatoId || res.data.campeonato_id || null;
        setCampeonatoId(campId);
        console.log(`[HistoricoPage ${timestamp}] ✅ Campeonato carregado para grupo ${grupoSelecionado}: ${campId}`);
      } catch (err) {
        console.error(`[HistoricoPage ${timestamp}] ❌ Erro ao carregar campeonato do grupo:`, err);
        setCampeonatoId(null);
      }
    }

    // Reset estado ao trocar o grupo para evitar dados defasados
    setRodada(null);
    setHistorico([]);
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
          console.log(`[HistoricoPage ${timestamp}] ⚠️ Sem grupo/campeonato - não buscando rodada vigente`);
          if (myKey !== contextKey) return;
          setRodada(null);
          setHistorico([]);
          setMensagem('Selecione um grupo no topo para ver o histórico.');
          return;
        }

        const params = new URLSearchParams();
        if (grupoSelecionado) params.append('grupoId', grupoSelecionado);
        if (campeonatoId) params.append('campeonatoId', campeonatoId);

        console.log(`[HistoricoPage ${timestamp}] 🔍 Buscando rodada vigente - grupoId: ${grupoSelecionado}, campeonatoId: ${campeonatoId}`);
        const res = await axios.get(`${API}/resultados/rodada-vigente?${params.toString()}`, authHeader);
        const rodadaVigente = res.data?.rodada ?? res.data?.rodada_vigente ?? null;
        if (myKey !== contextKey) return;
        setRodada(rodadaVigente);
        // Apenas mostra mensagem se não houver rodada e também não houver jogos
        if (!rodadaVigente && (Array.isArray(res.data?.jogos) ? res.data.jogos.length === 0 : true)) {
          setHistorico([]);
          setMensagem('Nenhum jogo ou status de rodada para este grupo.');
        } else {
          setMensagem('');
        }
      } catch (err) {
        console.error('Erro ao buscar rodada vigente:', err);
        if (myKey !== contextKey) return;
        setRodada(null);
        setHistorico([]);
        setMensagem('Nenhum jogo ou status de rodada para este grupo.');
      }
    }

    buscarRodadaVigente();
  }, [grupoSelecionado, campeonatoId, authHeader, contextKey]);

  useEffect(() => {
    if (rodada === null) return;

    buscarHistorico();

    const intervalo = setInterval(buscarHistorico, 5000); // atualiza a cada 5s
    return () => clearInterval(intervalo);
  }, [rodada, buscarHistorico]);

  const formatarData = (data) => {
    const dt = new Date(data);
    return `${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const totalPontos = historico.reduce((sum, jogo) => sum + (Number(jogo.pontos) || 0), 0);

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

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Histórico de Palpites - Rodada {rodada}</h2>

      <div style={styles.navegacao}>
        <button disabled={rodada <= 1} onClick={() => setRodada(r => r - 1)} style={styles.navBtn}>⬅ Anterior</button>
        <button onClick={() => setRodada(r => r + 1)} style={styles.navBtn}>Próxima ➡</button>
      </div>

      {mensagem && <p style={styles.mensagem}>{mensagem}</p>}
      <p style={{ textAlign: 'center', marginBottom: '1rem' }}>
        Total de pontos na rodada: <strong>{totalPontos.toFixed(2)} pts</strong>
      </p>


      <div style={styles.lista}>
        {historico.map(jogo => {
          const statusRaw = (jogo.status || '').toLowerCase();
          const emAndamento = ['andamento', 'em andamento', 'ao vivo', 'live'].some(s => statusRaw.includes(s));
          const finalizado = ['finalizado', 'concluído', 'concluido', 'encerrado'].some(s => statusRaw.includes(s));
          const agendado = ['agendado', 'programado', 'agendada', 'schedule'].some(s => statusRaw.includes(s)) && !emAndamento && !finalizado;
          const contagem = calcularContagemRegressiva(jogo.data);

          return (
           <div
              key={jogo.id_jogo}
              className={`jogo 
                ${emAndamento ? 'andamento' : ''} 
                ${finalizado ? 'borda-verde' : ''} 
                ${agendado ? 'borda-azul' : ''}`}
                style={styles.jogo}
            >
  {/* conteúdo */}

              <div style={styles.data}>{formatarData(jogo.data)}</div>

              <div style={styles.times}>
                <div style={styles.time}>
                  <img src={jogo.escudo_mandante} style={styles.escudo} alt="mandante" />
                  <span>{jogo.time_mandante}</span>
                </div>

                <div style={styles.placares}>
                  <div><strong>Real:</strong> {jogo.placar_mandante} x {jogo.placar_visitante}</div>
                  <div><strong>Palpite:</strong> {jogo.palpite_casa} x {jogo.palpite_fora}</div>
                  <div style={{ fontSize: '0.85rem', marginTop: '0.3rem', color: '#FFA500' }}>
                    Pontuação: {Number(jogo.pontos || 0).toFixed(2)} pts
                  </div>
                </div>


                <div style={styles.time}>
                  <img src={jogo.escudo_visitante} style={styles.escudo} alt="visitante" />
                  <span>{jogo.time_visitante}</span>
                </div>
              </div>

              <div style={styles.estadio}>🏟 {jogo.estadio}</div>

              <div style={styles.status}>
                <span className={`status-pill ${emAndamento ? 'andamento-pill' : finalizado ? 'finalizado-pill' : 'agendado-pill'}`}>
                  {emAndamento ? 'Em andamento' : finalizado ? 'Finalizado' : 'Agendado'}
                </span>
                {agendado && contagem && (
                  <span style={styles.contagem}>Começa em: {contagem}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '1rem',
    backgroundColor: '#0D1117',
    color: 'white',
    minHeight: '100vh'
  },
  title: {
    color: '#00FF88',
    marginBottom: '1rem',
    textAlign: 'center'
  },
  navegacao: {
    display: 'flex',
    justifyContent: 'center',
    gap: '1rem',
    marginBottom: '1rem'
  },
  navBtn: {
    padding: '6px 10px',
    backgroundColor: '#333',
    color: '#fff',
    border: '1px solid #666',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  lista: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  jogo: {
    backgroundColor: '#161B22',
    borderRadius: '10px',
    padding: '1rem',
    textAlign: 'center'
  },
  data: {
    fontSize: '0.8rem',
    color: '#ccc',
    marginBottom: '0.5rem'
  },
  times: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center'
  },
  time: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  escudo: {
    width: '36px',
    height: '36px',
    backgroundColor: '#fff',
    borderRadius: '50%',
    marginBottom: '4px'
  },
  placares: {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  fontSize: '0.9rem',
  lineHeight: '1.5'
  },
  estadio: {
    marginTop: '0.5rem',
    fontSize: '0.75rem',
    color: '#aaa'
  },
  status: {
    marginTop: '0.5rem',
    fontSize: '0.8rem'
  },
  contagem: {
    color: '#FFA500',
    marginLeft: '0.5rem'
  },
  mensagem: {
    color: '#f88',
    textAlign: 'center',
    marginBottom: '1rem'
  }
};

export default HistoricoPage;

