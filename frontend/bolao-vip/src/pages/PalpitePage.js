import React, { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import storage from '../utils/storage';
import PixModal from '../components/pixModal';
import OpcoesPagamentoModal from '../components/OpcoesPagamentoModal';
import API_BASE_URL from '../config';
import './PalpitePage.css';
import '../styles/RodadaNav.css';

const API = API_BASE_URL;

const PalpitePage = () => {
  console.error('[PalpitePage] 🎯🎯🎯 COMPONENTE COMEÇOU A EXECUTAR 🎯🎯🎯');
  console.log('[PalpitePage] 🎯 Componente MONTANDO/RENDERIZANDO');
  
  console.log('[PalpitePage] Tentando inicializar useState para rodadaAtual...');
  const [rodadaAtual, setRodadaAtual] = useState(null);
  console.log('[PalpitePage] ✅ rodadaAtual inicializado');
  
  console.log('[PalpitePage] Tentando inicializar useState para jogos...');
  const [jogos, setJogos] = useState([]);
  console.log('[PalpitePage] ✅ jogos inicializado');
  
  const [palpites, setPalpites] = useState({});
  const [grupoSelecionado, setGrupoSelecionado] = useState(null);
  const [grupoCarregado, setGrupoCarregado] = useState(false);
  const [contextKey, setContextKey] = useState(0);
  const [campeonatoId, setCampeonatoId] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const [tipoMensagem, setTipoMensagem] = useState('');
  const [dadosPix, setDadosPix] = useState(null);
  const [jaEnviado, setJaEnviado] = useState(false);
  const [temPalpitesServidor, setTemPalpitesServidor] = useState(false);
  const [quadrosEnviados, setQuadrosEnviados] = useState(new Set());
  const [pixPago, setPixPago] = useState(false);
  const [pixPendente, setPixPendente] = useState(false);
  const [dadosPixPendente, setDadosPixPendente] = useState(null);
  const [usuarioBloqueado, setUsuarioBloqueado] = useState(false);
  const [totalPendente, setTotalPendente] = useState(0);
  const [mensagemBloqueio, setMensagemBloqueio] = useState('');
  const [processando, setProcessando] = useState(false);
  const [mensagemProcessando, setMensagemProcessando] = useState('');
  const [dadosSaldoInsuficiente, setDadosSaldoInsuficiente] = useState(null);
  const [quadroEmProcessamento, setQuadroEmProcessamento] = useState(null);
  const [mostrarOpcoesModal, setMostrarOpcoesModal] = useState(false);

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
    const gidStr = storage.getItem('grupoId');
    const gidNum = gidStr ? Number(gidStr) : null;
    console.log('[PalpitePage] 🔧 useEffect MOUNT - Sincronizando grupoId do storage:', gidNum);
    setGrupoSelecionado(gidNum);
    setGrupoCarregado(true);
    console.log('[PalpitePage] ✅ grupoCarregado definido como TRUE');
    
    // Se não tem grupoId no mount, aguarda até aparecer
    if (!gidNum) {
      console.log('[PalpitePage] ⚠️ Nenhum grupoId encontrado no mount. Aguardando Header salvar...');
    }
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

      setGrupoSelecionado(gidNum);
      setContextKey((k) => k + 1);
    });

    // Polling para detectar mudanças (essencial para Simple Browser e mobile)
    const cleanupWatcher = storage.createStorageWatcher('grupoId', (newValue) => {
      const timestamp = new Date().toISOString();
      const gidNum = newValue ? Number(newValue) : null;
      if (gidNum !== grupoSelecionado) {
        console.log(`[PalpitePage ${timestamp}] 🔄 Watcher detectou mudança: ${grupoSelecionado} → ${gidNum}`);
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
    if (!grupoSelecionado || !token) {
      console.log(`[PalpitePage] Reset ao mudar grupo - SKIP (grupoSelecionado=${grupoSelecionado}, token=${!!token})`);
      return;
    }
    
    const timestamp = new Date().toISOString();
    console.log(`[PalpitePage ${timestamp}] 🔄 Grupo mudou para: ${grupoSelecionado}, carregando campeonato...`);


    async function carregarCampeonatoDoGrupo() {
      try {
        const res = await axios.get(`${API}/grupos/${grupoSelecionado}/contexto`, authHeader);
        const campId = res.data.campeonatoId || res.data.campeonato_id || null;
        setCampeonatoId(campId);
        console.log(`[PalpitePage ${timestamp}] ✅ Campeonato carregado: ${campId}`);

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
      console.log(`[PalpitePage] Aguardando dados: campeonatoId=${campeonatoId}, grupoSelecionado=${grupoSelecionado}, grupoCarregado=${grupoCarregado}`);
      return;
    }

    async function buscarRodadaVigente() {
      const myKey = contextKey;
      const timestamp = new Date().toISOString();
      try {
        const params = new URLSearchParams();
        if (grupoSelecionado) params.append('grupoId', grupoSelecionado);
        if (campeonatoId) params.append('campeonatoId', campeonatoId);

        console.log(`[PalpitePage ${timestamp}] 🔍 Buscando rodada vigente com params:`, params.toString());
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
        console.log(`[PalpitePage ${timestamp}] ✅ Rodada vigente carregada: rodada=${rodadaResp}, jogos=${jogosResp.length}`);
      } catch (err) {
        console.error('Erro ao buscar rodada vigente:', err);
        if (myKey !== contextKey) return;
        setRodadaAtual(null);
        setJogos([]);
        setMensagem('Erro ao buscar dados da rodada. Verifique se um grupo foi selecionado.');
        setTipoMensagem('erro');
      }
    }

    buscarRodadaVigente();
  }, [campeonatoId, grupoSelecionado, authHeader, contextKey, grupoCarregado]);

  // 🆕 Verificar se usuário está bloqueado por pagamentos pendentes
  useEffect(() => {
    if (!token || !grupoCarregado) return;

    async function verificarBloqueio() {
      try {
        const res = await axios.get(`${API}/palpites/verificar-bloqueio`, authHeader);
        const { bloqueado, total_pendente, mensagem: msg } = res.data;
        
        setUsuarioBloqueado(bloqueado);
        setTotalPendente(total_pendente || 0);
        setMensagemBloqueio(msg || '');

        if (bloqueado) {

        }
      } catch (err) {
        console.error('[PalpitePage] Erro ao verificar bloqueio:', err);
        // Não bloqueia em caso de erro na verificação
        setUsuarioBloqueado(false);
      }
    }

    verificarBloqueio();
  }, [token, authHeader, grupoCarregado]);

  // Busca jogos ao navegar rodadas
  useEffect(() => {
    if (!rodadaAtual || !campeonatoId) return;

    // Reset estados quando a rodada muda

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


        const res = await axios.get(`${API}/palpites/verificar-pagamento/${rodadaAtual}?${params.toString()}`, authHeader);
        
        setPixPago(res.data.pixPago || false);
        setPixPendente(res.data.pixPendente || false);
        setDadosPixPendente(res.data.dadosPix || null);
        

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


  const enviarPalpitesQuadro = async (quadro, gerarPix = false, opcaoPagamento = null) => {
    const jogosEditaveis = quadro.jogos.filter(j => {
      const status = (j.status || '').toLowerCase();
      return status === 'agendado' || status === 'programado' || status === 'agendada' || status === 'pre-jogo';
    });

    if (jogosEditaveis.length === 0) {
      setMensagem('Todos os jogos deste horário já iniciaram ou foram encerrados.');
      setTipoMensagem('erro');
      return;
    }

    const jogosComNull = jogosEditaveis.filter(jogo => {
      const key = (jogo.id ?? jogo.partida_id);
      const p = palpites[key] || {};
      const casaVazio = p.placar_casa === undefined || p.placar_casa === '' || p.placar_casa === null;
      const foraVazio = p.placar_fora === undefined || p.placar_fora === '' || p.placar_fora === null;
      return casaVazio || foraVazio;
    });

    if (jogosComNull.length > 0) {
      setMensagem('Preencha todos os placares deste horário antes de enviar.');
      setTipoMensagem('erro');
      return;
    }

    // 🆕 Verificar se usuário está bloqueado
    if (usuarioBloqueado) {
      setMensagem(`⛔ ${mensagemBloqueio}`);
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
      // 🆕 Ativar loading
      setProcessando(true);
      setMensagemProcessando('Enviando palpites...');
      
      const payload = JSON.parse(atob(token.split('.')[1]));
      const id_usuario = payload.id;
      const nome_usuario = payload.nome || payload.username || 'Usuário';
      
      const body = {
        rodada: rodadaAtual,
        campeonatoId: campeonatoId,
        grupoId: grupoSelecionado,
        palpites: jogosEditaveis.map(jogo => {
          const key = (jogo.id ?? jogo.partida_id);
          return {
            jogo_id: key,
            placar_casa: Number(palpites[key]?.placar_casa),
            placar_fora: Number(palpites[key]?.placar_fora),
          };
        })
      };

      // 🆕 Se tem opcao_pagamento, adicionar ao body
      if (opcaoPagamento) {
        body.opcao_pagamento = opcaoPagamento;

      }

      const res = await axios.post(`${API}/palpites/enviar`, body, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // 🆕 VERIFICAR SE SALDO É INSUFICIENTE
      if (res.data.saldo_insuficiente) {

        setDadosSaldoInsuficiente({
          saldo_atual: res.data.saldo_atual,
          valor_palpite: res.data.valor_palpite,
          diferenca: res.data.diferenca,
          saldo_negativo: res.data.saldo_negativo || false,
          valor_para_zerar_debito: res.data.valor_para_zerar_debito || 0,
          total_pix_necessario: res.data.total_pix_necessario || res.data.valor_palpite
        });
        setQuadroEmProcessamento(quadro);
        setMostrarOpcoesModal(true);
        return; // Para aqui e aguarda escolha do usuário
      }

      const { codigo_envio, precisa_gerar_pix, valor_pix, pagamento_completo } = res.data;

      setQuadrosEnviados(prev => new Set([...prev, quadro.chave]));

      // 🆕 SALDO FOI USADO - Pagamento completo
      if (pagamento_completo) {

        setMensagem(`✅ ${res.data.mensagem}`);
        setTipoMensagem('sucesso');
        setJaEnviado(true);
        return; // Não precisa gerar PIX
      }

      // Lógica de PIX
      if (gerarPix) {
        // 🆕 Se precisa_gerar_pix=true (PIX integral ou parcial)
        if (precisa_gerar_pix && valor_pix > 0) {
          if (pixPago) {

            setMensagem(`Palpites atualizados com sucesso! (PIX já pago anteriormente)`);
            setTipoMensagem('sucesso');
            setJaEnviado(true);
          } else if (pixPendente && dadosPixPendente) {

            
            const expiracao = dadosPixPendente.expiracao || 3600;
            const dadosPisix = {
              qr_code: dadosPixPendente.qr_code,
              pix_copiaecola: dadosPixPendente.pix_copiaecola,
              txid: dadosPixPendente.txid,
              expiracao: expiracao
            };
            

            setDadosPix(dadosPisix);
            setMensagem(res.data.mensagem || 'Palpites atualizados! Utilize o PIX gerado anteriormente para pagamento.');
            setTipoMensagem('sucesso');
            setJaEnviado(true);
          } else {
            // Gerar nova cobrança PIX com o valor correto (integral ou parcial)
            try {
              // 🆕 Atualizar mensagem de loading
              setMensagemProcessando(`Gerando cobrança PIX de R$ ${valor_pix.toFixed(2)}...`);
              
              const txid = codigo_envio;
              
              const pixPayload = {
                id_usuario,
                nome_usuario,
                codigo_envio,
                valor: valor_pix, // 🆕 Usa valor retornado pela API (integral ou diferença)
                txid
              };
            

              
              const cobranca = await axios.post(`${API}/pix/cobranca`, pixPayload, {
                headers: { Authorization: `Bearer ${token}` }
              });



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
              
              setDadosPix(dadosPisix);

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
          }
        } else {
          setMensagem(`Palpites do horário ${quadro.chave.split('_')[1]} salvos com sucesso!`);
          setTipoMensagem('sucesso');
        }
      } else {
        setMensagem(`Palpites do horário ${quadro.chave.split('_')[1]} salvos com sucesso!`);
        setTipoMensagem('sucesso');
      }
    } catch (err) {
      console.error('Erro ao enviar palpites:', err);
      setMensagem('Erro ao enviar palpites.');
      setTipoMensagem('erro');
    } finally {
      // 🆕 Desativar loading
      setProcessando(false);
      setMensagemProcessando('');
    }
  };

  const enviarTodosOsPalpites = async () => {
    const todosJogosEditaveis = jogos.filter(j => {
      const status = (j.status || '').toLowerCase();
      return status === 'agendado' || status === 'programado' || status === 'agendada' || status === 'pre-jogo';
    });

    if (todosJogosEditaveis.length === 0) {
      setMensagem('Todos os jogos já iniciaram ou foram encerrados.');
      setTipoMensagem('erro');
      return;
    }

    const jogosComNull = todosJogosEditaveis.filter(jogo => {
      const key = (jogo.id ?? jogo.partida_id);
      const p = palpites[key] || {};
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

    // 🆕 Verificar se usuário está bloqueado
    if (usuarioBloqueado) {
      setMensagem(`⛔ ${mensagemBloqueio}`);
      setTipoMensagem('erro');
      return;
    }

    try {
      // 🆕 Ativar loading
      setProcessando(true);
      setMensagemProcessando('Enviando todos os palpites...');
      
      const payload = JSON.parse(atob(token.split('.')[1]));
      const id_usuario = payload.id;
      const nome_usuario = payload.nome || payload.username || 'Usuário';
      
      const body = {
        rodada: rodadaAtual,
        campeonatoId: campeonatoId,
        grupoId: grupoSelecionado,
        palpites: todosJogosEditaveis.map(jogo => {
          const key = (jogo.id ?? jogo.partida_id);
          return {
            jogo_id: key,
            placar_casa: Number(palpites[key]?.placar_casa),
            placar_fora: Number(palpites[key]?.placar_fora),
          };
        })
      };

      const res = await axios.post(`${API}/palpites/enviar`, body, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // 🆕 VERIFICAR SE SALDO É INSUFICIENTE
      if (res.data.saldo_insuficiente) {
        setDadosSaldoInsuficiente({
          saldo_atual: res.data.saldo_atual,
          valor_palpite: res.data.valor_palpite,
          diferenca: res.data.diferenca,
          saldo_negativo: res.data.saldo_negativo || false,
          valor_para_zerar_debito: res.data.valor_para_zerar_debito || 0,
          total_pix_necessario: res.data.total_pix_necessario || res.data.valor_palpite
        });
        setQuadroEmProcessamento({ chave: 'todos' }); // Marca como "todos os palpites"
        setMostrarOpcoesModal(true);
        return;
      }

      const { codigo_envio, precisa_gerar_pix, valor_pix, pagamento_completo } = res.data;

      // 🆕 SALDO FOI USADO - Pagamento completo
      if (pagamento_completo) {
        setMensagem(`✅ ${res.data.mensagem}`);
        setTipoMensagem('sucesso');
        setJaEnviado(true);
        setTemPalpitesServidor(true);
        return;
      }

      // Se precisa gerar PIX
      if (precisa_gerar_pix && valor_pix > 0) {
        if (pixPago) {
          setMensagem(`Palpites atualizados com sucesso! (PIX já pago anteriormente)`);
          setTipoMensagem('sucesso');
          setJaEnviado(true);
          setTemPalpitesServidor(true);
          return;
        }

        if (pixPendente && dadosPixPendente) {
          const expiracao = dadosPixPendente.expiracao || 3600;
          const dadosPisix = {
            qr_code: dadosPixPendente.qr_code,
            pix_copiaecola: dadosPixPendente.pix_copiaecola,
            txid: dadosPixPendente.txid,
            expiracao: expiracao
          };
          
          setDadosPix(dadosPisix);
          setMensagem(res.data.mensagem || 'Palpites atualizados! Utilize o PIX gerado anteriormente para pagamento.');
          setTipoMensagem('sucesso');
          setJaEnviado(true);
          setTemPalpitesServidor(true);
          return;
        }

        // Gerar nova cobrança PIX
        try {
          // 🆕 Atualizar mensagem de loading
          setMensagemProcessando(`Gerando cobrança PIX de R$ ${valor_pix.toFixed(2)}...`);
          
          const txid = codigo_envio;
          const pixPayload = {
            id_usuario,
            nome_usuario,
            codigo_envio,
            valor: valor_pix,
            txid
          };
          
          const cobranca = await axios.post(`${API}/pix/cobranca`, pixPayload, {
            headers: { Authorization: `Bearer ${token}` }
          });

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
          
          setDadosPix(dadosPisix);
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
      } else {
        setMensagem('Todos os palpites enviados com sucesso!');
        setTipoMensagem('sucesso');
        setJaEnviado(true);
        setTemPalpitesServidor(true);
      }
    } catch (err) {
      console.error('Erro ao enviar todos os palpites:', err);
      setMensagem('Erro ao enviar palpites.');
      setTipoMensagem('erro');
    } finally {
      // 🆕 Desativar loading
      setProcessando(false);
      setMensagemProcessando('');
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


  // 🆕 Handler para escolha de opção de pagamento
  const handleEscolherOpcaoPagamento = async (opcao) => {
    if (!quadroEmProcessamento) {
      return;
    }

    // Fechar modal
    setMostrarOpcoesModal(false);
    
    // 🆕 Ativar loading
    setProcessando(true);
    setMensagemProcessando('Processando pagamento...');

    // Verificar se é "todos os palpites" ou um quadro específico
    if (quadroEmProcessamento.chave === 'todos') {
      // Reenviar TODOS os palpites com a opção escolhida
      const todosJogosEditaveis = jogos.filter(j => {
        const status = (j.status || '').toLowerCase();
        return status === 'agendado' || status === 'programado' || status === 'agendada' || status === 'pre-jogo';
      });

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const body = {
          rodada: rodadaAtual,
          campeonatoId: campeonatoId,
          grupoId: grupoSelecionado,
          opcao_pagamento: opcao,
          palpites: todosJogosEditaveis.map(jogo => {
            const key = (jogo.id ?? jogo.partida_id);
            return {
              jogo_id: key,
              placar_casa: Number(palpites[key]?.placar_casa),
              placar_fora: Number(palpites[key]?.placar_fora),
            };
          })
        };

        const res = await axios.post(`${API}/palpites/enviar`, body, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const { precisa_gerar_pix, valor_pix, pagamento_completo } = res.data;

        if (pagamento_completo) {
          setMensagem(`✅ ${res.data.mensagem}`);
          setTipoMensagem('sucesso');
          setJaEnviado(true);
          setTemPalpitesServidor(true);
        } else if (precisa_gerar_pix && valor_pix > 0) {
          // 🆕 Atualizar mensagem de loading
          setMensagemProcessando(`Gerando cobrança PIX de R$ ${valor_pix.toFixed(2)}...`);
          
          // Gerar PIX com o valor correto
          const { codigo_envio } = res.data;
          const id_usuario = payload.id;
          const nome_usuario = payload.nome || payload.username || 'Usuário';
          
          const pixPayload = {
            id_usuario,
            nome_usuario,
            codigo_envio,
            valor: valor_pix,
            txid: codigo_envio
          };
          
          const cobranca = await axios.post(`${API}/pix/cobranca`, pixPayload, {
            headers: { Authorization: `Bearer ${token}` }
          });

          const dadosPisix = {
            nome_usuario,
            codigo_envio,
            valor: cobranca.data.cobranca_api.valor.original,
            txid: cobranca.data.cobranca_api.txid,
            expiracao: new Date(new Date(cobranca.data.cobranca_api.calendario.criacao).getTime() + (cobranca.data.cobranca_api.calendario.expiracao * 1000)).toISOString(),
            pix_copiaecola: cobranca.data.cobranca_api.pixCopiaECola,
            qr_code_url: cobranca.data.cobranca_api.loc.location
          };
          
          setDadosPix(dadosPisix);
          setMensagem('Todos os palpites enviados! Aguardando pagamento.');
          setTipoMensagem('sucesso');
          setJaEnviado(true);
          setTemPalpitesServidor(true);
        }
      } catch (err) {
        console.error('[handleEscolherOpcaoPagamento] Erro:', err);
        setMensagem('Erro ao processar pagamento.');
        setTipoMensagem('erro');
      } finally {
        // 🆕 Desativar loading
        setProcessando(false);
        setMensagemProcessando('');
      }
    } else {
      // Reenviar palpites de UM QUADRO específico com a opção escolhida
      const gerarPix = opcao !== 'saldo';
      await enviarPalpitesQuadro(quadroEmProcessamento, gerarPix, opcao);
    }

    // Limpar estados temporários
    setDadosSaldoInsuficiente(null);
    setQuadroEmProcessamento(null);
  };

  try {
    console.log('[PalpitePage] 📤 Iniciando JSX return');
  } catch (e) {
    console.error('[PalpitePage] ❌ Erro antes do return:', e);
  }

  return (
    <div style={styles.container}>
      {/* 🆕 Overlay de Loading */}
      {processando && (
        <div style={styles.loadingOverlay}>
          <div style={styles.loadingContent}>
            <div style={styles.spinner}></div>
            <p style={styles.loadingText}>{mensagemProcessando}</p>
          </div>
        </div>
      )}
      
      <div className="rodada-nav-bar">
        <button
          className="rodada-nav-btn rodada-nav-prev"
          disabled={!rodadaAtual || rodadaAtual <= 1}
          onClick={() => {
            setRodadaAtual(r => {
              const base = (r == null ? 7 : r);
              const next = Math.max(1, base - 1);
              return next;
            });
            setMensagem('');
          }}
        >
          &lt;
        </button>

        <button
          className="rodada-nav-btn rodada-nav-next"
          disabled={rodadaAtual >= 38}
          onClick={() => {
            setRodadaAtual(r => {
              const base = (r == null ? 7 : r);
              const next = Math.min(38, base + 1);
              return next;
            });
            setMensagem('');
          }}
        >
          &gt;
        </button>
      </div>

      <h2 style={styles.title}>{rodadaAtual ? `Palpites - Rodada ${rodadaAtual}` : 'Palpites'}</h2>

      {!grupoCarregado && (
        <div style={{ backgroundColor: '#333', color: '#FFA', padding: '12px 16px', borderRadius: '8px', border: '1px solid #666', marginBottom: '12px', textAlign: 'center', fontSize: '0.95rem' }}>
          ⏳ Carregando dados do grupo...
        </div>
      )}

      {!grupoSelecionado && grupoCarregado && (
        <div style={{ backgroundColor: '#333', color: '#fff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #666', marginBottom: '12px', textAlign: 'center' }}>
          ⚠️ Selecione um grupo no topo para carregar os jogos.
        </div>
      )}

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

      {/* 🆕 Alerta de Bloqueio */}
      {usuarioBloqueado && (
        <div style={{
          backgroundColor: '#ff4444',
          color: '#fff',
          padding: '16px',
          borderRadius: '8px',
          margin: '20px 0',
          textAlign: 'center',
          fontWeight: 'bold',
          border: '2px solid #cc0000'
        }}>
          ⛔ {mensagemBloqueio}
        </div>
      )}

      {dadosPix && (
        <PixModal
          dadosPix={dadosPix}
          onClose={() => setDadosPix(null)}
        />
      )}

      {/* 🆕 Modal de Opções de Pagamento */}
      {mostrarOpcoesModal && dadosSaldoInsuficiente && (
        <OpcoesPagamentoModal
          isOpen={mostrarOpcoesModal}
          onClose={() => {
            setMostrarOpcoesModal(false);
            setDadosSaldoInsuficiente(null);
            setQuadroEmProcessamento(null);
          }}
          saldoAtual={dadosSaldoInsuficiente.saldo_atual}
          valorPalpite={dadosSaldoInsuficiente.valor_palpite}
          diferenca={dadosSaldoInsuficiente.diferenca}
          saldoNegativo={dadosSaldoInsuficiente.saldo_negativo}
          valorDebitoNegativo={dadosSaldoInsuficiente.valor_para_zerar_debito}
          totalPixNecessario={dadosSaldoInsuficiente.total_pix_necessario}
          onEscolherOpcao={handleEscolherOpcaoPagamento}
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
          const jogoKey = (jogo.id ?? jogo.partida_id);

          return (
            <div key={jogoKey} style={styles.jogo}>
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
                  value={palpites[jogoKey]?.placar_casa ?? ''}
                  onChange={(e) => handleInput(jogoKey, 'placar_casa', e.target.value)}
                  style={styles.input}
                />
                <span style={styles.x}>x</span>
                <input
                  type="number"
                  min="0"
                  disabled={fechado || jogoFechado}
                  value={palpites[jogoKey]?.placar_fora ?? ''}
                  onChange={(e) => handleInput(jogoKey, 'placar_fora', e.target.value)}
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
    wordBreak: 'break-word',
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
    maxWidth: '100%',
    backgroundColor: '#1C2128',
    borderRadius: '12px',
    padding: 'clamp(0.5rem, 3vw, 1.5rem)',
    marginBottom: 'clamp(0.6rem, 2vw, 1.5rem)',
    border: '2px solid #30363D',
  },
  quadroHeader: {
    marginBottom: 'clamp(0.5rem, 2vw, 1rem)',
    textAlign: 'center',
  },
  quadroTitulo: {
    color: '#58A6FF',
    fontSize: 'clamp(0.9rem, 3vw, 1.2rem)',
    marginBottom: 'clamp(0.3rem, 1.5vw, 0.5rem)',
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
    gap: 'clamp(0.5rem, 2vw, 0.75rem)',
    marginBottom: 'clamp(0.6rem, 2vw, 1rem)',
  },
  jogo: {
    backgroundColor: '#161B22',
    padding: 'clamp(0.5rem, 3vw, 1rem)',
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
    marginBottom: 'clamp(0.4rem, 2vw, 0.75rem)',
    gap: 'clamp(0.2rem, 1.5vw, 0.75rem)',
    flexWrap: 'wrap',
  },
  timeCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  escudo: {
    width: 'clamp(36px, 12vw, 55px)',
    height: 'clamp(36px, 12vw, 55px)',
    objectFit: 'contain',
    backgroundColor: '#fff',
    borderRadius: '50%',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
  },
  nomeTime: {
    fontSize: 'clamp(0.65rem, 2.5vw, 0.85rem)',
    marginTop: 'clamp(2px, 1vw, 4px)',
    textAlign: 'center',
    wordBreak: 'break-word',
    maxWidth: '100%',
    lineHeight: '1.2',
  },
  placarLinha: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 'clamp(0.3rem, 1.5vw, 0.5rem)',
    gap: 'clamp(0.35rem, 2vw, 1rem)',
    width: '100%',
    flexWrap: 'wrap',
  },
  input: {
    width: 'clamp(45px, 14vw, 65px)',
    height: 'clamp(40px, 10vw, 44px)',
    padding: '0px',
    backgroundColor: '#222',
    border: '1px solid #444',
    color: 'white',
    borderRadius: '6px',
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'clamp(0.95rem, 3.5vw, 1.4rem)',
    fontWeight: 'bold',
    transition: 'all 0.2s ease',
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
  },
  // 🆕 Estilos do Loading Overlay
  loadingOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  loadingContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
  },
  spinner: {
    width: '60px',
    height: '60px',
    border: '6px solid rgba(0, 255, 136, 0.2)',
    borderTop: '6px solid #00FF88',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    color: '#00FF88',
    fontSize: 'clamp(1rem, 3vw, 1.2rem)',
    fontWeight: 'bold',
    textAlign: 'center',
    margin: 0,
  }
};

export default PalpitePage;
