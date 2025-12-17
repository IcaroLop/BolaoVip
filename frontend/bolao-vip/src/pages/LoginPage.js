import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import storage from '../utils/storage';
import './LoginPage.css';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mensagem, setMensagem] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post('http://192.168.56.127:3001/auth/login', {
        email,
        senha,
      });

      storage.setItem('token', res.data.token);
      setMensagem('✅ Login realizado com sucesso!');

      // Pós-login: carregar grupos do usuário e persistir em storage,
      // preservando grupoId previamente selecionado se válido
      try {
        const authHeader = { headers: { Authorization: `Bearer ${res.data.token}` } };
        const gruposRes = await axios.get('http://192.168.56.127:3001/grupos', authHeader);
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
      console.error('Erro no login:', error);
      setMensagem('❌ Email ou senha inválidos.');
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
    </div>
  );
}

export default LoginPage;

