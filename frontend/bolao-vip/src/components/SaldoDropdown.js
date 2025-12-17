import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import storage from '../utils/storage';
import './SaldoDropdown.css';
import DepositoModal from './DepositoModal';
import SaqueModal from './SaqueModal';
import ExtratoModal from './ExtratoModal';

const API = 'http://192.168.56.127:3001';

const SaldoDropdown = () => {
  const [saldo, setSaldo] = useState(null);
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [token, setToken] = useState(null);
  
  // Modais
  const [depositoAberto, setDepositoAberto] = useState(false);
  const [saqueAberto, setSaqueAberto] = useState(false);
  const [extratoAberto, setExtratoAberto] = useState(false);

  // Resolver token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tParam = params.get('token');
    if (tParam) {
      storage.setItem('token', tParam);
      setToken(tParam);
    } else {
      const tStorage = storage.getItem('token');
      setToken(tStorage);
    }
  }, []);

  const authHeader = useMemo(() => (token ? { headers: { Authorization: `Bearer ${token}` } } : {}), [token]);

  // Buscar saldo
  const buscarSaldo = async () => {
    if (!token) return;
    
    try {
      const res = await axios.get(`${API}/saldo/usuario`, authHeader);
      setSaldo(res.data);
    } catch (err) {
      console.error('Erro ao buscar saldo:', err);
    }
  };

  // Buscar saldo ao montar e quando token muda
  useEffect(() => {
    if (token) {
      buscarSaldo();
      const intervalo = setInterval(buscarSaldo, 30000); // Atualizar a cada 30s
      return () => clearInterval(intervalo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token || !saldo) {
    return null;
  }

  const handleDepositoAbrir = () => {
    setDepositoAberto(true);
    setDropdownAberto(false);
  };

  const handleSaqueAbrir = () => {
    setSaqueAberto(true);
    setDropdownAberto(false);
  };

  const handleExtratoAbrir = () => {
    setExtratoAberto(true);
    setDropdownAberto(false);
  };

  const handleDepositoFechado = () => {
    setDepositoAberto(false);
    buscarSaldo();
  };

  const handleSaqueFechado = () => {
    setSaqueAberto(false);
    buscarSaldo();
  };

  const handleExtratoFechado = () => {
    setExtratoAberto(false);
  };

  return (
    <div className="saldo-dropdown">
      <button
        className="saldo-button"
        onClick={() => setDropdownAberto(!dropdownAberto)}
        title="Clique para abrir opções de saldo"
      >
        <span className="saldo-icon">💰</span>
        <span className="saldo-valor">R$ {(Number(saldo?.saldo_atual) || 0).toFixed(2)}</span>
        <span className={`saldo-arrow ${dropdownAberto ? 'aberto' : ''}`}>▼</span>
      </button>

      {dropdownAberto && (
        <div className="saldo-dropdown-menu">
          <button className="dropdown-item" onClick={handleDepositoAbrir}>
            <span className="dropdown-icon">📥</span>
            Depositar
          </button>
          <button className="dropdown-item" onClick={handleSaqueAbrir}>
            <span className="dropdown-icon">📤</span>
            Sacar
          </button>
          <button className="dropdown-item" onClick={handleExtratoAbrir}>
            <span className="dropdown-icon">📋</span>
            Extrato
          </button>
        </div>
      )}

      {/* Modais */}
      <DepositoModal
        isOpen={depositoAberto}
        onClose={handleDepositoFechado}
        onDepositoSucesso={buscarSaldo}
      />
      <SaqueModal
        isOpen={saqueAberto}
        onClose={handleSaqueFechado}
        saldoDisponivel={saldo.saldo_atual}
        onSaqueSucesso={buscarSaldo}
      />
      <ExtratoModal
        isOpen={extratoAberto}
        onClose={handleExtratoFechado}
      />
    </div>
  );
};

export default SaldoDropdown;
