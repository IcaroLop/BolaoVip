import React from 'react';

const PalpitesModal = ({ aberto, nome, dados, onClose }) => {
  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 text-white rounded-lg w-full max-w-xl max-h-[80vh] overflow-y-auto shadow-lg relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-zinc-700">
          <h3 className="text-lg font-semibold">
            Palpites de <span className="text-blue-400">{nome}</span>
          </h3>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-xl"
            aria-label="Fechar"
          >
            &times;
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-4">
          {dados.length === 0 ? (
            <p className="text-zinc-400">Este usuário não fez palpites nesta rodada.</p>
          ) : (
            <ul className="space-y-3">
              {dados.map((jogo) => (
                <li key={jogo.id_jogo} className="border-b border-zinc-800 pb-2">
                  <div className="text-base">
                    <strong>{jogo.time_mandante}</strong> {jogo.gols_casa} x {jogo.gols_fora} <strong>{jogo.time_visitante}</strong>
                  </div>
                  <div className="text-sm text-zinc-400">
                    {new Date(jogo.data).toLocaleString('pt-BR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default PalpitesModal;

