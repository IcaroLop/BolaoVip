import React, { useState, useEffect } from 'react';
import './PixModal.css';

const PixModal = ({ dadosPix, onClose }) => {
  const [copiado, setCopiado] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);

  useEffect(() => {
    if (dadosPix?.pix_copiaecola) {
      const url = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
        dadosPix.pix_copiaecola
      )}&size=200x200`;
      setQrCodeUrl(url);
    }
  }, [dadosPix]);

  const handleCopy = async () => {
    const codigoPix = dadosPix.pix_copiaecola;
    if (codigoPix) {
      try {
        await navigator.clipboard.writeText(codigoPix);
        setCopiado(true);
      } catch (err) {
        console.error('Erro ao copiar código Pix:', err);
        alert('Não foi possível copiar automaticamente. Copie manualmente o código Pix.');
      }
    }
  };

  if (!dadosPix) {
    return (
      <div className="pix-overlay">
        <div className="pix-modal">
          <p>Carregando informações do Pix...</p>
        </div>
      </div>
    );
  }

  const db = dadosPix;
  // Calcula data de expiração a partir do timestamp ISO
  const expiracaoData = dadosPix.expiracao
    ? new Date(dadosPix.expiracao)
    : null;

  const valor = db.valor;
  const txid = db.txid;
  const usuario = db.nome_usuario || '-';
  const codigoPix = db.pix_copiaecola;

  return (
    <div className="pix-overlay">
      <div className="pix-modal">
        <h2>💸 Pagamento via Pix</h2>
        <p><strong>Usuário:</strong> {usuario}</p>
        <p><strong>Txid:</strong> {txid}</p>
        <p><strong>Expira em:</strong> {expiracaoData ? expiracaoData.toLocaleString() : 'Indefinido'}</p>
        <p><strong>Valor:</strong> R$ {Number(valor).toFixed(2)}</p>

        {qrCodeUrl ? (
          <div>
            <img
              src={qrCodeUrl}
              alt="QR Code Pix"
              className="pix-qr"
            />
          </div>
        ) : (
          <p className="pix-info">QR Code indisponível.</p>
        )}

        {codigoPix ? (
          <>
            <input
              type="text"
              value={codigoPix}
              readOnly
              onClick={(e) => e.target.select()}
              className="pix-input"
            />
            <button onClick={handleCopy} className="pix-btn-copy">
              {copiado ? 'Código copiado!' : 'Copiar código Pix'}
            </button>
          </>
        ) : (
          <p className="pix-info">Código Pix indisponível.</p>
        )}

        <button onClick={onClose} className="pix-btn-close">
          Fechar
        </button>
      </div>
    </div>
  );
};

export default PixModal;

