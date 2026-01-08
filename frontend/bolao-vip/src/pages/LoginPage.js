import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import storage from '../utils/storage';
import API_BASE_URL from '../config';
import TrocarSenhaModal from '../components/TrocarSenhaModal';
import fcmService from '../services/fcmService';
import './LoginPage.css';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [mostrarModalTrocarSenha, setMostrarModalTrocarSenha] = useState(false);
  const [tokenTrocaSenha, setTokenTrocaSenha] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        senha,
      });

      storage.setItem('token', res.data.token);
      storage.setItem('refreshToken', res.data.refreshToken);
      if (res.data.nome) {
        storage.setItem('userName', res.data.nome);
      }
      
      // Verificar se precisa trocar senha
      if (res.data.precisa_trocar_senha === true) {
        setTokenTrocaSenha(res.data.token);
        setMostrarModalTrocarSenha(true);
        setMensagem('🔐 Você precisa trocar sua senha antes de continuar');
        return; // Bloqueia navegação até trocar senha
      }
      
      setMensagem('✅ Login realizado com sucesso!');
      
      // Inicializar FCM para push notifications
      fcmService.init(res.data.token);
      
      // Disparar evento para notificar Layout sobre mudança de autenticação
      window.dispatchEvent(new Event('authChange'));

      // Pós-login: carregar grupos do usuário e persistir em storage,
      // preservando grupoId previamente selecionado se válido
      try {
        const authHeader = { headers: { Authorization: `Bearer ${res.data.token}` } };
        const gruposRes = await axios.get(`${API_BASE_URL}/grupos`, authHeader);
        const gruposUsuario = gruposRes.data || [];
        storage.setItem('gruposUsuario', JSON.stringify(gruposUsuario));

        // Ler grupoId já selecionado antes do login (ex.: pela tela de Login/Header)
        const grupoSelecionadoPrev = storage.getItem('grupoId');
        const grupoSelecionadoPrevNum = grupoSelecionadoPrev ? Number(grupoSelecionadoPrev) : null;

        // Verificar se o grupo previamente selecionado pertence ao usuário
        const pertenceAoUsuario = gruposUsuario.some(g => {
          const gid = Number(g.grupoId || g.id);
          return gid === grupoSelecionadoPrevNum;
        });

        if (pertenceAoUsuario && grupoSelecionadoPrevNum != null) {
          // Mantém o grupo selecionado previamente
          storage.setItem('grupoId', String(grupoSelecionadoPrevNum));
        } else if (gruposUsuario.length > 0) {
          // Define primeiro grupo do usuário como fallback
          const primeiroGrupoId = Number(gruposUsuario[0].grupoId || gruposUsuario[0].id);
          storage.setItem('grupoId', String(primeiroGrupoId));
        } else {
          // Usuário sem grupos
          storage.removeItem('grupoId');
        }
      } catch (e) {
        console.warn('Falha ao carregar grupos pós-login:', e.message);
      }

      navigate('/noticias');
    } catch (error) {
      const status = error?.response?.status;
      const netStatus = error?.request?.status;
      console.error('Erro no login:', {
        message: error?.message,
        status,
        netStatus,
        url: `${API_BASE_URL}/auth/login`,
        data: error?.response?.data,
      });
      setMensagem(`❌ Falha no login. URL=${API_BASE_URL} status=${status ?? 'n/a'} net=${netStatus ?? 'n/a'} msg=${error?.message ?? ''}`);
    }
  };

  const handleTrocaSenhaCompleta = (sucesso) => {
    setMostrarModalTrocarSenha(false);
    if (sucesso) {
      setMensagem('✅ Senha alterada! Redirecionando...');
      // Aguardar 1s e navegar
      setTimeout(() => {
        window.dispatchEvent(new Event('authChange'));
        navigate('/noticias');
      }, 1000);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-hero">
        <p className="chip">🎯 Apostas inteligentes · ⚽ Brasileirão · 🏆 Ranking ao vivo</p>
        <h1>Bolão VIP</h1>
        <p className="muted">Entre para acompanhar resultados, palpitar e liderar o ranking.</p>
      </div>

      <div className="auth-card glass-card">
        <h2>Bem-vindo de volta</h2>
        <p className="muted">Acesse com seu email e senha</p>
        <p className="muted" style={{ fontSize: '12px', wordBreak: 'break-all' }}>API: {API_BASE_URL}</p>
        <form className="auth-form" onSubmit={handleLogin}>
          <label>
            Email
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </label>
          <button type="submit">Entrar</button>
        </form>
        {mensagem && <p className="auth-msg">{mensagem}</p>}
        <p className="auth-link" onClick={() => navigate('/cadastro')}>
          Não tem conta? <span>Cadastre-se</span>
        </p>
      </div>

      {/* Modal de Trocar Senha - bloqueante quando necessário */}
      <TrocarSenhaModal
        isOpen={mostrarModalTrocarSenha}
        onClose={handleTrocaSenhaCompleta}
        token={tokenTrocaSenha}
        bloqueante={true}
      />
    </div>
  );
}

export default LoginPage;