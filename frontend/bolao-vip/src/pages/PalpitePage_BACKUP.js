import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import PixModal from '../components/pixModal';

const API = 'http://192.168.56.127:3001';

const PalpitePage = () => {
  const [rodadaAtual, setRodadaAtual] = useState(null);
  const [jogos, setJogos] = useState([]);
  const [palpites, setPalpites] = useState({});
  const [mensagem, setMensagem] = useState('');
  const [tipoMensagem, setTipoMensagem] = useState(''); // 'erro', 'sucesso', ou ''
  const [inicioRodada, setInicioRodada] = useState(null);
  const [tempoRestante, setTempoRestante] = useState('');
  const [rodadaFechada, setRodadaFechada] = useState(false);
  const [dadosPix, setDadosPix] = useState(null);
  const [jaEnviado, setJaEnviado] = useState(false);
  const [grupoSelecionado, setGrupoSelecionado] = useState(null);
  const [campeonatoId, setCampeonatoId] = useState(null);
  const [contextKey, setContextKey] = useState(0);

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
    // Polling para detectar alterações no mesmo contexto/aba
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
  }, []);

  // Reset ao mudar grupo e busca campeonato do grupo selecionado
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

    // Reset estado ao trocar o grupo para evitar dados defasados
    setRodadaAtual(null);
    setJogos([]);
    setPalpites({});
    setMensagem('');
    setTipoMensagem('');
    setInicioRodada(null);
    setTempoRestante('');
    setRodadaFechada(false);
    setDadosPix(null);
    setJaEnviado(false);
    setContextKey((k) => k + 1);

    carregarCampeonatoDoGrupo();
  }, [grupoSelecionado, token, authHeader]);

  // Busca rodada vigente considerando campeonato/grupo (apenas inicialização)
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
        if (myKey !== contextKey) return; // ignora respostas antigas
        setRodadaAtual(rodadaResp);
        setJogos(jogosResp);
        // Só exibe erro se realmente não houver rodada e não houver jogos
        if (!rodadaResp && jogosResp.length === 0) {
          setMensagem('Nenhum jogo encontrado para o grupo/campeonato selecionado.');
          setTipoMensagem('erro');
          setPalpites({});
          setJaEnviado(false);
        } else {
          setMensagem('');
          setTipoMensagem('');
        }
      } catch (err) {
        console.error('Erro ao buscar rodada vigente:', err);
        if (myKey !== contextKey) return; // ignora respostas antigas
        setRodadaAtual(null);
        setJogos([]);
        setPalpites({});
        setJaEnviado(false);
        setMensagem('Nenhum jogo ou status de rodada para este grupo.');
        setTipoMensagem('erro');
      }
    }

    buscarRodadaVigente();
  }, [campeonatoId, grupoSelecionado]);

  // Busca jogos quando rodadaAtual muda (navegação de rodadas)
  useEffect(() => {
    if (!rodadaAtual || !campeonatoId) return;

    async function buscarJogosDaRodada() {
      const myKey = contextKey;
      try {
        const res = await axios.get(`${API}/resultados/rodada/${rodadaAtual}?campeonatoId=${campeonatoId}${grupoSelecionado ? `&grupoId=${grupoSelecionado}` : ''}`, authHeader);
        if (myKey !== contextKey) return;
        setJogos(res.data.jogos || []);
        
        // Buscar palpites salvos para a nova rodada
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
  }, [rodadaAtual, campeonatoId, authHeader, contextKey]);

  useEffect(() => {
    if (rodadaAtual === null || jogos.length === 0) return;
    // jogos já carregados via rodada-vigente
    async function carregarPalpites() {
      try {
        const res = await axios.get(
          `${API}/palpites/rodada/${rodadaAtual}`,
          authHeader
        );
        const dados = {};
        res.data.forEach(p => {
          dados[p.partida_id] = {
            placar_casa: p.gols_casa,
            placar_fora: p.gols_fora
          };
        });
        setPalpites(dados);
        setJaEnviado(res.data.length > 0);
      } catch (err) {
        console.error('Erro ao buscar palpites salvos:', err);
      }
    }
    carregarPalpites();
    
    if (jogos.length > 0) {
      const datas = jogos.map(j => new Date(j.data));
      const primeiraData = new Date(Math.min(...datas));
      setInicioRodada(primeiraData);
      setRodadaFechada(new Date() >= primeiraData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rodadaAtual, jogos]);

  useEffect(() => {
    if (!inicioRodada) return;
    const intervalo = setInterval(() => {
      const agora = new Date();
      const diff = inicioRodada - agora;
      if (diff <= 0) {
        setTempoRestante('Rodada fechada');
        setRodadaFechada(true);
        clearInterval(intervalo);
      } else {
        const horas = Math.floor(diff / (1000 * 60 * 60));
        const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((diff % (1000 * 60)) / 1000);
        setTempoRestante(`${horas}h ${minutos}m ${segundos}s`);
      }
    }, 1000);
    return () => clearInterval(intervalo);
  }, [inicioRodada]);

  const handleInput = (partidaId, campo, valor) => {
    setPalpites(prev => ({
      ...prev,
      [partidaId]: {
        ...prev[partidaId],
        [campo]: valor
      }
    }));
  };

  const enviarPalpites = async () => {
    if (rodadaFechada) {
      setMensagem('Rodada fechada. Não é possível enviar ou atualizar palpites.');
      setTipoMensagem('erro');
      return;
    }
    // Validação: não permitir palpites com placar NULL/vazio
    const jogosComNull = jogos.filter(jogo => {
      const p = palpites[jogo.partida_id] || {};
      const casaVazio = p.placar_casa === undefined || p.placar_casa === '' || p.placar_casa === null;
      const foraVazio = p.placar_fora === undefined || p.placar_fora === '' || p.placar_fora === null;
      return casaVazio || foraVazio;
    });

    if (jogosComNull.length > 0) {
      window.confirm('Há palpites com placar em branco. Deseja cancelar e preencher?');
      // Independente da escolha, não permitir envio com placar NULL
      setMensagem('Preencha todos os placares antes de enviar.');
      setTipoMensagem('erro');
      return;
    }
    const token = localStorage.getItem('token');
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const id_usuario = payload.id;
      const nome_usuario = payload.nome || payload.username || 'Usuário'; // ajusta conforme backend
      const body = {
        rodada: rodadaAtual,
        palpites: jogos.map(jogo => ({
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
        //const txid = `PALPITE${nome_usuario}${body.rodada}${codigo_envio}`;
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
      }
        else {
          setMensagem('Palpites atualizados com sucesso!');
          setTipoMensagem('sucesso');
        }
        setJaEnviado(true);
    } catch (err) {
      console.error('Erro ao enviar palpites:', err);
      setMensagem('Erro ao enviar palpites.');
      setTipoMensagem('erro');
    }
  };

  const formatarDataHora = (data) => {
    const dt = new Date(data);
    return `${dt.toLocaleDateString()} às ${dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>{jogos.length > 0 && rodadaAtual ? `Palpites - Rodada ${rodadaAtual}` : 'Palpites'}</h2>
      {jogos.length > 0 && tempoRestante && (
        <div style={styles.relogio}>
          {rodadaFechada ? '❌ Rodada fechada para palpites' : `⏰ Início em: ${tempoRestante}`}
        </div>
      )}
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
        <div style={styles.listaJogos}>
          {jogos.map(jogo => {
            const escudoMandante = jogo.escudo_mandante || '/assets/escudo-placeholder.svg';
            const escudoVisitante = jogo.escudo_visitante || '/assets/escudo-placeholder.svg';
            return (
              <div key={jogo.partida_id} style={styles.jogo}>
                <div style={styles.dataHora}>{formatarDataHora(jogo.data)}</div>
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
                    disabled={rodadaFechada}
                    value={palpites[jogo.partida_id]?.placar_casa ?? ''}
                    onChange={(e) => handleInput(jogo.partida_id, 'placar_casa', e.target.value)}
                    style={styles.input}
                  />
                  <span style={styles.x}>x</span>
                  <input
                    type="number"
                    min="0"
                    disabled={rodadaFechada}
                    value={palpites[jogo.partida_id]?.placar_fora ?? ''}
                    onChange={(e) => handleInput(jogo.partida_id, 'placar_fora', e.target.value)}
                    style={styles.input}
                  />
                </div>
                <div style={styles.estadio}>Estádio: {jogo.estadio}</div>
              </div>
            );
          })}
        </div>
      )}

      {mensagem && (
        <p style={tipoMensagem === 'sucesso' ? styles.mensagemSucesso : styles.mensagemEnvio}>
          {mensagem}
        </p>
      )}
      
      {jogos.length > 0 && (
        <button
          onClick={enviarPalpites}
          style={{ ...styles.enviarBtn, opacity: rodadaFechada ? 0.5 : 1 }}
          disabled={rodadaFechada}
        >
          {jaEnviado ? 'Atualizar' : 'Enviar Palpites'}
        </button>
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
  relogio: {
    marginBottom: '1rem',
    fontSize: 'clamp(0.85rem, 3vw, 0.95rem)',
    color: '#FFA',
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
  listaJogos: {
    width: '100%',
    maxWidth: '600px',
    padding: '0 0.5rem',
  },
  jogo: {
    backgroundColor: '#161B22',
    padding: 'clamp(0.75rem, 3vw, 1rem)',
    borderRadius: '10px',
    marginBottom: '1rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  dataHora: {
    color: '#ccc',
    fontSize: 'clamp(0.75rem, 2.5vw, 0.85rem)',
    marginBottom: '0.5rem',
    textAlign: 'center',
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
  inputWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: '44px',
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
  enviarBtn: {
    backgroundColor: '#00FF88',
    color: '#000',
    padding: 'clamp(12px, 3vw, 16px) clamp(20px, 5vw, 30px)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '1rem',
    fontSize: 'clamp(0.95rem, 3vw, 1.1rem)',
    fontWeight: 'bold',
    minHeight: '44px',
    width: '90%',
    maxWidth: '300px',
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
    maxWidth: '300px',
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
    maxWidth: '300px',
    fontWeight: 'bold',
  }
};

export default PalpitePage;

