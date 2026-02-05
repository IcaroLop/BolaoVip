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
          <div className="flex items-center gap-3 text-sm">
            <span className="text-zinc-300">
              Total: <strong className="text-emerald-400">{(dados?.reduce((acc, j) => acc + (Number(j.pontos || 0)), 0) || 0).toFixed(2)} pts</strong>
            </span>
            <span className="text-zinc-500">{dados?.length || 0} jogo(s)</span>
          </div>
          <button
            onClick={onClose}
            className="text-red-400 hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500/40 rounded"
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
              {dados.map((jogo) => {
                const temResultado = jogo.placar_mandante !== null && jogo.placar_mandante !== undefined &&
                                     jogo.placar_visitante !== null && jogo.placar_visitante !== undefined;
                const pontos = Number(jogo.pontos || 0);
                const categoria = jogo.categoria || 'errado';
                const categoriaClassMap = {
                  exato: 'text-emerald-400',
                  vencedor: 'text-green-300',
                  empate: 'text-amber-300',
                  um_gol_correto: 'text-yellow-300',
                  errado: 'text-zinc-400'
                };
                const pontosClass = categoriaClassMap[categoria] || 'text-zinc-400';
                return (
                  <li key={jogo.id_jogo} className="border-b border-zinc-800 pb-2">
                    <div className="text-base">
                      <strong>{jogo.time_mandante}</strong> {jogo.gols_casa} x {jogo.gols_fora} <strong>{jogo.time_visitante}</strong>
                      {temResultado && (
                        <span className="ml-2 text-sm text-zinc-400">
                          Final: {jogo.placar_mandante}–{jogo.placar_visitante} · <span className={pontosClass}>{pontos.toFixed(2)} pts</span>
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-zinc-400">
                      {new Date(jogo.data).toLocaleString('pt-BR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default PalpitesModal;

