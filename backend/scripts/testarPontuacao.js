const { calcularPontuacao } = require('../services/pontuacaoService');

// Teste: Icaro palpitou 1x1 vs Newcastle 2x2
const palpite = { placar_casa: 1, placar_fora: 1 };
const resultado = { placar_mandante: 2, placar_visitante: 2 };

const pontos = calcularPontuacao(palpite, resultado);
console.log(`Palpite: ${palpite.placar_casa}x${palpite.placar_fora}`);
console.log(`Resultado: ${resultado.placar_mandante}x${resultado.placar_visitante}`);
console.log(`Pontos: ${pontos}`);
console.log(`Esperado: 1.5`);
console.log(`Está correto? ${pontos === 1.5 ? '✅ SIM' : '❌ NÃO'}`);
