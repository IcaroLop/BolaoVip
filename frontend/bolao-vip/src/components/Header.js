import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import storage from '../utils/storage';
import SaldoDropdown from './SaldoDropdown';
import './Header.css';

const API = 'http://192.168.56.127:3001';

const Header = () => {
  const [menuAberto, setMenuAberto] = useState(false);
  const [grupos, setGrupos] = useState([]);
  const [grupoSelecionado, setGrupoSelecionado] = useState('');
  const [token, setToken] = useState(null);
  const [nomeUsuario, setNomeUsuario] = useState('');
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
      if (tStorage) return tStorage;
      
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
    if (!token) return;
    const inicializar = async () => {
      await carregarContexto(); // Carrega grupo salvo primeiro
      await carregarGrupos();    // Depois carrega lista e seleciona primeiro se necessário
    };
    inicializar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Recarrega grupos ao mudar de rota (ex.: após criar novo grupo)
  useEffect(() => {
    if (!token) return;
    const inicializar = async () => {
      await carregarContexto(); // Sempre sincroniza grupoId primeiro
      await carregarGrupos();    // Depois carrega lista
      await carregarNomeUsuario(); // Carrega nome do usuário
    };
    inicializar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, token]);

  const carregarGrupos = async () => {
    try {
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
        setGrupoSelecionado(primeiroGrupoId);
        storage.setItem('grupoId', primeiroGrupoId);
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
      if (res.data && res.data.nome) {
        setNomeUsuario(res.data.nome);
      }
    } catch (err) {
      console.error('Erro ao buscar nome do usuário:', err);
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

  const isActive = (path) => {
    if (path === '/noticias') {
      return location.pathname.startsWith('/noticia') || location.pathname === '/noticias';
    }
    return location.pathname === path;
  };

  // Verifica se o usuário está logado E não está na página de login/cadastro
  const isUserAuthenticated = token && location.pathname !== '/login' && location.pathname !== '/' && location.pathname !== '/cadastro';
  const shouldShowSaldo = isUserAuthenticated;

  return (
    <header className="header">
      {/* Primeira linha: Logo + Select Grupo + Menu */}
      <div className="header-row header-row-1">
        <div className="logo">⚽ Bolão VIP</div>

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
              ☰
            </div>

            <nav className={`menu ${menuAberto ? 'ativo' : ''}`}>
              <Link className={isActive('/palpites') ? 'ativo' : ''} to="/palpites" onClick={fecharMenu}>🎯 Meus Palpites</Link>
              <Link className={isActive('/historico') ? 'ativo' : ''} to="/historico" onClick={fecharMenu}>📜 Meu Histórico</Link>
              <Link className={isActive('/ranking') ? 'ativo' : ''} to="/ranking" onClick={fecharMenu}>🏆 Ranking da Rodada</Link>
              <Link className={isActive('/ranking-geral') ? 'ativo' : ''} to="/ranking-geral" onClick={fecharMenu}>👑 Ranking Geral</Link>
              <Link className={isActive('/resultados') ? 'ativo' : ''} to="/resultados" onClick={fecharMenu}>⚽ Resultados</Link>
              <Link className={isActive('/classificacao') ? 'ativo' : ''} to="/classificacao" onClick={fecharMenu}>📊 Classificação</Link>
              <Link className={isActive('/noticias') ? 'ativo' : ''} to="/noticias" onClick={fecharMenu}>📰 Notícias</Link>
              <Link className={isActive('/config') ? 'ativo' : ''} to="/config" onClick={fecharMenu}>⚙️ Configurações</Link>
              <Link className={isActive('/usuarios-gerenciar') ? 'ativo' : ''} to="/usuarios-gerenciar" onClick={fecharMenu}>👥 Gerenciar Usuários</Link>
              <Link className={isActive('/cobrancas') ? 'ativo' : ''} to="/cobrancas" onClick={fecharMenu}>💳 Pagamentos</Link>
            </nav>
          </div>
        )}
      </div>

      {/* Segunda linha: Saldo + Saudação */}
      {shouldShowSaldo && (
        <div className="header-row header-row-2">
          <div className="header-saldo">
            <SaldoDropdown />
          </div>
          <div className="header-saudacao">Olá, {primeiroNome}</div>
        </div>
      )}
    </header>
  );
};

export default Header;

