import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config';

const API = API_BASE_URL;

function normalizePerfis(perfis) {
  return Array.isArray(perfis)
    ? perfis.map(p => (p.nome || '').toLowerCase())
    : [];
}

export default function ProtectedRoute({ element, allowedPerfis = [] }) {
  const [status, setStatus] = useState('loading'); // loading | allowed | forbidden | unauth

  useEffect(() => {
    console.log('[ProtectedRoute] 🔐 Verificando permissões para perfis:', allowedPerfis);
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('[ProtectedRoute] ❌ Sem token, redirecionando para login');
      setStatus('unauth');
      return;
    }

    const cached = sessionStorage.getItem('me.perfis');
    console.log('[ProtectedRoute] 📦 Cache de perfis:', cached);
    const checkPerfis = async () => {
      try {
        let perfisNorm = [];
        if (cached) {
          try { perfisNorm = JSON.parse(cached); } catch {}
        }
        if (!perfisNorm || perfisNorm.length === 0) {
          console.log('[ProtectedRoute] 🔄 Buscando perfis do backend...');
          const res = await axios.get(`${API}/usuarios/me`, { headers: { Authorization: `Bearer ${token}` } });
          perfisNorm = normalizePerfis(res.data?.perfis);
          sessionStorage.setItem('me.perfis', JSON.stringify(perfisNorm));
          console.log('[ProtectedRoute] ✅ Perfis carregados:', perfisNorm);
        }

        // Se nenhuma restrição foi passada, permitir
        if (!allowedPerfis || allowedPerfis.length === 0) {
          console.log('[ProtectedRoute] ✅ Nenhuma restrição, permitindo acesso');
          setStatus('allowed');
          return;
        }

        const allowedLower = allowedPerfis.map(p => p.toLowerCase());
        const hasAccess = perfisNorm.some(p => allowedLower.includes(p) || p === 'administrador');
        console.log('[ProtectedRoute] 🔍 Verificação:', { perfisNorm, allowedLower, hasAccess });
        setStatus(hasAccess ? 'allowed' : 'forbidden');
      } catch (err) {
        console.error('[ProtectedRoute] ❌ Erro ao verificar perfis:', err);
        setStatus('unauth');
      }
    };

    checkPerfis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === 'loading') {
    console.log('[ProtectedRoute] ⏳ Estado: loading - AGUARDANDO PERMISSÕES');
    return <div style={{ padding: '2rem', color: '#3df29d' }}>⏳ Carregando permissões…</div>;
  }
  if (status === 'unauth') {
    console.log('[ProtectedRoute] 🚫 Estado: unauth, redirecionando para /login');
    return <Navigate to="/login" replace />;
  }
  if (status === 'forbidden') {
    console.log('[ProtectedRoute] 🚫 Estado: forbidden, acesso negado');
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: '#fff' }}>Acesso negado</h2>
        <p style={{ color: '#a0a0a0' }}>Você não possui permissão para acessar esta página.</p>
      </div>
    );
  }
  
  // Status === 'allowed'
  console.log('[ProtectedRoute] ✅ Estado: allowed - RENDERIZANDO elemento:', typeof element);
  if (!element) {
    console.error('[ProtectedRoute] ❌ ERRO CRÍTICO: element é null/undefined!');
    return <div style={{ color: '#FF6B6B' }}>❌ Erro ao renderizar elemento</div>;
  }
  console.log('[ProtectedRoute] 🎯 RENDERIZANDO element agora...');
  return element;
}
