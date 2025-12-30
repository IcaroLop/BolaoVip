#!/bin/bash
# Script de diagnóstico - Execute no servidor para descobrir problema

echo "========================================="
echo "🔍 DIAGNÓSTICO DE CREDENCIAIS .env"
echo "========================================="
echo ""

echo "1️⃣ Localização atual:"
pwd
echo ""

echo "2️⃣ Arquivos .env encontrados:"
find . -name ".env*" -type f 2>/dev/null
echo ""

echo "3️⃣ Conteúdo do .env (se existir):"
if [ -f .env ]; then
    echo "✅ Arquivo .env EXISTE"
    echo "--- Início do arquivo ---"
    cat .env
    echo "--- Fim do arquivo ---"
else
    echo "❌ Arquivo .env NÃO EXISTE"
fi
echo ""

echo "4️⃣ Conteúdo do .env.production:"
if [ -f .env.production ]; then
    echo "✅ Arquivo .env.production EXISTE"
    echo "--- Início do arquivo ---"
    cat .env.production
    echo "--- Fim do arquivo ---"
else
    echo "❌ Arquivo .env.production NÃO EXISTE"
fi
echo ""

echo "5️⃣ Credenciais específicas do .env:"
if [ -f .env ]; then
    grep "DB_USER" .env || echo "❌ DB_USER não encontrado"
    grep "DB_PASSWORD" .env || echo "❌ DB_PASSWORD não encontrado"
    grep "DB_HOST" .env || echo "❌ DB_HOST não encontrado"
else
    echo "❌ Arquivo .env não existe para verificar"
fi
echo ""

echo "6️⃣ Processos Node.js rodando:"
ps aux | grep node | grep -v grep
echo ""

echo "7️⃣ Variáveis de ambiente Node (se rodando):"
pgrep -f "node server.js" > /dev/null && echo "✅ Backend está rodando" || echo "❌ Backend NÃO está rodando"
echo ""

echo "8️⃣ Último commit Git:"
git log -1 --oneline 2>/dev/null || echo "❌ Não é um repositório Git ou git não disponível"
echo ""

echo "========================================="
echo "📋 AÇÕES SUGERIDAS"
echo "========================================="

if [ ! -f .env ]; then
    echo "⚠️  PROBLEMA: Arquivo .env não existe!"
    echo "   SOLUÇÃO: Execute 'cp .env.production .env'"
elif ! grep -q "bolaovip_user" .env; then
    echo "⚠️  PROBLEMA: .env não contém 'bolaovip_user'"
    echo "   SOLUÇÃO: Execute 'cp .env.production .env' (sobrescrever)"
else
    echo "✅ Arquivo .env parece correto"
    echo "   Se ainda há erro, reinicie: pkill -f 'node server.js' && node server.js"
fi

echo ""
echo "========================================="
