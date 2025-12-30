import React, { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';
import ConfirmacaoModal from '../components/ConfirmacaoModal';
import './GerenciamentoUsuariosPage.css';

const API = API_BASE_URL;

function GerenciamentoUsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [perfisDisponiveis, setPerfisDisponiveis] = useState([]);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);

  const [editandoId, setEditandoId] = useState(null);
  const [modoCriar, setModoCriar] = useState(false);
  const [nomeEdit, setNomeEdit] = useState('');
  const [emailEdit, setEmailEdit] = useState('');
  const [senhaEdit, setSenhaEdit] = useState('');
  const [perfisEdit, setPerfisEdit] = useState([]);
  const [mensagem, setMensagem] = useState('');
  const [loading, setLoading] = useState(false);
  const token = useMemo(() => localStorage.getItem('token'), []);

  // Estados do modal de confirmação
  const [modalConfirmacao, setModalConfirmacao] = useState({
    isOpen: false,
    titulo: '',
    mensagem: '',
    onConfirmar: null,
    tipo: 'aviso'
  });

  const authHeader = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  const carregarUsuarios = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/usuarios/gerenciar/lista`, authHeader);
      setUsuarios(res.data || []);
      setMensagem('');
    } catch (err) {
      console.error('Erro ao carregar usuários', err);
      setMensagem('Erro ao carregar usuários.');
    }
  }, [authHeader]);

  const carregarPerfis = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/usuarios/perfis/lista`, authHeader);
      setPerfisDisponiveis(res.data || []);
    } catch (err) {
      console.error('Erro ao carregar perfis', err);
      setMensagem('Erro ao carregar perfis.');
    }
  }, [authHeader]);

  useEffect(() => {
    if (!token) {
      setMensagem('Faça login para gerenciar usuários.');
      return;
    }
    carregarUsuarios();
    carregarPerfis();
  }, [token, carregarUsuarios, carregarPerfis]);

  const selecionarUsuario = useCallback((usuario) => {
    setUsuarioSelecionado(usuario);
    setEditandoId(usuario.id);
    setNomeEdit(usuario.nome);
    setEmailEdit(usuario.email);
    setPerfisEdit(usuario.perfis?.map((p) => p.id) || []);
    setMensagem('');
    setModoCriar(false);
  }, []);

  const abrirModoCriar = useCallback(() => {
    setModoCriar(true);
    setEditandoId(null);
    setNomeEdit('');
    setEmailEdit('');
    setSenhaEdit('123456');
    setPerfisEdit([]);
    setUsuarioSelecionado(null);
    setMensagem('');
  }, []);

  const cancelarEdicao = useCallback(() => {
    setModoCriar(false);
    setEditandoId(null);
    setNomeEdit('');
    setEmailEdit('');
    setSenhaEdit('');
    setPerfisEdit([]);
    setUsuarioSelecionado(null);
  }, []);

  const togglePerfil = useCallback((perfilId) => {
    setPerfisEdit((prevPerfis) => 
      prevPerfis.includes(perfilId)
        ? prevPerfis.filter((p) => p !== perfilId)
        : [...prevPerfis, perfilId]
    );
  }, []);

  const salvarUsuario = useCallback(async (e) => {
    e.preventDefault();
    if (!nomeEdit || !emailEdit) {
      setMensagem('Nome e email são obrigatórios.');
      return;
    }

    if (modoCriar && !senhaEdit) {
      setMensagem('Senha é obrigatória para novos usuários.');
      return;
    }

    setLoading(true);
    try {
      if (modoCriar) {
        // Criar novo usuário
        await axios.post(
          `${API}/usuarios`,
          { nome: nomeEdit, email: emailEdit, senha: senhaEdit, perfis: perfisEdit },
          authHeader
        );
        setMensagem('Usuário criado com sucesso!');
      } else {
        // Atualizar usuário existente
        await axios.patch(
          `${API}/usuarios/${editandoId}`,
          { nome: nomeEdit, email: emailEdit, perfis: perfisEdit },
          authHeader
        );
        setMensagem('Usuário atualizado com sucesso!');
      }
      cancelarEdicao();
      carregarUsuarios();
    } catch (err) {
      console.error('Erro ao salvar usuário', err);
      const msg = err?.response?.data?.erro || 'Erro ao salvar usuário.';
      setMensagem(msg);
    } finally {
      setLoading(false);
    }
  }, [modoCriar, nomeEdit, emailEdit, senhaEdit, editandoId, perfisEdit, authHeader, cancelarEdicao, carregarUsuarios]);

  const resetarSenhaUsuario = useCallback(async (usuarioId) => {
    setModalConfirmacao({
      isOpen: true,
      titulo: '🔐 Resetar Senha',
      mensagem: 'Resetar a senha deste usuário para 123456? Ele precisará trocar no próximo login.',
      tipo: 'aviso',
      onConfirmar: async () => {
        setLoading(true);
        try {
          await axios.post(`${API}/auth/admin/resetar-senha/${usuarioId}`, {}, authHeader);
          setMensagem('Senha resetada para 123456. O usuário precisará trocar no próximo login.');
          setModalConfirmacao({ ...modalConfirmacao, isOpen: false });
        } catch (err) {
          console.error('Erro ao resetar senha', err);
          const msg = err?.response?.data?.erro || 'Erro ao resetar senha.';
          setMensagem(msg);
        } finally {
          setLoading(false);
        }
      }
    });
  }, [authHeader, modalConfirmacao]);

  const bloquearUsuario = useCallback(async (usuarioId) => {
    const usuarioBloqueado = usuarioSelecionado?.bloqueado === 1;

    setModalConfirmacao({
      isOpen: true,
      titulo: usuarioBloqueado ? '🔓 Desbloquear Usuário' : '🔒 Bloquear Usuário',
      mensagem: usuarioBloqueado 
        ? 'Desbloquear este usuário? Ele poderá fazer login com a senha padrão 123456 e será solicitado a alterá-la.' 
        : 'Tem certeza que deseja bloquear este usuário? Ele não conseguirá fazer login, mas seus dados serão preservados.',
      tipo: usuarioBloqueado ? 'sucesso' : 'perigo',
      onConfirmar: async () => {
        setLoading(true);
        try {
          const response = await axios.patch(`${API}/usuarios/${usuarioId}/bloquear`, {}, authHeader);
          setMensagem(response.data.mensagem || 'Operação realizada com sucesso!');
          setModalConfirmacao({ ...modalConfirmacao, isOpen: false });
          cancelarEdicao();
          carregarUsuarios();
        } catch (err) {
          console.error('Erro ao alternar bloqueio:', err);
          const msg = err?.response?.data?.erro || 'Erro ao alternar bloqueio do usuário.';
          setMensagem(msg);
        } finally {
          setLoading(false);
        }
      }
    });
  }, [authHeader, modalConfirmacao, cancelarEdicao, carregarUsuarios, usuarioSelecionado]);

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
          <h3>{modoCriar ? 'Criar novo usuário' : 'Editar usuário'}</h3>
          {!editandoId && !modoCriar ? (
            <p className="muted">Selecione um usuário para editar ou clique no botão + para criar.</p>
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
              {modoCriar && (
                <label>
                  Senha (padrão: 123456)
                  <input
                    type="password"
                    value={senhaEdit}
                    onChange={(e) => setSenhaEdit(e.target.value)}
                    placeholder="123456"
                  />
                  <small className="muted">Usuário precisará trocar no primeiro login</small>
                </label>
              )}

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
                  {modoCriar ? 'Criar usuário' : 'Salvar alterações'}
                </button>
                <button type="button" onClick={cancelarEdicao} className="btn-secondary">
                  Cancelar
                </button>
                {!modoCriar && (
                  <>
                    <button 
                      type="button" 
                      onClick={() => resetarSenhaUsuario(editandoId)} 
                      className="btn-danger"
                      disabled={loading}
                    >
                      🔐 Resetar Senha
                    </button>
                    <button 
                      type="button" 
                      onClick={() => bloquearUsuario(editandoId)} 
                      className={usuarioSelecionado?.bloqueado === 1 ? "btn-success" : "btn-danger"}
                      disabled={loading}
                    >
                      {usuarioSelecionado?.bloqueado === 1 ? '🔓 Desbloquear Usuário' : '🔒 Bloquear Usuário'}
                    </button>
                  </>
                )}
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Botão FAB para adicionar usuário */}
      <button 
        className="fab-button" 
        onClick={abrirModoCriar}
        title="Adicionar novo usuário"
      >
        <span className="fab-icon">👤+</span>
      </button>

      {/* Modal de Confirmação */}
      <ConfirmacaoModal
        isOpen={modalConfirmacao.isOpen}
        titulo={modalConfirmacao.titulo}
        mensagem={modalConfirmacao.mensagem}
        onConfirmar={modalConfirmacao.onConfirmar}
        onCancelar={() => setModalConfirmacao({ ...modalConfirmacao, isOpen: false })}
        loading={loading}
        tipo={modalConfirmacao.tipo}
        textoBotaoConfirmar={
          modalConfirmacao.tipo === 'perigo' ? '🔒 Bloquear' : 
          modalConfirmacao.tipo === 'sucesso' ? '🔓 Desbloquear' : 
          '✓ Confirmar'
        }
        textoBotaoCancelar="Cancelar"
      />
    </div>
  );
}

export default GerenciamentoUsuariosPage;



