import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';

function CadastroPage() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mensagem, setMensagem] = useState('');
  const navigate = useNavigate();

  const handleCadastro = async (e) => {
    e.preventDefault();

    try {
      await axios.post(`${API_BASE_URL}/auth/cadastro`, {
        nome,
        email,
        senha,
      });

      setMensagem('✅ Cadastro realizado com sucesso!');
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      console.error('Erro ao cadastrar:', err);
      const msg =
        err.response?.data?.erro || 'Erro ao cadastrar usuário.';
      setMensagem(`❌ ${msg}`);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Cadastro - Bolão Vip</h2>
        <form onSubmit={handleCadastro}>
          <input
            type="text"
            placeholder="Nome completo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            style={styles.input}
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            style={styles.input}
          />
          <button type="submit" style={styles.button}>
            Cadastrar
          </button>
        </form>
        {mensagem && <p style={styles.msg}>{mensagem}</p>}
        <p style={styles.link} onClick={() => navigate('/')}>
          Já tem conta? Faça login
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#0D1117',
    color: '#FFFFFF',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '1rem',
  },
  card: {
    backgroundColor: '#161B22',
    padding: 'clamp(1rem, 4vw, 2rem)',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 0 15px rgba(0, 255, 0, 0.1)',
  },
  title: {
    textAlign: 'center',
    marginBottom: '1.5rem',
    color: '#00FF88',
    fontSize: 'clamp(1.3rem, 5vw, 1.8rem)',
  },
  input: {
    width: '100%',
    padding: '12px',
    marginBottom: '1rem',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#0D1117',
    color: 'white',
    fontSize: '16px',
    minHeight: '44px',
  },
  button: {
    width: '100%',
    padding: '14px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#00FF88',
    color: '#000',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '1rem',
    minHeight: '44px',
  },
  msg: {
    marginTop: '1rem',
    textAlign: 'center',
    color: '#FF8080',
    fontSize: '0.9rem',
  },
  link: {
    marginTop: '1rem',
    textAlign: 'center',
    color: '#4BA4FF',
    cursor: 'pointer',
    fontSize: '0.95rem',
    textDecoration: 'underline',
  },
};

export default CadastroPage;

