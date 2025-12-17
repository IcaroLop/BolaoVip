// services/pontuacaoService.js

function calcularPontuacao(palpite, resultado) {
  const pCasa = palpite.placar_casa;
  const pFora = palpite.placar_fora;
  const rCasa = resultado.placar_mandante;
  const rFora = resultado.placar_visitante;

  // 1. Placar exato
  if (pCasa === rCasa && pFora === rFora) {
    const totalGols = rCasa + rFora;

    if (totalGols <= 3) return 4.0;
    if (totalGols === 4) return 5.5;
    if (totalGols === 5) return 6.5;
    if (totalGols === 6) return 7.5;
    if (totalGols > 6) return 8.5;
  }

  // 2. Empate
  if (pCasa === pFora && rCasa === rFora) {
    return 1.5;
  }

  // 3. Vencedor
  const vencedorPalpite = pCasa > pFora ? 'mandante' : pCasa < pFora ? 'visitante' : 'empate';
  const vencedorReal = rCasa > rFora ? 'mandante' : rCasa < rFora ? 'visitante' : 'empate';

  if (vencedorPalpite === vencedorReal && vencedorReal !== 'empate') {
    return 1.5;
  }

  // 4. Acerto de um dos gols
  if (pCasa === rCasa || pFora === rFora) {
    return 0.5;
  }

  // 5. Errou tudo
  return 0.0;
}

module.exports = { calcularPontuacao };
