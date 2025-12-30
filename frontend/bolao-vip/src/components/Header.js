import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlignJustify } from 'lucide-react';
import axios from 'axios';
import storage from '../utils/storage';
import SaldoDropdown from './SaldoDropdown';
import TimeFavoritoModal from './TimeFavoritoModal';
import API_BASE_URL from '../config';
import './Header.css';

const API = API_BASE_URL;
const PLACEHOLDER_ESCUDO = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none"><rect width="96" height="96" rx="16" fill="%23888"/><path d="M24 24h48v48H24z" fill="%23A0A0A0"/><path d="M36 52c6 6 18 6 24 0" stroke="%23CFCFCF" stroke-width="4" stroke-linecap="round"/><circle cx="40" cy="42" r="4" fill="%23CFCFCF"/><circle cx="56" cy="42" r="4" fill="%23CFCFCF"/></svg>';

const Header = () => {
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);
  const [grupos, setGrupos] = useState([]);
  const [grupoSelecionado, setGrupoSelecionado] = useState('');
  const [token, setToken] = useState(null);
  const [nomeUsuario, setNomeUsuario] = useState(() => storage.getItem('userName') || '');
  const [perfisUsuario, setPerfisUsuario] = useState([]);
  const [badgePendencias, setBadgePendencias] = useState(0);
  const [timeFavorito, setTimeFavorito] = useState(null);
  const [showTimeFavoritoModal, setShowTimeFavoritoModal] = useState(false);
  const location = useLocation();
  const primeiroNome = useMemo(() => {
    if (!nomeUsuario) return '';
    const partes = String(nomeUsuario).trim().split(/\s+/);
    return partes[0] || '';
  }, [nomeUsuario]);

  // Resolve token dinamicamente (útil após limpar storage no Simple Browser)
  useEffect(() => {
    const resolveToken = () => {
      const params = new URLSearchParams(window.location.search);
      const tParam = params.get('token');
      if (tParam && process.env.NODE_ENV !== 'production') {
        storage.setItem('token', tParam);
        return tParam;
      }
      const tStorage = storage.getItem('token');
      
      // Validação básica: se tem token mas parece expirado, limpa
      if (tStorage) {
        try {
          const parts = tStorage.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            const agora = Date.now() / 1000;
            if (payload.exp && payload.exp < agora) {
              console.log('[Header] Token expirado detectado, removendo');
              storage.removeItem('token');
              storage.removeItem('refreshToken');
              window.dispatchEvent(new Event('authChange'));
              return null;
            }
          }
        } catch (e) {
          console.warn('[Header] Erro ao validar token:', e);
        }
        return tStorage;
      }
      
      if (process.env.REACT_APP_DEV_TOKEN && process.env.NODE_ENV !== 'production') {
        return process.env.REACT_APP_DEV_TOKEN;
      }
      return null;
    };

    setToken(resolveToken());

    const cleanup = storage.onStorageChange(() => {
      setToken(resolveToken());
    });
    return cleanup;
  }, []);

  // Sincroniza grupoSelecionado com storage (Header reflete seleção do usuário)
  useEffect(() => {
    const cleanupStorageEvent = storage.onStorageChange(() => {
      const gid = storage.getItem('grupoId');
      const gidNum = gid ? Number(gid) : null;
      console.log('[Header] Storage event - grupoId mudou para:', gidNum);
      setGrupoSelecionado(gidNum);
    });

    const cleanupWatcher = storage.createStorageWatcher('grupoId', (newValue) => {
      const gidNum = newValue ? Number(newValue) : null;
      if (gidNum !== grupoSelecionado && gidNum !== null) {
        console.log('[Header] Polling - grupoId mudou de', grupoSelecionado, 'para', gidNum);
        setGrupoSelecionado(gidNum);
      }
    }, 250);

    return () => {
      cleanupStorageEvent();
      cleanupWatcher();
    };
  }, [grupoSelecionado]);

  // Sincroniza nome do usuário salvo no storage (mostra saudação logo após login)
  useEffect(() => {
    const cleanup = storage.createStorageWatcher('userName', (novoNome) => {
      setNomeUsuario(novoNome || '');
    }, 400);
    return cleanup;
  }, []);

  const authHeader = useMemo(() => (token ? { headers: { Authorization: `Bearer ${token}` } } : {}), [token]);

  const toggleMenu = () => setMenuAberto(!menuAberto);
  const fecharMenu = () => setMenuAberto(false);

  // Fecha menu ao redimensionar tela
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768 && menuAberto) {
        setMenuAberto(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [menuAberto]);

  // Carregar grupos ao carregar a página
  useEffect(() => {
    if (!token) {
      console.log('[Header] useEffect montagem: sem token, não carrega dados');
      return;
    }
    console.log('[Header] useEffect montagem: carregando dados do usuário...');
    const inicializar = async () => {
      await carregarContexto(); // Carrega grupo salvo primeiro
      await carregarGrupos();   // Depois carrega lista e seleciona primeiro se necessário
      await carregarNomeUsuario(); // Carrega nome e perfis logo na montagem
      await carregarPendenciasPremiacoes(); // Atualiza badge de pendências
      await carregarTimeFavorito();
    };
    inicializar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Recarrega grupos ao mudar de rota (ex.: após criar novo grupo)
  useEffect(() => {
    // NÃO fazer requisições em páginas públicas
    const paginasPublicas = ['/login', '/cadastro', '/'];
    if (paginasPublicas.includes(location.pathname)) {
      console.log('[Header] useEffect pathname: página pública, não carrega dados');
      return;
    }
    
    if (!token) {
      console.log('[Header] useEffect pathname: sem token, não carrega grupos');
      return;
    }
    
    console.log('[Header] useEffect pathname:', location.pathname, '- carregando dados...');
    const inicializar = async () => {
      await carregarContexto(); // Sempre sincroniza grupoId primeiro
      await carregarGrupos();    // Depois carrega lista
      await carregarNomeUsuario(); // Carrega nome e perfis
      await carregarPendenciasPremiacoes();
      await carregarTimeFavorito();
    };
    inicializar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, token]);

  // Atualiza badge de pendências periodicamente (30s)
  useEffect(() => {
    if (!token) return;
    const intervalId = setInterval(() => {
      carregarPendenciasPremiacoes();
    }, 30000);
    return () => clearInterval(intervalId);
    // Atualiza se token ou perfis mudarem
  }, [token, perfisUsuario]);

  const carregarGrupos = async () => {
    try {
      // Proteção: validar token antes de fazer requisição
      if (!token) {
        console.log('[Header] carregarGrupos: sem token, cancelando');
        return;
      }
      
      // Tenta primeiro cache local
      let gruposCarregados = [];
      const cache = storage.getItem('gruposUsuario');
      if (cache) {
        try {
          gruposCarregados = JSON.parse(cache);
        } catch (e) {
          console.warn('[Header] Cache de grupos corrompido:', e);
        }
      }

      // Se não há cache, consulta backend
      if (!gruposCarregados || gruposCarregados.length === 0) {
        const res = await axios.get(`${API}/grupos`, authHeader);
        gruposCarregados = res.data || [];
        storage.setItem('gruposUsuario', JSON.stringify(gruposCarregados));
      }

      setGrupos(gruposCarregados);
      
      // Se não há grupo selecionado, seleciona o primeiro automaticamente
      const grupoAtualStorage = storage.getItem('grupoId');
      if (!grupoAtualStorage && gruposCarregados.length > 0) {
        const primeiroGrupoId = gruposCarregados[0].grupoId || gruposCarregados[0].id;
        console.log('[Header] carregarGrupos: Selecionando primeiro grupo automaticamente:', primeiroGrupoId);
        setGrupoSelecionado(primeiroGrupoId);
        storage.setItem('grupoId', String(primeiroGrupoId));
        console.log('[Header] carregarGrupos: grupoId salvo no storage:', primeiroGrupoId);
      } else if (grupoAtualStorage) {
        // Se já existe grupo no storage, sincroniza com o estado do Header
        const grupoNum = Number(grupoAtualStorage);
        console.log('[Header] carregarGrupos: Sincronizando com grupoId do storage:', grupoNum);
        setGrupoSelecionado(grupoNum);
      }
    } catch (err) {
      console.error('Erro ao carregar grupos:', err);
      setGrupos([]);
    }
  };

  const carregarContexto = async () => {
    const grupoStorage = storage.getItem('grupoId');
    if (grupoStorage) {
      const grupoNum = Number(grupoStorage);
      console.log('[Header] carregarContexto: sincronizando grupoId do storage:', grupoNum);
      setGrupoSelecionado(grupoNum);
      return grupoNum;
    }
    console.log('[Header] carregarContexto: nenhum grupoId no storage');
    return null;
  };

  const carregarNomeUsuario = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/usuarios/me`, authHeader);
      if (res.data) {
        if (res.data.nome) {
          setNomeUsuario(res.data.nome);
          storage.setItem('userName', res.data.nome);
        }
        if (Array.isArray(res.data.perfis)) setPerfisUsuario(res.data.perfis);
      }
    } catch (err) {
      console.error('[Header] Erro ao buscar nome do usuário:', err);
      // Interceptor já cuida de 401/403, não precisa redirecionar aqui
    }
  };

  // Carrega contagem de premiações pendentes
  const carregarPendenciasPremiacoes = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/premiacoes/pendentes-confirmacao`, authHeader);
      const itens = Array.isArray(res.data) ? res.data : [];
      setBadgePendencias(itens.length);
    } catch (err) {
      setBadgePendencias(0);
    }
  };

  const carregarTimeFavorito = async () => {
    if (!token) {
      setTimeFavorito(null);
      return;
    }
    try {
      const res = await axios.get(`${API}/times/favorito`, authHeader);
      setTimeFavorito(res.data?.timeFavorito || null);
    } catch (err) {
      console.error('[Header] Erro ao carregar time favorito:', err?.response?.data || err.message);
      setTimeFavorito(null);
    }
  };

  const handleGrupoChange = (e) => {
    const grupoId = e.target.value;
    const timestamp = new Date().toISOString();
    console.log(`[Header ${timestamp}] 🔄 Usuário selecionou grupo: ${grupoId}`);
    setGrupoSelecionado(grupoId ? Number(grupoId) : '');
    if (grupoId) {
      storage.setItem('grupoId', grupoId);
      console.log(`[Header ${timestamp}] ✅ grupoId salvo em storage: ${grupoId}`);
    } else {
      storage.removeItem('grupoId');
      console.log(`[Header ${timestamp}] ❌ grupoId removido do storage`);
    }
  };

  const handleTimeFavoritoSelecionado = (time) => {
    setTimeFavorito(time);
    setShowTimeFavoritoModal(false);
  };

  const handleLogout = async () => {
    try {
      // Chama endpoint de logout no backend
      if (token) {
        await axios.post(
          `${API}/auth/logout`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } catch (err) {
      console.error('Erro ao fazer logout:', err);
    } finally {
      // Remove dados de autenticação do storage
      storage.removeItem('token');
      storage.removeItem('refreshToken');
      storage.removeItem('userName');
      storage.removeItem('grupoId');
      
      // Dispara evento de mudança de autenticação
      window.dispatchEvent(new Event('authChange'));
      
      // Redireciona para login
      navigate('/login');
    }
  };

  const isActive = (path) => {
    if (path === '/noticias') {
      return location.pathname.startsWith('/noticia') || location.pathname === '/noticias';
    }
    return location.pathname === path;
  };

  // Verifica se o usuário está logado E não está na página de login/cadastro
  const isUserAuthenticated = token && location.pathname !== '/login' && location.pathname !== '/' && location.pathname !== '/cadastro';
  const shouldShowSaldo = isUserAuthenticated;
  const nomesPerfis = (perfisUsuario || []).map(p => (p.nome || '').toLowerCase());
  const hasPerfil = (nome) => nomesPerfis.includes(nome);
  const canApostador = hasPerfil('apostador') || hasPerfil('administrador');
  const canFinanceiro = hasPerfil('financeiro') || hasPerfil('administrador');
  const canDev = hasPerfil('desenvolvedor') || hasPerfil('administrador');
  const canAdmin = hasPerfil('administrador');
  const isAdminFinance = canFinanceiro; // mantido para badge de pagamentos
  const labelPagamentos = `💳 Pagamentos${badgePendencias > 0 ? ` (${badgePendencias})` : ''}`;

  return (
    <header className="header">
      {/* Primeira linha: Logo + Grupo + Menu alinhados */}
      <div className="header-row header-row-1">
        <div className="logo">⚽ Bolão VIP</div>

        <div className="header-right">
          {shouldShowSaldo && (
            <select 
              value={grupoSelecionado ? String(grupoSelecionado) : ''} 
              onChange={handleGrupoChange}
              className="select-grupo"
            >
              <option key="empty" value="">Selecione um grupo</option>
              {grupos && grupos.length > 0 && grupos.map((g) => (
                <option key={`grupo-${g.grupoId || g.id}`} value={String(g.grupoId || g.id)}>
                  {g.nome}
                </option>
              ))}
            </select>
          )}

          {isUserAuthenticated && (
            <div className="menu-container">
              <div className="menu-icon" onClick={toggleMenu}>
                <AlignJustify aria-hidden="true" />
              </div>

              <nav className={`menu ${menuAberto ? 'ativo' : ''}`}>
                {canApostador && (<Link className={isActive('/noticias') ? 'ativo' : ''} to="/noticias" onClick={fecharMenu}>📰 Notícias</Link>)}
                {canApostador && (<Link className={isActive('/palpites') ? 'ativo' : ''} to="/palpites" onClick={fecharMenu}>🎯 Meus Palpites</Link>)}
                {canApostador && (<Link className={isActive('/historico') ? 'ativo' : ''} to="/historico" onClick={fecharMenu}>📜 Meu Histórico</Link>)}
                {canApostador && (<Link className={isActive('/ranking') ? 'ativo' : ''} to="/ranking" onClick={fecharMenu}>🏆 Ranking da Rodada</Link>)}
                {canApostador && (<Link className={isActive('/ranking-geral') ? 'ativo' : ''} to="/ranking-geral" onClick={fecharMenu}>👑 Ranking Geral</Link>)}
                {canApostador && (<Link className={isActive('/resultados') ? 'ativo' : ''} to="/resultados" onClick={fecharMenu}>⚽ Resultados</Link>)}
                {canApostador && (<Link className={isActive('/classificacao') ? 'ativo' : ''} to="/classificacao" onClick={fecharMenu}>📊 Classificação</Link>)}
                {canApostador && (
                  <button className="menu-link" onClick={() => { setShowTimeFavoritoModal(true); fecharMenu(); }}>
                    🛡️ Time Favorito
                  </button>
                )}
                {canDev && (<Link className={isActive('/config') ? 'ativo' : ''} to="/config" onClick={fecharMenu}>⚙️ Configurações</Link>)}
                {canAdmin && (<Link className={isActive('/usuarios-gerenciar') ? 'ativo' : ''} to="/usuarios-gerenciar" onClick={fecharMenu}>👥 Gerenciar Usuários</Link>)}
                {canFinanceiro && (<Link className={isActive('/cobrancas') ? 'ativo' : ''} to="/cobrancas" onClick={fecharMenu}>{labelPagamentos}</Link>)}
                <button className="menu-sair" onClick={() => { handleLogout(); fecharMenu(); }}>🚪 Sair</button>
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* Segunda linha: Saldo + Saudação */}
      {shouldShowSaldo && (
        <div className="header-row header-row-2">
          <div className="header-saldo">
            <SaldoDropdown />
          </div>
          {isUserAuthenticated && (
            <div className="time-favorito" onClick={() => setShowTimeFavoritoModal(true)}>
              <img
                src={timeFavorito?.escudo_url || PLACEHOLDER_ESCUDO}
                alt={timeFavorito?.nome || 'Sem time favorito'}
                className="time-favorito-escudo"
              />
              <div className="time-favorito-nome">{timeFavorito?.nome || 'Escolha seu time'}</div>
            </div>
          )}
          <div className="header-saudacao">Olá, {primeiroNome}</div>
        </div>
      )}

      <TimeFavoritoModal
        aberto={showTimeFavoritoModal}
        onClose={() => setShowTimeFavoritoModal(false)}
        onSelecionar={handleTimeFavoritoSelecionado}
        token={token}
      />
    </header>
  );
};

export default Header;

