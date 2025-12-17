import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import PixModal from '../components/pixModal';

const API = 'http://192.168.56.127:3001';

const PalpitePage = () => {
  const [rodadaAtual, setRodadaAtual] = useState(null);
  const [jogos, setJogos] = useState([]);
  const [palpites, setPalpites] = useState({});
  const [mensagem, setMensagem] = useState('');
  const [tipoMensagem, setTipoMensagem] = useState('');
  const [dadosPix, setDadosPix] = useState(null);
  const [jaEnviado, setJaEnviado] = useState(false);
  const [grupoSelecionado, setGrupoSelecionado] = useState(null);
  const [campeonatoId, setCampeonatoId] = useState(null);
  const [contextKey, setContextKey] = useState(0);
  const [quadrosEnviados, setQuadrosEnviados] = useState(new Set());

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

  // Agrupa jogos por data+hora
  const quadrosDeJogos = useMemo(() => {
    if (jogos.length === 0) return [];
    
    const grupos = {};
    jogos.forEach(jogo => {
      const dt = new Date(jogo.data);
      const chave = `${dt.toLocaleDateString('pt-BR')}_${dt.getHours()}:${String(dt.getMinutes()).padStart(2, '0')}`;
      if (!grupos[chave]) {
        grupos[chave] = {
          dataHora: dt,
          chave: chave,
          jogos: []
        };
      }
      grupos[chave].jogos.push(jogo);
    });

    // Ordena por data/hora
    return Object.values(grupos).sort((a, b) => a.dataHora - b.dataHora);
  }, [jogos]);

  // Identifica o último quadro (mais distante no futuro)
  const ultimoQuadro = useMemo(() => {
    if (quadrosDeJogos.length === 0) return null;
    return quadrosDeJogos[quadrosDeJogos.length - 1];
  }, [quadrosDeJogos]);

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

    const interval = setInterval(() => {
      const gidStr = localStorage.getItem('grupoId');
      const gidNum = gidStr ? Number(gidStr) : null;
      if (gidNum !== grupoSelecionado) {
        setGrupoSelecionado(gidNum);
      }
    }, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [grupoSelecionado]);

  // Reset ao mudar grupo
  useEffect(() => {
    if (!grupoSelecionado || !token) return;

    async function carregarCampeonatoDoGrupo() {
      try {
        const res = await axios.get(`${API}/grupos/${grupoSelecionado}/contexto`, authHeader);
        setCampeonatoId(res.data.campeonatoId || res.data.campeonato_id || null);
      } catch (err) {
        console.error('Erro ao carregar campeonato do grupo:', err);
        setCampeonatoId(null);
      }
    }

    setRodadaAtual(null);
    setJogos([]);
    setPalpites({});
    setMensagem('');
    setTipoMensagem('');
    setDadosPix(null);
    setJaEnviado(false);
    setQuadrosEnviados(new Set());
    setContextKey((k) => k + 1);

    carregarCampeonatoDoGrupo();
  }, [grupoSelecionado, token, authHeader]);

  // Busca rodada vigente
  useEffect(() => {
    if (!campeonatoId && !grupoSelecionado) return;

    async function buscarRodadaVigente() {
      const myKey = contextKey;
      try {
        const params = new URLSearchParams();
        if (grupoSelecionado) params.append('grupoId', grupoSelecionado);
        if (campeonatoId) params.append('campeonatoId', campeonatoId);

        const res = await axios.get(`${API}/resultados/rodada-vigente?${params.toString()}`, authHeader);
        const rodadaResp = res.data?.rodada ?? null;
        const jogosResp = Array.isArray(res.data?.jogos) ? res.data.jogos : [];
        if (myKey !== contextKey) return;
        setRodadaAtual(rodadaResp);
        setJogos(jogosResp);
        
        if (!rodadaResp && jogosResp.length === 0) {
          setMensagem('Nenhum jogo encontrado para o grupo/campeonato selecionado.');
          setTipoMensagem('erro');
        } else {
          setMensagem('');
          setTipoMensagem('');
        }
      } catch (err) {
        console.error('Erro ao buscar rodada vigente:', err);
        if (myKey !== contextKey) return;
        setRodadaAtual(null);
        setJogos([]);
        setMensagem('Nenhum jogo ou status de rodada para este grupo.');
        setTipoMensagem('erro');
      }
    }

    buscarRodadaVigente();
  }, [campeonatoId, grupoSelecionado, authHeader, contextKey]);

  // Busca jogos ao navegar rodadas
  useEffect(() => {
    if (!rodadaAtual || !campeonatoId) return;

    async function buscarJogosDaRodada() {
      const myKey = contextKey;
      try {
        const res = await axios.get(`${API}/resultados/rodada/${rodadaAtual}?campeonatoId=${campeonatoId}${grupoSelecionado ? `&grupoId=${grupoSelecionado}` : ''}`, authHeader);
        if (myKey !== contextKey) return;
        setJogos(res.data.jogos || []);
        
        const resPalpites = await axios.get(`${API}/palpites/historico/${rodadaAtual}`, authHeader);
        if (resPalpites.data && resPalpites.data.length > 0) {
          const palpitesMap = {};
          resPalpites.data.forEach(p => {
            palpitesMap[p.jogo_id] = {
              placar_casa: p.placar_casa,
              placar_fora: p.placar_fora
            };
          });
          if (myKey !== contextKey) return;
          setPalpites(palpitesMap);
          setJaEnviado(true);
        } else {
          if (myKey !== contextKey) return;
          setPalpites({});
          setJaEnviado(false);
        }
      } catch (err) {
        console.error('Erro ao buscar jogos da rodada:', err);
        if (myKey !== contextKey) return;
        setJogos([]);
      }
    }

    buscarJogosDaRodada();
  }, [rodadaAtual, campeonatoId, authHeader, contextKey, grupoSelecionado]);

  const handleInput = (partidaId, campo, valor) => {
    setPalpites(prev => ({
      ...prev,
      [partidaId]: {
        ...prev[partidaId],
        [campo]: valor
      }
    }));
  };

  const enviarPalpitesQuadro = async (quadro, gerarPix = false) => {
    const jogosEditaveis = quadro.jogos.filter(j => {
      const status = (j.status || '').toLowerCase();
      return status === 'agendado' || status === 'programado' || status === 'agendada';
    });

    if (jogosEditaveis.length === 0) {
      setMensagem('Todos os jogos deste horário já iniciaram ou foram encerrados.');
      setTipoMensagem('erro');
      return;
    }

    const jogosComNull = jogosEditaveis.filter(jogo => {
      const p = palpites[jogo.partida_id] || {};
      const casaVazio = p.placar_casa === undefined || p.placar_casa === '' || p.placar_casa === null;
      const foraVazio = p.placar_fora === undefined || p.placar_fora === '' || p.placar_fora === null;
      return casaVazio || foraVazio;
    });

    if (jogosComNull.length > 0) {
      setMensagem('Preencha todos os placares deste horário antes de enviar.');
      setTipoMensagem('erro');
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const id_usuario = payload.id;
      const nome_usuario = payload.nome || payload.username || 'Usuário';
      
      const body = {
        rodada: rodadaAtual,
        palpites: jogosEditaveis.map(jogo => ({
          jogo_id: jogo.partida_id,
          placar_casa: Number(palpites[jogo.partida_id]?.placar_casa),
          placar_fora: Number(palpites[jogo.partida_id]?.placar_fora),
        }))
      };

      const res = await axios.post(`${API}/palpites/enviar`, body, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const { codigo_envio } = res.data;

      setQuadrosEnviados(prev => new Set([...prev, quadro.chave]));

      if (gerarPix && !jaEnviado) {
        const txid = codigo_envio;
        const cobranca = await axios.post(`${API}/pix/cobranca`, {
          id_usuario,
          nome_usuario,
          codigo_envio,
          valor: 10.00,
          txid
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setDadosPix({
          nome_usuario,
          codigo_envio,
          valor: cobranca.data.cobranca_api.valor.original,
          txid: cobranca.data.cobranca_api.txid,
          expiracao: cobranca.data.cobranca_api.calendario.criacao,
          pix_copiaecola: cobranca.data.cobranca_api.pixCopiaECola,
          qr_code_url: cobranca.data.cobranca_api.loc.location
        });

        setMensagem('Palpites enviados! Aguardando pagamento.');
        setTipoMensagem('sucesso');
        setJaEnviado(true);
      } else {
        setMensagem(`Palpites do horário ${quadro.chave.split('_')[1]} salvos com sucesso!`);
        setTipoMensagem('sucesso');
      }
    } catch (err) {
      console.error('Erro ao enviar palpites:', err);
      setMensagem('Erro ao enviar palpites.');
      setTipoMensagem('erro');
    }
  };

  const enviarTodosOsPalpites = async () => {
    const todosJogosEditaveis = jogos.filter(j => {
      const status = (j.status || '').toLowerCase();
      return status === 'agendado' || status === 'programado' || status === 'agendada';
    });

    if (todosJogosEditaveis.length === 0) {
      setMensagem('Todos os jogos já iniciaram ou foram encerrados.');
      setTipoMensagem('erro');
      return;
    }

    const jogosComNull = todosJogosEditaveis.filter(jogo => {
      const p = palpites[jogo.partida_id] || {};
      const casaVazio = p.placar_casa === undefined || p.placar_casa === '' || p.placar_casa === null;
      const foraVazio = p.placar_fora === undefined || p.placar_fora === '' || p.placar_fora === null;
      return casaVazio || foraVazio;
    });

    if (jogosComNull.length > 0) {
      setMensagem('Preencha todos os placares dos jogos editáveis antes de enviar.');
      setTipoMensagem('erro');
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const id_usuario = payload.id;
      const nome_usuario = payload.nome || payload.username || 'Usuário';
      
      const body = {
        rodada: rodadaAtual,
        palpites: todosJogosEditaveis.map(jogo => ({
          jogo_id: jogo.partida_id,
          placar_casa: Number(palpites[jogo.partida_id]?.placar_casa),
          placar_fora: Number(palpites[jogo.partida_id]?.placar_fora),
        }))
      };

      const res = await axios.post(`${API}/palpites/enviar`, body, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const { codigo_envio } = res.data;

      if (!jaEnviado) {
        const txid = codigo_envio;
        const cobranca = await axios.post(`${API}/pix/cobranca`, {
          id_usuario,
          nome_usuario,
          codigo_envio,
          valor: 10.00,
          txid
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setDadosPix({
          nome_usuario,
          codigo_envio,
          valor: cobranca.data.cobranca_api.valor.original,
          txid: cobranca.data.cobranca_api.txid,
          expiracao: cobranca.data.cobranca_api.calendario.criacao,
          pix_copiaecola: cobranca.data.cobranca_api.pixCopiaECola,
          qr_code_url: cobranca.data.cobranca_api.loc.location
        });

        setMensagem('Todos os palpites enviados! Aguardando pagamento.');
        setTipoMensagem('sucesso');
        setJaEnviado(true);
      } else {
        setMensagem('Todos os palpites atualizados com sucesso!');
        setTipoMensagem('sucesso');
      }
    } catch (err) {
      console.error('Erro ao enviar todos os palpites:', err);
      setMensagem('Erro ao enviar palpites.');
      setTipoMensagem('erro');
    }
  };

  const formatarDataHora = (data) => {
    const dt = new Date(data);
    return `${dt.toLocaleDateString('pt-BR')} às ${dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>{jogos.length > 0 && rodadaAtual ? `Palpites - Rodada ${rodadaAtual}` : 'Palpites'}</h2>
      
      {jogos.length > 0 && (
        <div style={styles.navegacao}>
          <button
            disabled={rodadaAtual === 1}
            onClick={() => {
              setRodadaAtual(r => r - 1);
              setMensagem('');
            }}
            style={styles.navBtn}
          >⬅ Anterior</button>
          <button
            disabled={rodadaAtual === 38}
            onClick={() => {
              setRodadaAtual(r => r + 1);
              setMensagem('');
            }}
            style={styles.navBtn}
          >Próxima ➡</button>
        </div>
      )}

      {jogos.length === 0 ? (
        <p style={styles.mensagem}>Nenhum jogo encontrado para essa rodada.</p>
      ) : (
        <>
          <button
            onClick={enviarTodosOsPalpites}
            style={styles.enviarTodosBtn}
          >
            🚀 {jaEnviado ? 'Atualizar Todos os Palpites' : 'Enviar Todos os Palpites'}
          </button>

          {quadrosDeJogos.map((quadro, idx) => (
            <QuadroDeJogos
              key={quadro.chave}
              quadro={quadro}
              palpites={palpites}
              handleInput={handleInput}
              enviarPalpitesQuadro={enviarPalpitesQuadro}
              formatarDataHora={formatarDataHora}
              ehUltimoQuadro={quadro.chave === ultimoQuadro?.chave}
              jaEnviado={quadrosEnviados.has(quadro.chave)}
            />
          ))}
        </>
      )}

      {mensagem && (
        <p style={tipoMensagem === 'sucesso' ? styles.mensagemSucesso : styles.mensagemEnvio}>
          {mensagem}
        </p>
      )}

      {dadosPix && (
        <PixModal
          dadosPix={dadosPix}
          onClose={() => setDadosPix(null)}
        />
      )}
    </div>
  );
};

// Componente de quadro individual
const QuadroDeJogos = ({ quadro, palpites, handleInput, enviarPalpitesQuadro, formatarDataHora, ehUltimoQuadro, jaEnviado }) => {
  const [tempoRestante, setTempoRestante] = useState('');
  const [fechado, setFechado] = useState(false);

  useEffect(() => {
    const intervalo = setInterval(() => {
      const agora = new Date();
      const diff = quadro.dataHora - agora;
      if (diff <= 0) {
        setTempoRestante('Horário passou');
        setFechado(true);
        clearInterval(intervalo);
      } else {
        const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
        const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((diff % (1000 * 60)) / 1000);
        
        if (dias > 0) {
          setTempoRestante(`${dias}d ${horas}h ${minutos}m`);
        } else {
          setTempoRestante(`${horas}h ${minutos}m ${segundos}s`);
        }
      }
    }, 1000);
    return () => clearInterval(intervalo);
  }, [quadro.dataHora]);

  return (
    <div style={styles.quadro}>
      <div style={styles.quadroHeader}>
        <h3 style={styles.quadroTitulo}>📅 {formatarDataHora(quadro.dataHora)}</h3>
        <div style={fechado ? styles.relogioFechado : styles.relogio}>
          {fechado ? '❌ Encerrado' : `⏰ ${tempoRestante}`}
        </div>
      </div>

      <div style={styles.listaJogos}>
        {quadro.jogos.map(jogo => {
          const escudoMandante = jogo.escudo_mandante || '/assets/escudo-placeholder.svg';
          const escudoVisitante = jogo.escudo_visitante || '/assets/escudo-visitante.svg';
          const jogoFechado = ['encerrado', 'finalizado', 'em andamento', 'andamento'].includes((jogo.status || '').toLowerCase());

          return (
            <div key={jogo.partida_id} style={styles.jogo}>
              <div style={styles.timesContainer}>
                <div style={styles.timeCol}>
                  <img src={escudoMandante} alt="mandante" style={styles.escudo} />
                  <span style={styles.nomeTime}>{jogo.time_mandante}</span>
                </div>
                <div style={styles.timeCol}>
                  <img src={escudoVisitante} alt="visitante" style={styles.escudo} />
                  <span style={styles.nomeTime}>{jogo.time_visitante}</span>
                </div>
              </div>
              <div style={styles.placarLinha}>
                <input
                  type="number"
                  min="0"
                  disabled={fechado || jogoFechado}
                  value={palpites[jogo.partida_id]?.placar_casa ?? ''}
                  onChange={(e) => handleInput(jogo.partida_id, 'placar_casa', e.target.value)}
                  style={styles.input}
                />
                <span style={styles.x}>x</span>
                <input
                  type="number"
                  min="0"
                  disabled={fechado || jogoFechado}
                  value={palpites[jogo.partida_id]?.placar_fora ?? ''}
                  onChange={(e) => handleInput(jogo.partida_id, 'placar_fora', e.target.value)}
                  style={styles.input}
                />
              </div>
              <div style={styles.estadio}>🏟 {jogo.estadio}</div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => enviarPalpitesQuadro(quadro, ehUltimoQuadro)}
        style={{ ...styles.enviarQuadroBtn, opacity: fechado ? 0.5 : 1 }}
        disabled={fechado}
      >
        {jaEnviado ? '✏️ Atualizar este horário' : `📤 Enviar palpites deste horário${ehUltimoQuadro ? ' (gera PIX)' : ''}`}
      </button>
    </div>
  );
};

const styles = {
  container: {
    padding: 'clamp(0.5rem, 2vw, 2rem)',
    backgroundColor: '#0D1117',
    color: 'white',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  title: {
    color: '#00FF88',
    marginBottom: '0.5rem',
    fontSize: 'clamp(1.3rem, 5vw, 1.8rem)',
    textAlign: 'center',
  },
  navegacao: {
    display: 'flex',
    gap: '0.4rem',
    marginBottom: '1rem',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  navBtn: {
    padding: '6px 12px',
    backgroundColor: '#333',
    color: '#fff',
    border: '1px solid #666',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    minHeight: '32px',
    minWidth: '70px',
  },
  enviarTodosBtn: {
    backgroundColor: '#FF6B00',
    color: '#FFF',
    padding: 'clamp(14px, 3vw, 18px) clamp(24px, 5vw, 36px)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginBottom: '1.5rem',
    fontSize: 'clamp(1rem, 3vw, 1.2rem)',
    fontWeight: 'bold',
    minHeight: '50px',
    width: '90%',
    maxWidth: '400px',
    boxShadow: '0 4px 12px rgba(255, 107, 0, 0.3)',
  },
  quadro: {
    width: '100%',
    maxWidth: '600px',
    backgroundColor: '#1C2128',
    borderRadius: '12px',
    padding: 'clamp(1rem, 3vw, 1.5rem)',
    marginBottom: '1.5rem',
    border: '2px solid #30363D',
  },
  quadroHeader: {
    marginBottom: '1rem',
    textAlign: 'center',
  },
  quadroTitulo: {
    color: '#58A6FF',
    fontSize: 'clamp(1rem, 3vw, 1.2rem)',
    marginBottom: '0.5rem',
  },
  relogio: {
    fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)',
    color: '#FFA',
    fontWeight: 'bold',
  },
  relogioFechado: {
    fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)',
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
  listaJogos: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginBottom: '1rem',
  },
  jogo: {
    backgroundColor: '#161B22',
    padding: 'clamp(0.75rem, 3vw, 1rem)',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  timesContainer: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    marginBottom: '0.75rem',
    gap: '0.5rem',
  },
  timeCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '45%',
  },
  escudo: {
    width: 'clamp(35px, 8vw, 50px)',
    height: 'clamp(35px, 8vw, 50px)',
    objectFit: 'contain',
    backgroundColor: '#fff',
    borderRadius: '50%',
  },
  nomeTime: {
    fontSize: 'clamp(0.75rem, 2.5vw, 0.9rem)',
    marginTop: '4px',
    textAlign: 'center',
    wordBreak: 'break-word',
  },
  placarLinha: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '0.5rem',
    gap: 'clamp(0.5rem, 3vw, 1rem)',
  },
  input: {
    width: 'clamp(45px, 10vw, 55px)',
    height: '44px',
    padding: '0px',
    backgroundColor: '#222',
    border: '1px solid #444',
    color: 'white',
    borderRadius: '6px',
    textAlign: 'center',
    fontSize: 'clamp(1.2rem, 4vw, 1.6rem)',
    fontWeight: 'bold',
  },
  x: {
    fontWeight: 'bold',
    fontSize: 'clamp(1rem, 3vw, 1.3rem)',
  },
  estadio: {
    fontSize: 'clamp(0.7rem, 2vw, 0.8rem)',
    color: '#aaa',
    textAlign: 'center',
  },
  enviarQuadroBtn: {
    backgroundColor: '#00FF88',
    color: '#000',
    padding: 'clamp(10px, 2.5vw, 14px) clamp(16px, 4vw, 24px)',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: 'clamp(0.85rem, 2.5vw, 1rem)',
    fontWeight: 'bold',
    width: '100%',
    minHeight: '42px',
  },
  mensagem: {
    marginTop: '1rem',
    color: '#FFA',
    fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)',
    textAlign: 'center',
  },
  mensagemEnvio: {
    marginTop: '0.5rem',
    marginBottom: '0.5rem',
    color: '#FF6B6B',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    border: '1px solid #FF6B6B',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)',
    textAlign: 'center',
    width: '90%',
    maxWidth: '400px',
  },
  mensagemSucesso: {
    marginTop: '0.5rem',
    marginBottom: '0.5rem',
    color: '#00FF88',
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    border: '1px solid #00FF88',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)',
    textAlign: 'center',
    width: '90%',
    maxWidth: '400px',
    fontWeight: 'bold',
  }
};

export default PalpitePage;
