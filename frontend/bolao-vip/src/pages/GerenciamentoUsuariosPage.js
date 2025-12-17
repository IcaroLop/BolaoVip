import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import './GerenciamentoUsuariosPage.css';

const API = 'http://192.168.56.127:3001';

function GerenciamentoUsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [perfisDisponiveis, setPerfisDisponiveis] = useState([]);

  const [editandoId, setEditandoId] = useState(null);
  const [nomeEdit, setNomeEdit] = useState('');
  const [emailEdit, setEmailEdit] = useState('');
  const [perfisEdit, setPerfisEdit] = useState([]);
  const [mensagem, setMensagem] = useState('');
  const [loading, setLoading] = useState(false);
  const token = useMemo(() => localStorage.getItem('token'), []);

  const authHeader = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  useEffect(() => {
    if (!token) {
      setMensagem('Faça login para gerenciar usuários.');
      return;
    }
    carregarUsuarios();
    carregarPerfis();
  }, [token, carregarPerfis, carregarUsuarios]);

  const carregarUsuarios = async () => {
    try {
      const res = await axios.get(`${API}/usuarios/gerenciar/lista`, authHeader);
      setUsuarios(res.data || []);
      setMensagem('');
    } catch (err) {
      console.error('Erro ao carregar usuários', err);
      setMensagem('Erro ao carregar usuários.');
    }
  };

  const carregarPerfis = async () => {
    try {
      const res = await axios.get(`${API}/usuarios/perfis/lista`, authHeader);
      setPerfisDisponiveis(res.data || []);
    } catch (err) {
      console.error('Erro ao carregar perfis', err);
      setMensagem('Erro ao carregar perfis.');
    }
  };

  const selecionarUsuario = (usuario) => {
    setUsuarioSelecionado(usuario);
    setEditandoId(usuario.id);
    setNomeEdit(usuario.nome);
    setEmailEdit(usuario.email);
    setPerfisEdit(usuario.perfis?.map((p) => p.id) || []);
    setMensagem('');
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setNomeEdit('');
    setEmailEdit('');
    setPerfisEdit([]);
  };

  const salvarUsuario = async (e) => {
    e.preventDefault();
    if (!nomeEdit || !emailEdit) {
      setMensagem('Nome e email são obrigatórios.');
      return;
    }
    setLoading(true);
    try {
      await axios.patch(
        `${API}/usuarios/${editandoId}`,
        { nome: nomeEdit, email: emailEdit, perfis: perfisEdit },
        authHeader
      );
      setMensagem('Usuário atualizado com sucesso!');
      cancelarEdicao();
      carregarUsuarios();
    } catch (err) {
      console.error('Erro ao salvar usuário', err);
      const msg = err?.response?.data?.erro || 'Erro ao salvar usuário.';
      setMensagem(msg);
    } finally {
      setLoading(false);
    }
  };

  const togglePerfil = (perfilId) => {
    if (perfisEdit.includes(perfilId)) {
      setPerfisEdit(perfisEdit.filter((p) => p !== perfilId));
    } else {
      setPerfisEdit([...perfisEdit, perfilId]);
    }
  };

  return (
    <div className="geren-usuarios-container">
      <header className="geren-hero">
        <div>
          <p className="chip">👥 Gerenciamento · Usuários</p>
          <h1>Gerenciar Usuários</h1>
          <p className="muted">Edite dados de usuários e atribua perfis de acesso.</p>
        </div>
        <div className="hero-actions">
          <button className="ghost" onClick={carregarUsuarios}>↻ Atualizar lista</button>
          <button className="ghost" onClick={carregarPerfis}>↻ Atualizar perfis</button>
        </div>
      </header>

      {mensagem && <div className="geren-alert">{mensagem}</div>}

      <section className="geren-grid">
        <div className="panel">
          <h3>Lista de usuários</h3>
          <div className="usuarios-lista">
            {usuarios.length === 0 && <p className="muted">Nenhum usuário encontrado.</p>}
            {usuarios.map((u) => (
              <div
                key={u.id}
                className={`usuario-card ${Number(editandoId) === Number(u.id) ? 'ativo' : ''}`}
                onClick={() => selecionarUsuario(u)}
              >
                <div className="usuario-titulo">{u.nome}</div>
                <div className="usuario-meta">{u.email}</div>
                <div className="usuario-perfis">
                  {u.perfis && u.perfis.length > 0 ? (
                    u.perfis.map((p) => (
                      <span key={p.id} className="badge-small">
                        {p.nome}
                      </span>
                    ))
                  ) : (
                    <span className="muted">Sem perfis</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>Editar usuário</h3>
          {!editandoId ? (
            <p className="muted">Selecione um usuário para editar.</p>
          ) : (
            <form className="geren-form" onSubmit={salvarUsuario}>
              <label>
                Nome
                <input
                  type="text"
                  value={nomeEdit}
                  onChange={(e) => setNomeEdit(e.target.value)}
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={emailEdit}
                  onChange={(e) => setEmailEdit(e.target.value)}
                  required
                />
              </label>

              <label>Perfis</label>
              <div className="perfis-checkboxes">
                {perfisDisponiveis.length === 0 ? (
                  <p className="muted">Nenhum perfil disponível.</p>
                ) : (
                  perfisDisponiveis.map((p) => (
                    <label key={p.id} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={perfisEdit.includes(p.id)}
                        onChange={() => togglePerfil(p.id)}
                      />
                      <span>
                        <strong>{p.nome}</strong>
                        <div className="descricao">{p.descricao}</div>
                      </span>
                    </label>
                  ))
                )}
              </div>

              <div className="form-actions">
                <button type="submit" disabled={loading}>
                  Salvar alterações
                </button>
                <button type="button" onClick={cancelarEdicao} className="btn-secondary">
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}

export default GerenciamentoUsuariosPage;

