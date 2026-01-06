#!/usr/bin/env node
/**
 * Mostra quando as requisições à API estão agendadas para disparar
 */

const { DateTime } = require('luxon');

console.log('='.repeat(80));
console.log('DIAGNÓSTICO: Horários de requisições agendadas');
console.log('='.repeat(80));

const agora = DateTime.now().setZone('America/Manaus');
console.log(`\n⏰ Hora atual (Manaus): ${agora.toFormat('dd/MM/yyyy HH:mm:ss')}\n`);

console.log('PROBLEMA IDENTIFICADO:');
console.log('-'.repeat(80));
console.log('As requisições estão sendo agendadas para INICIAR quando o jogo COMEÇA.');
console.log('Exemplo: Jogo às 15:30 → Requisições começam às 15:30 ❌');
console.log('');
console.log('COMPORTAMENTO CORRETO:');
console.log('As requisições devem começar APÓS o jogo TERMINAR (~2h depois).');
console.log('Exemplo: Jogo às 15:30 → Requisições começam às 17:30 ✅');
console.log('');
console.log('LÓGICA ATUAL (scheduler.js linha 250-259):');
console.log('  1. Pega horário do jogo: inicioManaus = 15:30');
console.log('  2. Calcula tempo até início: tempoAteInicio');
console.log('  3. Agenda setTimeout(iniciarIntervalo, tempoAteInicio)');
console.log('  4. Resultado: Requisições começam às 15:30 (ERRADO)');
console.log('');
console.log('CORREÇÃO NECESSÁRIA:');
console.log('  Adicionar +120 minutos (2 horas) ao horário do jogo:');
console.log('  const inicioRequisicoes = inicioManaus.plus({ minutes: 120 });');
console.log('  const tempoAteInicio = inicioRequisicoes.diff(agoraManaus).as("milliseconds");');
console.log('');
console.log('='.repeat(80));
console.log('\nDESEJA APLICAR A CORREÇÃO? (commit necessário)');
console.log('Execute: git pull && pm2 restart server');
console.log('='.repeat(80));
