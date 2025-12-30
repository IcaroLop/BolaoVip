import React, { useMemo } from 'react';
import './DetalhesJogoModal.css';

const DetalhesJogoModal = ({ isOpen, onClose, jogo, palpitesGrupo, rankingRodada }) => {
  const calcPontosParciais = (palpiteCasa, palpiteFora, placarMandante, placarVisitante) => {
    if (placarMandante === null || placarMandante === undefined || placarVisitante === null || placarVisitante === undefined) {
      return null;
    }

    const totalGols = placarMandante + placarVisitante;
    const vencedorReal = placarMandante > placarVisitante ? 'mandante' : placarMandante < placarVisitante ? 'visitante' : 'empate';
    const vencedorPalpite = palpiteCasa > palpiteFora ? 'mandante' : palpiteCasa < palpiteFora ? 'visitante' : 'empate';

    // Exato
    if (palpiteCasa === placarMandante && palpiteFora === placarVisitante) {
      if (totalGols <= 3) return 4.0;
      if (totalGols === 4) return 5.5;
      if (totalGols === 5) return 6.5;
      if (totalGols === 6) return 7.5;
      return 8.5;
    }

    let pontos = 0.0;

    // Tendência (empate ou vencedor) correta
    if (vencedorReal === vencedorPalpite) {
      pontos += 1.5;
    }

    // Gols individuais corretos (acumula)
    if (palpiteCasa === placarMandante) {
      pontos += 0.5;
    }

    if (palpiteFora === placarVisitante) {
      pontos += 0.5;
    }

    return pontos;
  };

  const palpitesComPontos = useMemo(() => {
    if (!palpitesGrupo) return [];
    const pm = Number(jogo?.placar_mandante);
    const pv = Number(jogo?.placar_visitante);
    const placarValido = Number.isFinite(pm) && Number.isFinite(pv);
    const statusRaw = (jogo?.status || '').toLowerCase();
    const finalizado = ['finalizado', 'concluído', 'concluido', 'encerrado'].some((s) => statusRaw.includes(s));

    return palpitesGrupo.map((p) => {
      const pontosBackend = Number(p.pontos || 0);
      const palpiteCasa = Number(p.palpite_casa);
      const palpiteFora = Number(p.palpite_fora);

      if (pontosBackend > 0 || !placarValido) {
        return { ...p, pontosExibidos: pontosBackend, parcial: false };
      }

      const parcial = calcPontosParciais(palpiteCasa, palpiteFora, pm, pv);
      const mostrarParcial = !finalizado && parcial !== null;
      return { ...p, pontosExibidos: parcial !== null ? parcial : 0, parcial: mostrarParcial };
    });
  }, [palpitesGrupo, jogo]);

  if (!isOpen || !jogo) return null;

  return (
    <div className="detalhes-jogo-modal-overlay" onClick={onClose}>
      <div className="detalhes-jogo-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="detalhes-jogo-modal-close" onClick={onClose}>
          ✕
        </button>

        <h2 className="detalhes-jogo-modal-title">
          📊 Detalhes do Jogo
        </h2>

        <div className="detalhes-jogo-info">
          <p><strong>{jogo.time_mandante}</strong> {jogo.placar_mandante} x {jogo.placar_visitante} <strong>{jogo.time_visitante}</strong></p>
          <p className="detalhes-jogo-data">{new Date(jogo.data).toLocaleString()}</p>
        </div>

        <div className="detalhes-secao">
          <h3>🎯 Palpites e Pontos do Jogo</h3>
          {palpitesComPontos && palpitesComPontos.length > 0 ? (
            <table className="detalhes-tabela">
              <thead>
                <tr>
                  <th>Apostador</th>
                  <th>Palpite</th>
                  <th>Pontos</th>
                </tr>
              </thead>
              <tbody>
                {palpitesComPontos.map((p) => (
                  <tr key={p.id_usuario}>
                    <td>{p.nome}</td>
                    <td>{p.palpite_casa} x {p.palpite_fora}</td>
                    <td className="detalhes-pontos">
                      {Number(p.pontosExibidos || 0).toFixed(2)}
                      {p.parcial && <span className="tag-parcial">Parcial</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="detalhes-vazio">Nenhum palpite disponível.</p>
          )}
        </div>

        <div className="detalhes-secao">
          <h3>🏆 Pontuação Geral da Rodada</h3>
          {rankingRodada && rankingRodada.length > 0 ? (
            <table className="detalhes-tabela">
              <thead>
                <tr>
                  <th>Pos.</th>
                  <th>Apostador</th>
                  <th>Pontos</th>
                </tr>
              </thead>
              <tbody>
                {rankingRodada.map((r, idx) => (
                  <tr key={r.id_usuario}>
                    <td>{idx + 1}º</td>
                    <td>{r.nome_apostador}</td>
                    <td className="detalhes-pontos">{Number(r.pontos_totais || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="detalhes-vazio">Nenhum ranking disponível.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DetalhesJogoModal;
