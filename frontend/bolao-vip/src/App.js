import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import notificationService from './services/notificationService';
import notificationPollingService from './services/notificationPollingService';
import fcmService from './services/fcmService';
import './index.css';
import LoginPage from './pages/LoginPage';
import CadastroPage from './pages/CadastroPage';
import RankingPage from './pages/RankingPage';
import PalpitePage from './pages/PalpitePage';
import HistoricoPage from './pages/HistoricoPage';
import ResultadosPage from './pages/ResultadosPage';
import RankingGeralPage from './pages/RankingGeralPage';
import AdminAgendamentosPage from './pages/AdminAgendamentosPage';
import ClassificacaoPage from './pages/ClassificacaoPage';
import CobrancasPendentesPage from './pages/CobrancasPendentesPage';
import NoticiasPage from './pages/noticiasPage';
import NoticiaVisualizarPage from './components/NoticiaVisualizarPage';
import ConfiguracoesPage from './pages/ConfiguracoesPage';
import GerenciamentoUsuariosPage from './pages/GerenciamentoUsuariosPage';
import TestNotificationPollingPage from './pages/TestNotificationPollingPage';
import DebugPollingPage from './pages/DebugPollingPage';


function AppContent() {
  const navigate = useNavigate();

  // Inicializar serviço de notificações
  useEffect(() => {
    notificationService.init().catch(console.error);

    // Inicializar FCM para push notifications
    const token = localStorage.getItem('token');
    if (token) {
      console.log('[App] 🚀 Inicializando FCM para push notifications');
      fcmService.init(token).catch(console.error);
      
      console.log('[App] 🔄 Iniciando polling de notificações (fallback)');
      notificationPollingService.start(token);
    }

    // Listener para quando usuário clica em notificação
    const handleNotificationClick = (event) => {
      const { rodada } = event.detail;
      console.log('[App] 📲 Redirecionando para palpites da rodada:', rodada);
      navigate(`/palpites?rodada=${rodada}`);
    };

    // Listeners para FCM
    const handleFCMClicked = (event) => {
      const { rodada } = event.detail;
      if (rodada) {
        console.log('[App] 📲 FCM: Redirecionando para palpites da rodada:', rodada);
        navigate(`/palpites?rodada=${rodada}`);
      }
    };

    const handleFCMReceived = (event) => {
      console.log('[App] 📬 FCM: Notificação recebida em foreground', event.detail);
    };

    window.addEventListener('notificacaoClicada', handleNotificationClick);
    window.addEventListener('fcmNotificationClicked', handleFCMClicked);
    window.addEventListener('fcmNotificationReceived', handleFCMReceived);

    return () => {
      window.removeEventListener('notificacaoClicada', handleNotificationClick);
      window.removeEventListener('fcmNotificationClicked', handleFCMClicked);
      window.removeEventListener('fcmNotificationReceived', handleFCMReceived);
      notificationPollingService.stop();
    };
  }, [navigate]);

  console.log('[App] 🚀 RENDERIZANDO APP - Iniciando rotas');
  
  return (
    <ErrorBoundary>
      <Layout>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<CadastroPage />} />
          <Route path="/classificacao" element={<ProtectedRoute allowedPerfis={["apostador"]} element={<div className="container-full"><ClassificacaoPage campeonatoId={10} /></div>} />} />
          <Route path="/ranking" element={<ProtectedRoute allowedPerfis={["apostador"]} element={<RankingPage />} />} />
          <Route path="/palpites" element={<ProtectedRoute allowedPerfis={["apostador"]} element={<ErrorBoundary><PalpitePage /></ErrorBoundary>} />} />
          <Route path="/historico" element={<ProtectedRoute allowedPerfis={["apostador"]} element={<HistoricoPage />} />} />
          <Route path="/resultados" element={<ProtectedRoute allowedPerfis={["apostador"]} element={<ResultadosPage />} />} />
          <Route path="/ranking-geral" element={<ProtectedRoute allowedPerfis={["apostador"]} element={<RankingGeralPage />} />} />
          <Route path="/admin/agendamentos" element={<ProtectedRoute allowedPerfis={["desenvolvedor", "administrador"]} element={<AdminAgendamentosPage />} />} />
          <Route path="/cobrancas" element={<ProtectedRoute allowedPerfis={["financeiro"]} element={<CobrancasPendentesPage />} />} />
          <Route path="/config" element={<ProtectedRoute allowedPerfis={["desenvolvedor", "administrador"]} element={<ConfiguracoesPage />} />} />
          <Route path="/usuarios-gerenciar" element={<ProtectedRoute allowedPerfis={["administrador"]} element={<GerenciamentoUsuariosPage />} />} />
          <Route path="/noticias" element={<ProtectedRoute allowedPerfis={["apostador"]} element={<NoticiasPage />} />} />
          <Route path="/noticia/:id" element={<NoticiaVisualizarPage />} />
          <Route path="/test-polling" element={<TestNotificationPollingPage />} />
          <Route path="/debug-polling" element={<DebugPollingPage />} />
        </Routes>
      </Layout>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;


