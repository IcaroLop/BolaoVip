// services/pontuacaoService.js

/**
 * Calcula pontuação do palpite com base no resultado real
 * REGRAS ATUALIZADAS (Dez/2025):
 * 1. Placar exato (não empate): por total de gols (≤3→4.0, 4→5.5, 5→6.5, 6→7.5, >6→8.5)
 * 2. Empate previsto e ocorrido (mas não exato): 1.5 pts
 * 3. Empate exato (mesmo placar): por total de gols
 *    - 0-0 (0 gols) → 1.5
 *    - 1-1 (2 gols) → 1.5
 *    - 2-2 (4 gols) → 5.5
 *    - 3-3 (6 gols) → 7.5
 *    - 4-4+ (8+ gols) → 8.5
 * 4. Vencedor correto: 1.5 + bônus 0.5 se acertar gols de um lado = 2.0
 * 5. Apenas gols de um lado correto: 0.5
 * 6. Errou tudo: 0.0
 */
function calcularPontuacao(palpite, resultado) {
  const pCasa = palpite.placar_casa;
  const pFora = palpite.placar_fora;
  const rCasa = resultado.placar_mandante;
  const rFora = resultado.placar_visitante;

  // Se o palpite for NULL (usuário não palpitou), retorna 0 pontos
  if (pCasa === null || pCasa === undefined || pFora === null || pFora === undefined) {
    return 0.0;
  }

  const totalGols = rCasa + rFora;
  const isEmpateReal = rCasa === rFora;
  const isEmpatePalpite = pCasa === pFora;
  const isPlacarExato = pCasa === rCasa && pFora === rFora;

  // 1. Placar exato (mesmo placar palpitado e resultado)
  if (isPlacarExato) {
    // Se for empate exato, usa tabela de empate
    if (isEmpateReal) {
      return calcularPontosEmpate(totalGols);
    }
    // Se não for empate, usa tabela de exato
    return calcularPontosExato(totalGols);
  }

  // 2. Empate previsto E empate real (mas placar diferente)
  // Ex: palpitou 1x1, resultado foi 2x2 - acertou tipo mas não exato
  if (isEmpatePalpite && isEmpateReal) {
    return 1.5; // Acertou que é empate, mesmo com gols diferentes
  }

  // 3. Vencedor correto (jogo com vencedor)
  const vencedorPalpite = pCasa > pFora ? 'mandante' : pCasa < pFora ? 'visitante' : 'empate';
  const vencedorReal = rCasa > rFora ? 'mandante' : rCasa < rFora ? 'visitante' : 'empate';

  if (vencedorPalpite === vencedorReal && vencedorReal !== 'empate') {
    let pontos = 1.5;
    // Bônus: acertou gols de um dos lados
    if (pCasa === rCasa || pFora === rFora) {
      pontos += 0.5;
    }
    return pontos;
  }

  // 4. Acerto de um dos gols (sem acertar vencedor/empate)
  if (pCasa === rCasa || pFora === rFora) {
    return 0.5;
  }

  // 5. Errou tudo
  return 0.0;
}

/**
 * Pontuação para placar exato (jogos COM vencedor)
 * ≤3 gols → 4.0
 * 4 gols → 5.5
 * 5 gols → 6.5
 * 6 gols → 7.5
 * >6 gols → 8.5
 */
function calcularPontosExato(totalGols) {
  if (totalGols <= 3) return 4.0;
  if (totalGols === 4) return 5.5;
  if (totalGols === 5) return 6.5;
  if (totalGols === 6) return 7.5;
  return 8.5; // >6 gols
}

/**
 * Pontuação para empate previsto e ocorrido (inclui exatos)
 * 0-0 (0 gols) → 1.5
 * 1-1 (2 gols) → 1.5
 * 2-2 (4 gols) → 5.5
 * 3-3 (6 gols) → 7.5
 * 4-4+ (8+ gols) → 8.5
 */
function calcularPontosEmpate(totalGols) {
  if (totalGols === 0) return 1.5;  // 0-0
  if (totalGols === 2) return 1.5;  // 1-1
  if (totalGols === 4) return 5.5;  // 2-2
  if (totalGols === 6) return 7.5;  // 3-3
  if (totalGols >= 8) return 8.5;   // 4-4 ou mais
  
  // Casos intermediários (totais ímpares = empates impossíveis), retorna 0 por segurança
  return 0.0;
}

module.exports = { calcularPontuacao };
