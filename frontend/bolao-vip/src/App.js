import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
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


function App() {
  return (
    <Router>
      <Layout>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/cadastro" element={<CadastroPage />} />
        <Route path="/classificacao" element={<div className="container-full"><ClassificacaoPage campeonatoId={10} /></div>} />
        <Route path="/ranking" element={<RankingPage />} />
        <Route path="/palpites" element={<PalpitePage />} />
        <Route path="/historico" element={<HistoricoPage />} />
        <Route path="/resultados" element={<ResultadosPage />} />
        <Route path="/ranking-geral" element={<RankingGeralPage />} />
        <Route path="/admin/agendamentos" element={<AdminAgendamentosPage />} />
        <Route path="/cobrancas" element={<CobrancasPendentesPage />} />
        <Route path="/config" element={<ConfiguracoesPage />} />
        <Route path="/usuarios-gerenciar" element={<GerenciamentoUsuariosPage />} />
        <Route path="/noticias" element={<NoticiasPage />} />
        <Route path="/noticia/:id" element={<NoticiaVisualizarPage />} />
      </Routes>
      </Layout>
    </Router>
  );
}

export default App;


