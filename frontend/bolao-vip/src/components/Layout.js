import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import NotificacoesFloating from './NotificacoesFloating';
import storage from '../utils/storage';
import './Layout.css'; // caso esteja usando
import './GlobalResponsive.css'; // Responsividade mobile global

const Layout = ({ children }) => {
  // Inicia com false para garantir que não apareça antes da verificação
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Verifica autenticação na montagem e quando há mudanças
    const checkAuth = () => {
      const token = storage.getItem('token');
      const hasToken = !!token && token.trim() !== '';
      console.log('[Layout] Verificando auth:', hasToken ? 'AUTENTICADO' : 'NÃO AUTENTICADO');
      setIsAuthenticated(hasToken);
    };

    // Pequeno delay para garantir que o DOM está pronto
    const timer = setTimeout(checkAuth, 0);

    // Listener para mudanças no localStorage (login/logout)
    window.addEventListener('storage', checkAuth);
    
    // Listener customizado para mudanças locais no mesmo tab
    window.addEventListener('authChange', checkAuth);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('authChange', checkAuth);
    };
  }, []);

  // Páginas onde o ícone NUNCA deve aparecer (mesmo com token)
  const paginasPublicas = ['/login', '/cadastro', '/'];
  const isPublicPage = paginasPublicas.includes(location.pathname);

  // Mostrar notificações apenas se autenticado E não estiver em página pública
  const mostrarNotificacoes = isAuthenticated && !isPublicPage;

  return (
    <>
      {/* Header somente em páginas autenticadas */}
      {!isPublicPage && <Header />}
      <main className="conteudo-principal">
        {children}
      </main>
      <Footer />
      {mostrarNotificacoes && <NotificacoesFloating />}
    </>
  );
};

export default Layout;



