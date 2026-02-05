import React from 'react';
import './OpcoesPagamentoModal.css';

const OpcoesPagamentoModal = ({ 
  isOpen, 
  onClose, 
  saldoAtual, 
  valorPalpite, 
  diferenca,
  saldoNegativo,
  valorDebitoNegativo,
  totalPixNecessario,
  onEscolherOpcao 
}) => {
  if (!isOpen) return null;

  const handleEscolha = (opcao) => {
    onEscolherOpcao(opcao);
    onClose();
  };

  const temSaldoNegativo = saldoNegativo === true;

  return (
    <div className="opcoes-pagamento-overlay">
      <div className="opcoes-pagamento-modal">
        <div className="opcoes-pagamento-header">
          <h2>💰 {temSaldoNegativo ? 'Saldo Negativo' : 'Saldo Insuficiente'}</h2>
          <button className="opcoes-pagamento-close" onClick={onClose}>×</button>
        </div>
        
        <div className="opcoes-pagamento-body">
          <div className="opcoes-pagamento-info">
            <div className="info-item">
              <span className="info-label">Seu saldo:</span>
              <span className={`info-valor ${saldoAtual < 0 ? 'negativo' : 'saldo'}`}>
                R$ {saldoAtual.toFixed(2)}
              </span>
            </div>
            
            {temSaldoNegativo && (
              <div className="info-item">
                <span className="info-label">Débito para regularizar:</span>
                <span className="info-valor debito">R$ {valorDebitoNegativo.toFixed(2)}</span>
              </div>
            )}
            
            <div className="info-item">
              <span className="info-label">Valor do palpite:</span>
              <span className="info-valor palpite">R$ {valorPalpite.toFixed(2)}</span>
            </div>

            {!temSaldoNegativo && (
              <div className="info-item destaque">
                <span className="info-label">Diferença:</span>
                <span className="info-valor diferenca">R$ {diferenca.toFixed(2)}</span>
              </div>
            )}

            {temSaldoNegativo && (
              <div className="info-item destaque negativo-info">
                <span className="info-label">Total PIX necessário:</span>
                <span className="info-valor total-pix">R$ {totalPixNecessario.toFixed(2)}</span>
                <span className="info-detalhe">
                  (R$ {valorPalpite.toFixed(2)} palpite + R$ {valorDebitoNegativo.toFixed(2)} regularização)
                </span>
              </div>
            )}
          </div>

          <div className="opcoes-pagamento-divider">
            <span>Escolha uma opção de pagamento:</span>
          </div>

          <div className="opcoes-pagamento-buttons">
            <button 
              className="opcao-btn opcao-integral"
              onClick={() => handleEscolha('pix_integral')}
            >
              <div className="opcao-icon">💳</div>
              <div className="opcao-content">
                <h3>PIX Integral</h3>
                {temSaldoNegativo ? (
                  <>
                    <p>Pagar R$ {totalPixNecessario.toFixed(2)} via PIX</p>
                    <span className="opcao-detail">Regulariza débito + confirma palpite</span>
                  </>
                ) : (
                  <>
                    <p>Pagar R$ {valorPalpite.toFixed(2)} via PIX</p>
                    <span className="opcao-detail">Seu saldo não será utilizado</span>
                  </>
                )}
              </div>
            </button>

            {!temSaldoNegativo && (
              <button 
                className="opcao-btn opcao-parcial"
                onClick={() => handleEscolha('pix_parcial')}
              >
                <div className="opcao-icon">💰</div>
                <div className="opcao-content">
                  <h3>Usar Saldo + PIX</h3>
                  <p>Usar R$ {saldoAtual.toFixed(2)} do saldo</p>
                  <span className="opcao-detail">+ PIX de R$ {diferenca.toFixed(2)}</span>
                </div>
              </button>
            )}
          </div>

          <div className="opcoes-pagamento-footer">
            {temSaldoNegativo ? (
              <p className="opcoes-aviso negativo-aviso">
                ⚠️ <strong>Importante:</strong> Seu saldo está negativo. Escolha PIX Integral para regularizar seu débito e confirmar o palpite.
              </p>
            ) : (
              <p className="opcoes-aviso">
                ⚠️ <strong>Importante:</strong> Ao escolher "Usar Saldo + PIX", o valor de R$ {saldoAtual.toFixed(2)} será debitado imediatamente do seu saldo, e você deverá pagar R$ {diferenca.toFixed(2)} via PIX.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpcoesPagamentoModal;
