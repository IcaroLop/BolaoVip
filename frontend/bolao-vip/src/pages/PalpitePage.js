import React, { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import storage from '../utils/storage';
import PixModal from '../components/pixModal';

const API = 'http://192.168.56.127:3001';

const PalpitePage = () => {
  const [rodadaAtual, setRodadaAtual] = useState(null);
  const [jogos, setJogos] = useState([]);
  const [palpites, setPalpites] = useState({});
  const [mensagem, setMensagem] = useState('');
  const [tipoMensagem, setTipoMensagem] = useState('');
  const [dadosPix, setDadosPix] = useState(null);

  const [temPalpitesServidor, setTemPalpitesServidor] = useState(false);
  const [jaEnviado, setJaEnviado] = useState(false);
  
  // Não inicializa com valor - força leitura no useEffect para garantir valor mais recente
  const [grupoSelecionado, setGrupoSelecionado] = useState(null);
  
  // Flag para indicar que o grupo foi sincronizado do Header
  const [grupoCarregado, setGrupoCarregado] = useState(false);
  
  const [campeonatoId, setCampeonatoId] = useState(null);
  const [contextKey, setContextKey] = useState(0);
  const [quadrosEnviados, setQuadrosEnviados] = useState(new Set());
  
  // Estados para verificação de PIX
  const [pixPago, setPixPago] = useState(false);
  const [pixPendente, setPixPendente] = useState(false);
  const [dadosPixPendente, setDadosPixPendente] = useState(null);

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

  // **CRÍTICO**: Sincroniza grupo do Header IMEDIATAMENTE ao montar, antes de qualquer fetch
  useEffect(() => {
    const timestamp = new Date().toISOString();
    const gidStr = storage.getItem('grupoId');
    const gidNum = gidStr ? Number(gidStr) : null;
    console.log(`[PalpitePage ${timestamp}] Mount - Sincronizando grupoId do storage:`, gidNum);
    console.log(`[PalpitePage ${timestamp}] Storage disponível - localStorage: ${storage.hasLocalStorage}, sessionStorage: ${storage.hasSessionStorage}`);
    setGrupoSelecionado(gidNum);
    setGrupoCarregado(true);
  }, []); // Roda apenas no mount

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

  // Monitora mudanças no grupo após o mount inicial
  useEffect(() => {
    // Listener para storage events (cross-tab no browser tradicional)
    const cleanupStorageEvent = storage.onStorageChange(() => {
      const timestamp = new Date().toISOString();
      const gid = storage.getItem('grupoId');
      const gidNum = gid ? Number(gid) : null;
      console.log(`[PalpitePage ${timestamp}] Storage event - grupoId mudou para:`, gidNum);
      setGrupoSelecionado(gidNum);
      setContextKey((k) => k + 1);
    });

    // Polling para detectar mudanças (essencial para Simple Browser e mobile)
    const cleanupWatcher = storage.createStorageWatcher('grupoId', (newValue) => {
      const timestamp = new Date().toISOString();
      const gidNum = newValue ? Number(newValue) : null;
      if (gidNum !== grupoSelecionado) {
        console.log(`[PalpitePage ${timestamp}] Polling - grupoId mudou de ${grupoSelecionado} para ${gidNum}`);
        setGrupoSelecionado(gidNum);
        setContextKey((k) => k + 1);
      }
    }, 250);

    return () => {
      cleanupStorageEvent();
      cleanupWatcher();
    };
  }, [grupoSelecionado]);

  // Reset ao mudar grupo
  useEffect(() => {
    if (!grupoSelecionado || !token) return;
    
    const timestamp = new Date().toISOString();
    console.log(`[PalpitePage ${timestamp}] 🔄 Grupo mudou para: ${grupoSelecionado}, contextKey: ${contextKey}`);

    async function carregarCampeonatoDoGrupo() {
      try {
        const res = await axios.get(`${API}/grupos/${grupoSelecionado}/contexto`, authHeader);
        const campId = res.data.campeonatoId || res.data.campeonato_id || null;
        setCampeonatoId(campId);
        console.log(`[PalpitePage ${timestamp}] ✅ Campeonato carregado para grupo ${grupoSelecionado}: ${campId}`);
      } catch (err) {
        console.error(`[PalpitePage ${timestamp}] ❌ Erro ao carregar campeonato do grupo:`, err);
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
    setTemPalpitesServidor(false);
    setQuadrosEnviados(new Set());
    setPixPago(false);
    setPixPendente(false);
    setDadosPixPendente(null);

    carregarCampeonatoDoGrupo();
  }, [grupoSelecionado, token, authHeader, contextKey]);

  // Busca rodada vigente
  useEffect(() => {
    // Só executa se grupo está carregado e há campeonato ou grupo válido
    if ((!campeonatoId && !grupoSelecionado) || !grupoCarregado) {
      console.log('[PalpitePage] Aguardando sincronização - grupoCarregado:', grupoCarregado, 'grupoSelecionado:', grupoSelecionado, 'campeonatoId:', campeonatoId);
      return;
    }

    async function buscarRodadaVigente() {
      const myKey = contextKey;
      const timestamp = new Date().toISOString();
      try {
        const params = new URLSearchParams();
        if (grupoSelecionado) params.append('grupoId', grupoSelecionado);
        if (campeonatoId) params.append('campeonatoId', campeonatoId);

        console.log(`[PalpitePage ${timestamp}] 🔍 Buscando rodada vigente - grupoId: ${grupoSelecionado}, campeonatoId: ${campeonatoId}, params: ${params.toString()}`);
        const res = await axios.get(`${API}/resultados/rodada-vigente?${params.toString()}`, authHeader);
        const rodadaResp = res.data?.rodada ?? null;
        const jogosResp = Array.isArray(res.data?.jogos) ? res.data.jogos : [];
        if (myKey !== contextKey) return;
        setRodadaAtual(rodadaResp);
        setJogos(jogosResp);
        // Se a API não retornar a rodada mas houver jogos contendo a propriedade 'rodada', usar esse valor
        if (!rodadaResp && Array.isArray(jogosResp) && jogosResp.length > 0 && jogosResp[0]?.rodada) {
          setRodadaAtual(jogosResp[0].rodada);
        }
        
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
  }, [campeonatoId, grupoSelecionado, authHeader, contextKey, grupoCarregado]);

  // Busca jogos ao navegar rodadas
  useEffect(() => {
    if (!rodadaAtual || !campeonatoId) return;

    // Reset estados quando a rodada muda
    console.log('[PalpitePage] Rodada mudou para:', rodadaAtual, '- resetando jaEnviado para false');
    setJaEnviado(false);
    setTemPalpitesServidor(false);
    setQuadrosEnviados(new Set());
    setPixPago(false);
    setPixPendente(false);
    setDadosPixPendente(null);
    setDadosPix(null);

    async function buscarJogosDaRodada() {
      const myKey = contextKey;
      try {
        const res = await axios.get(`${API}/resultados/rodada/${rodadaAtual}?campeonatoId=${campeonatoId}${grupoSelecionado ? `&grupoId=${grupoSelecionado}` : ''}`, authHeader);
        if (myKey !== contextKey) return;
        setJogos(res.data.jogos || []);
        
        // Primeiro, tenta buscar palpites salvos diretamente pela rota /palpites/rodada/:rodada
        const urlRodadaPalpites = `${API}/palpites/rodada/${rodadaAtual}?campeonatoId=${campeonatoId}${grupoSelecionado ? `&grupoId=${grupoSelecionado}` : ''}`;
        let resPalpites;
        let palpitesArray = [];
        try {
          resPalpites = await axios.get(urlRodadaPalpites, authHeader);
          if (Array.isArray(resPalpites.data) && resPalpites.data.length > 0) {
            palpitesArray = resPalpites.data;
          }
        } catch (e) {
          // ignora erro e tenta histórico
        }

        // Se vazio, tenta histórico detalhado (inclui mais campos mas também contém os palpites)
        if (palpitesArray.length === 0) {
          const urlHistorico = `${API}/palpites/historico/${rodadaAtual}?campeonatoId=${campeonatoId}${grupoSelecionado ? `&grupoId=${grupoSelecionado}` : ''}`;
          try {
            const resHist = await axios.get(urlHistorico, authHeader);
            if (Array.isArray(resHist.data) && resHist.data.length > 0) {
              palpitesArray = resHist.data;
            }
          } catch (e) {
            // Se ambos falharem, mantém vazio
          }
        }

        if (palpitesArray.length > 0) {
          const palpitesMap = {};
          palpitesArray.forEach(p => {
            const idJogo = p.partida_id ?? p.jogo_id ?? p.id_jogo;
            const casa = p.gols_casa ?? p.placar_casa ?? p.palpite_casa;
            const fora = p.gols_fora ?? p.placar_fora ?? p.palpite_fora;
            if (idJogo !== undefined && idJogo !== null) {
              palpitesMap[idJogo] = {
                placar_casa: casa,
                placar_fora: fora
              };
            }
          });
          if (myKey !== contextKey) return;
          setPalpites(palpitesMap);
          setJaEnviado(true);
          setTemPalpitesServidor(true);

          // Fallback: se não há jogos carregados, construir lista de jogos a partir do histórico
          if ((!Array.isArray(res.data?.jogos) || res.data.jogos.length === 0) && jogos.length === 0) {
            const jogosFromHistorico = palpitesArray.map(p => ({
              partida_id: p.partida_id ?? p.id_jogo ?? p.jogo_id,
              time_mandante: p.time_mandante,
              time_visitante: p.time_visitante,
              escudo_mandante: p.escudo_mandante,
              escudo_visitante: p.escudo_visitante,
              estadio: p.estadio,
              data: p.data,
              status: p.status,
            })).filter(j => j.partida_id != null);
            setJogos(jogosFromHistorico);
          }
        } else {
          if (myKey !== contextKey) return;
          setPalpites({});
          setJaEnviado(false);
          setTemPalpitesServidor(false);
        }
      } catch (err) {
        console.error('Erro ao buscar jogos da rodada:', err);
        if (myKey !== contextKey) return;
        setJogos([]);
      }
    }

    buscarJogosDaRodada();
  }, [rodadaAtual, campeonatoId, authHeader, contextKey, grupoSelecionado, jogos.length]);

  // Verificar status de pagamento PIX ao carregar rodada
  useEffect(() => {
    if (!rodadaAtual || !token) return;

    async function verificarPixRodada() {
      try {
        const params = new URLSearchParams();
        if (grupoSelecionado) params.append('grupoId', grupoSelecionado);
        if (campeonatoId) params.append('campeonatoId', campeonatoId);

        console.log(`[PalpitePage] Verificando PIX para rodada ${rodadaAtual}`);
        const res = await axios.get(`${API}/palpites/verificar-pagamento/${rodadaAtual}?${params.toString()}`, authHeader);
        
        setPixPago(res.data.pixPago || false);
        setPixPendente(res.data.pixPendente || false);
        setDadosPixPendente(res.data.dadosPix || null);
        
        console.log(`[PalpitePage] Status PIX - Pago: ${res.data.pixPago}, Pendente: ${res.data.pixPendente}`);
      } catch (err) {
        console.error('Erro ao verificar PIX:', err);
        setPixPago(false);
        setPixPendente(false);
        setDadosPixPendente(null);
      }
    }

    verificarPixRodada();
  }, [rodadaAtual, campeonatoId, grupoSelecionado, token, authHeader]);

  const handleInput = (partidaId, campo, valor) => {
    setPalpites(prev => ({
      ...prev,
      [partidaId]: {
        ...prev[partidaId],
        [campo]: valor
      }
    }));
  };

  // Função para verificar status dos jogos de um quadro
  const verificarStatusJogos = useCallback((quadro) => {
    let todosAgendados = true;
    let algumIniciado = false;
    let algumFinalizado = false;

    quadro.jogos.forEach(jogo => {
      const status = (jogo.status || '').toLowerCase();
      
      const agendado = ['agendado', 'agendada', 'programado', 'scheduled'].includes(status);
      const iniciado = ['andamento', 'ao vivo', 'live', 'em andamento', 'em_andamento'].includes(status);
      const finalizado = ['finalizado', 'encerrado', 'concluído', 'concluido', 'finished'].includes(status);

      if (!agendado) todosAgendados = false;
      if (iniciado) algumIniciado = true;
      if (finalizado) algumFinalizado = true;
    });

    return { todosAgendados, algumIniciado, algumFinalizado };
  }, []);


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

    // Validar que grupo foi selecionado
    if (!grupoSelecionado) {
      setMensagem('⚠️ Selecione um grupo no header antes de enviar palpites.');
      setTipoMensagem('erro');
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const id_usuario = payload.id;
      const nome_usuario = payload.nome || payload.username || 'Usuário';
      
      const body = {
        rodada: rodadaAtual,
        campeonatoId: campeonatoId,
        grupoId: grupoSelecionado,
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

      // Lógica de PIX
      if (gerarPix) {
        if (pixPago) {
          // PIX já pago - não gera novo nem exibe
          console.log('[enviarPalpitesQuadro] PIX já pago - apenas salvando palpites');
          setMensagem(`Palpites atualizados com sucesso! (PIX já pago anteriormente)`);
          setTipoMensagem('sucesso');
          setJaEnviado(true);
          return;
        }

        if (pixPendente && dadosPixPendente) {
          // PIX pendente - reutiliza cobrança existente
          console.log('[enviarPalpitesQuadro] PIX pendente encontrado - reutilizando cobrança');
          
          const expiracao = dadosPixPendente.expiracao || 3600;
          const dadosPisix = {
            qr_code: dadosPixPendente.qr_code,
            pix_copiaecola: dadosPixPendente.pix_copiaecola,
            txid: dadosPixPendente.txid,
            expiracao: expiracao
          };
          
          console.log('[enviarPalpitesQuadro] Exibindo PIX pendente:', dadosPisix);
          setDadosPix(dadosPisix);
          setMensagem('Palpites atualizados! Utilize o PIX gerado anteriormente para pagamento.');
          setTipoMensagem('sucesso');
          setJaEnviado(true);
          return;
        }

        // Sem PIX (nem pago nem pendente) - gera nova cobrança
        try {
          console.log('[enviarPalpitesQuadro] Gerando nova cobrança PIX...');
          const txid = codigo_envio;
          console.log('[enviarPalpitesQuadro] Iniciando POST para /pix/cobranca com:', { id_usuario, nome_usuario, codigo_envio, valor: 10.00, txid });
          
          const pixPayload = {
            id_usuario,
            nome_usuario,
            codigo_envio,
            valor: 10.00,
            txid
          };
          
          console.log('[enviarPalpitesQuadro] Payload PIX:', JSON.stringify(pixPayload));
          
          const cobranca = await axios.post(`${API}/pix/cobranca`, pixPayload, {
            headers: { Authorization: `Bearer ${token}` }
          });

          console.log('[enviarPalpitesQuadro] ✅ Resposta recebida da API PIX:', cobranca.status);
          console.log('[enviarPalpitesQuadro] Dados completos:', JSON.stringify(cobranca.data, null, 2));
          console.log('[enviarPalpitesQuadro] cobranca_api:', cobranca.data.cobranca_api);

          if (!cobranca.data.cobranca_api) {
            throw new Error('Resposta da API não contém cobranca_api');
          }

          const dadosPisix = {
            nome_usuario,
            codigo_envio,
            valor: cobranca.data.cobranca_api.valor.original,
            txid: cobranca.data.cobranca_api.txid,
            expiracao: new Date(new Date(cobranca.data.cobranca_api.calendario.criacao).getTime() + (cobranca.data.cobranca_api.calendario.expiracao * 1000)).toISOString(),
            pix_copiaecola: cobranca.data.cobranca_api.pixCopiaECola,
            qr_code_url: cobranca.data.cobranca_api.loc.location
          };
          
          console.log('[enviarPalpitesQuadro] Dados de PIX preparados:', dadosPisix);
          setDadosPix(dadosPisix);
          console.log('[enviarPalpitesQuadro] ✅ setDadosPix chamado com sucesso');

          setMensagem('Palpites enviados! Aguardando pagamento.');
          setTipoMensagem('sucesso');
          setJaEnviado(true);
        } catch (pixErr) {
          console.error('[enviarPalpitesQuadro] ❌ Erro ao gerar PIX - Tipo de erro:', pixErr.constructor.name);
          console.error('[enviarPalpitesQuadro] ❌ Mensagem de erro:', pixErr.message);
          console.error('[enviarPalpitesQuadro] ❌ Status HTTP:', pixErr.response?.status);
          console.error('[enviarPalpitesQuadro] ❌ Dados de erro:', JSON.stringify(pixErr.response?.data, null, 2));
          console.error('[enviarPalpitesQuadro] ❌ URL tentada:', pixErr.config?.url);
          console.error('[enviarPalpitesQuadro] ❌ Headers enviados:', pixErr.config?.headers);
          
          setMensagem(`Palpites salvos, mas erro ao gerar PIX: ${pixErr.response?.data?.error || pixErr.response?.data?.detalhes || pixErr.message}`);
          setTipoMensagem('erro');
        }
      } else {
        console.log('[enviarPalpitesQuadro] gerarPix=false (não é último quadro), apenas salvando palpites');
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

    // Validar que grupo foi selecionado
    if (!grupoSelecionado) {
      setMensagem('⚠️ Selecione um grupo no header antes de enviar palpites.');
      setTipoMensagem('erro');
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const id_usuario = payload.id;
      const nome_usuario = payload.nome || payload.username || 'Usuário';
      
      const body = {
        rodada: rodadaAtual,
        campeonatoId: campeonatoId,
        grupoId: grupoSelecionado,
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

      // Sempre tentar gerar PIX após salvar todos os palpites
      try {
          console.log('[enviarTodosOsPalpites] Gerando PIX após salvar palpites...');
          const txid = codigo_envio;
          console.log('[enviarTodosOsPalpites] Iniciando POST para /pix/cobranca com:', { id_usuario, nome_usuario, codigo_envio, valor: 10.00, txid });
          console.log('[enviarTodosOsPalpites] Token disponível?', !!token);
          console.log('[enviarTodosOsPalpites] API URL:', API);
          
          const pixPayload = {
            id_usuario,
            nome_usuario,
            codigo_envio,
            valor: 10.00,
            txid
          };
          
          console.log('[enviarTodosOsPalpites] Payload PIX:', JSON.stringify(pixPayload));
          
          const cobranca = await axios.post(`${API}/pix/cobranca`, pixPayload, {
            headers: { Authorization: `Bearer ${token}` }
          });

          console.log('[enviarTodosOsPalpites] ✅ Resposta recebida da API PIX:', cobranca.status);
          console.log('[enviarTodosOsPalpites] Dados completos:', JSON.stringify(cobranca.data, null, 2));
          console.log('[enviarTodosOsPalpites] cobranca_api:', cobranca.data.cobranca_api);

          if (!cobranca.data.cobranca_api) {
            throw new Error('Resposta da API não contém cobranca_api');
          }

          const dadosPisix = {
            nome_usuario,
            codigo_envio,
            valor: cobranca.data.cobranca_api.valor.original,
            txid: cobranca.data.cobranca_api.txid,
            expiracao: new Date(new Date(cobranca.data.cobranca_api.calendario.criacao).getTime() + (cobranca.data.cobranca_api.calendario.expiracao * 1000)).toISOString(),
            pix_copiaecola: cobranca.data.cobranca_api.pixCopiaECola,
            qr_code_url: cobranca.data.cobranca_api.loc.location
          };
          
          console.log('[enviarTodosOsPalpites] Dados de PIX preparados:', dadosPisix);
          setDadosPix(dadosPisix);
          console.log('[enviarTodosOsPalpites] ✅ setDadosPix chamado com sucesso');

          setMensagem('Todos os palpites enviados! Aguardando pagamento.');
          setTipoMensagem('sucesso');
          setJaEnviado(true);
          setTemPalpitesServidor(true);
        } catch (pixErr) {
          console.error('[enviarTodosOsPalpites] ❌ Erro ao gerar PIX - Tipo de erro:', pixErr.constructor.name);
          console.error('[enviarTodosOsPalpites] ❌ Mensagem de erro:', pixErr.message);
          console.error('[enviarTodosOsPalpites] ❌ Status HTTP:', pixErr.response?.status);
          console.error('[enviarTodosOsPalpites] ❌ Dados de erro:', JSON.stringify(pixErr.response?.data, null, 2));
          console.error('[enviarTodosOsPalpites] ❌ URL tentada:', pixErr.config?.url);
          console.error('[enviarTodosOsPalpites] ❌ Headers enviados:', pixErr.config?.headers);
          
          setMensagem(`Palpites salvos, mas erro ao gerar PIX: ${pixErr.response?.data?.error || pixErr.response?.data?.detalhes || pixErr.message}`);
          setTipoMensagem('erro');
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

  // Verificar se todos os quadros estão encerrados
  const todosQuadrosEncerrados = useMemo(() => {
    if (quadrosDeJogos.length === 0) return false;
    
    const agora = new Date();
    return quadrosDeJogos.every(quadro => {
      // Verificar se o horário passou
      const horarioPassed = quadro.dataHora <= agora;
      
      // Verificar se todos os jogos do quadro estão em andamento ou finalizados
      const statusJogos = verificarStatusJogos(quadro);
      const jogosNaoEditaveis = statusJogos.algumIniciado || statusJogos.algumFinalizado;
      
      return horarioPassed || jogosNaoEditaveis;
    });
  }, [quadrosDeJogos, verificarStatusJogos]);

  // Debug: log dos estados PIX
  console.log('[PalpitePage RENDER] pixPago:', pixPago, 'pixPendente:', pixPendente, 'dadosPixPendente:', dadosPixPendente);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>{rodadaAtual ? `Palpites - Rodada ${rodadaAtual}` : 'Palpites'}</h2>

      {/* Informação sobre status do PIX */}
      {(pixPago || pixPendente) && (
        <div style={pixPago ? styles.statusPixPago : styles.statusPixPendente}>
          {pixPago ? (
            <>
              <span style={styles.statusPixIcone}>✅</span>
              <span style={styles.statusPixTexto}>PIX Confirmado - Palpites registrados</span>
            </>
          ) : (
            <>
              <span style={styles.statusPixIcone}>⏳</span>
              <span style={styles.statusPixTexto}>
                Cobrança PIX gerada - Aguardando pagamento
                {dadosPixPendente?.valor_original && ` (R$ ${(dadosPixPendente.valor_original / 100).toFixed(2)})`}
              </span>
            </>
          )}
        </div>
      )}

      <div style={styles.navegacao}>
        <button
          disabled={rodadaAtual === 1}
          onClick={() => {
            setRodadaAtual(r => {
              const base = (r == null ? 7 : r); // fallback para navegar quando nulo
              const next = Math.max(1, base - 1);
              return next;
            });
            setMensagem('');
          }}
          style={styles.navBtn}
        >⬅ Anterior</button>
        <button
          disabled={rodadaAtual === 38}
          onClick={() => {
            setRodadaAtual(r => {
              const base = (r == null ? 7 : r);
              const next = Math.min(38, base + 1);
              return next;
            });
            setMensagem('');
          }}
          style={styles.navBtn}
        >Próxima ➡</button>
      </div>

      {jogos.length === 0 ? (
        <p style={styles.mensagem}>Nenhum jogo encontrado para essa rodada.</p>
      ) : (
        <>
          <button
            onClick={enviarTodosOsPalpites}
            style={{
              ...styles.enviarTodosBtn,
              opacity: (quadrosEnviados.size > 0 || todosQuadrosEncerrados) ? 0.5 : 1
            }}
            disabled={quadrosEnviados.size > 0 || todosQuadrosEncerrados}
          >
            🚀 {temPalpitesServidor ? 'Atualizar Todos os Palpites' : 'Enviar Todos os Palpites'}
          </button>
          {quadrosEnviados.size > 0 && (
            <p style={styles.mensagemInfo}>
              ℹ️ Você já enviou palpites individualmente. Use os botões de cada horário para atualizar.
            </p>
          )}
          {todosQuadrosEncerrados && quadrosEnviados.size === 0 && (
            <p style={styles.mensagemInfo}>
              ⏰ Todos os horários foram encerrados.
            </p>
          )}

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
              verificarStatusJogos={verificarStatusJogos}
              pixPago={pixPago}
              pixPendente={pixPendente}
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
const QuadroDeJogos = ({ quadro, palpites, handleInput, enviarPalpitesQuadro, formatarDataHora, ehUltimoQuadro, jaEnviado, verificarStatusJogos, pixPago, pixPendente }) => {
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

  // Verificar status dos jogos deste quadro
  const statusJogos = verificarStatusJogos(quadro);
  const { algumIniciado, algumFinalizado } = statusJogos;

  // Determinar se o botão deve estar desabilitado
  const botaoDesabilitado = fechado || algumIniciado || algumFinalizado;

  // Determinar o texto do botão baseado no status
  let textoBotao = '';
  if (fechado) {
    textoBotao = '❌ Horário encerrado';
  } else if (algumFinalizado) {
    textoBotao = '🔒 Jogos finalizados';
  } else if (algumIniciado) {
    textoBotao = '🔒 Jogos em andamento';
  } else if (pixPendente && ehUltimoQuadro) {
    textoBotao = jaEnviado ? '✏️ Atualizar + Ver PIX pendente' : '📄 Ver PIX pendente';
  } else {
    textoBotao = jaEnviado ? '✏️ Atualizar palpites' : `📤 Enviar palpites${ehUltimoQuadro ? ' (gera PIX)' : ''}`;
  }

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
        style={{ ...styles.enviarQuadroBtn, opacity: botaoDesabilitado ? 0.5 : 1 }}
        disabled={botaoDesabilitado}
      >
        {textoBotao}
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  mensagemInfo: {
    marginTop: '0.5rem',
    marginBottom: '1rem',
    color: '#58A6FF',
    backgroundColor: 'rgba(88, 166, 255, 0.1)',
    border: '1px solid #58A6FF',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: 'clamp(0.75rem, 2.5vw, 0.85rem)',
    textAlign: 'center',
    width: '90%',
    maxWidth: '400px',
  },
  statusPixPago: {
    marginTop: '0.5rem',
    marginBottom: '1rem',
    padding: '12px 16px',
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    border: '2px solid #00FF88',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '90%',
    maxWidth: '500px',
  },
  statusPixPendente: {
    marginTop: '0.5rem',
    marginBottom: '1rem',
    padding: '12px 16px',
    backgroundColor: 'rgba(255, 170, 0, 0.15)',
    border: '2px solid #FFA500',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '90%',
    maxWidth: '500px',
  },
  statusPixIcone: {
    fontSize: 'clamp(1.2rem, 4vw, 1.5rem)',
  },
  statusPixTexto: {
    fontSize: 'clamp(0.85rem, 2.5vw, 1rem)',
    fontWeight: 'bold',
    color: '#FFF',
  }
};

export default PalpitePage;
