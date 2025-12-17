# Guia Rápido de Correção - Sistema de Fallback

## 🎯 Problema Atual
O teste revelou que **todas as 3 fontes ativas estão falhando**:
- ❌ API Futebol: Token expirado (401)
- ⚠️ API-Football: Retorna 0 partidas (provavelmente ano errado)
- ❌ API Globo: URL não existe

## ✅ Soluções Rápidas (Escolha uma)

### **Solução 1: Corrigir API-Football (RECOMENDADA - 5 minutos)**

A API-Football está conectando, mas retornando 0 partidas porque provavelmente está buscando dados de 2024, mas estamos em 2025.

**Passo 1:** Editar `backend/services/adapters/apiFutebolAdapter.js`
```javascript
// Linha 7 - Mudar de 2024 para 2025
const SEASON = 2025;
```

**Passo 2:** Testar novamente
```powershell
cd c:\BolaoVIP\backend
node scripts/testarFallback.js
```

**Passo 3:** Verificar se agora retorna partidas. Se ainda retornar 0:
- O Brasileirão 2025 pode não ter começado ainda
- Teste com rodadas do ano anterior (SEASON = 2024)

---

### **Solução 2: Renovar API Futebol Original (10 minutos)**

Se você quer manter a fonte original funcionando:

**Passo 1:** Acessar https://api-futebol.com.br/dashboard

**Passo 2:** Fazer login com suas credenciais

**Passo 3:** Verificar status do plano:
- Se expirou: Renovar assinatura
- Se mudou: Obter novo token

**Passo 4:** Atualizar `.env`
```env
API_FUTEBOL_TOKEN=SEU_NOVO_TOKEN_AQUI
```

**Passo 5:** Testar
```powershell
node scripts/testarFallback.js
```

---

### **Solução 3: Implementar Scraping do GE.com (30 minutos)**

Para ter uma fonte 100% brasileira e gratuita como backup final.

**Passo 1:** O adapter já existe em `backend/services/adapters/globoApiAdapter.js`

**Passo 2:** Implementar método `buscarRodadaGE()` usando cheerio:

```javascript
const cheerio = require('cheerio');

async function buscarRodadaGE(rodada) {
  try {
    const url = `https://ge.globo.com/futebol/brasileirao-serie-a/`;
    const response = await axios.get(url, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const partidas = [];

    // Selecionar elementos das partidas
    $('.partida-item').each((i, elem) => {
      const timeCasa = $(elem).find('.time-casa .nome').text().trim();
      const timeVisitante = $(elem).find('.time-visitante .nome').text().trim();
      const placarCasa = $(elem).find('.placar-casa').text().trim();
      const placarVisitante = $(elem).find('.placar-visitante').text().trim();
      
      partidas.push({
        time_casa: timeCasa,
        time_visitante: timeVisitante,
        placar_casa: parseInt(placarCasa) || null,
        placar_visitante: parseInt(placarVisitante) || null,
        // ... outros campos
      });
    });

    return partidas;
  } catch (error) {
    console.error('Erro no scraping:', error.message);
    throw error;
  }
}
```

**Passo 3:** Inspecionar o HTML do GE.com para encontrar os seletores corretos

**Passo 4:** Testar
```powershell
node scripts/testarFallback.js
```

---

## 🚀 Solução IMEDIATA para Produção

Se você precisa do sistema funcionando **AGORA**, enquanto resolve as APIs:

### Opção A: Usar Dados Estáticos Temporários
Criar um arquivo JSON com os resultados das rodadas já finalizadas:

```javascript
// backend/data/rodadas-cache.json
{
  "22": [
    {
      "partida_id": 123456,
      "time_mandante": { "nome_popular": "Flamengo", "escudo": "..." },
      "placar_mandante": 2,
      "placar_visitante": 1,
      // ...
    }
  ]
}
```

E modificar o fallback para usar esse cache quando todas as APIs falharem.

### Opção B: Manter Apenas Fonte Funcional
Desative as fontes quebradas temporariamente:

```javascript
// Em resultadosFallbackService.js, configurar fontes:
const FONTES_DISPONIVEIS = [
  {
    nome: 'api-futebol',
    ativa: false,  // Desativa até renovar token
    // ...
  },
  {
    nome: 'api-football',
    ativa: true,   // Mantém ativa (mesmo retornando 0 por enquanto)
    // ...
  },
  {
    nome: 'globo',
    ativa: false,  // Desativa até corrigir URL
    // ...
  }
];
```

---

## 📋 Checklist de Verificação

Antes de colocar em produção, verifique:

- [ ] Pelo menos 1 fonte retornando dados válidos
- [ ] Token/chave da API configurado no `.env`
- [ ] SEASON correto (2024 ou 2025)
- [ ] Teste com `node scripts/testarFallback.js` passou
- [ ] Logs não mostram erros 401/404
- [ ] Dados normalizados estão no formato esperado
- [ ] Banco de dados aceita os campos retornados

---

## 🔍 Diagnóstico Rápido

Execute este comando para diagnóstico completo:

```powershell
cd c:\BolaoVIP\backend
node -e "require('dotenv').config(); console.log('Tokens configurados:'); console.log('API_FUTEBOL_TOKEN:', process.env.API_FUTEBOL_TOKEN ? 'SIM' : 'NÃO'); console.log('API_FOOTBALL_KEY:', process.env.API_FOOTBALL_KEY ? 'SIM' : 'NÃO'); console.log('FOOTBALL_DATA_TOKEN:', process.env.FOOTBALL_DATA_TOKEN ? 'SIM' : 'NÃO');"
```

---

## 🆘 Se Nada Funcionar

1. **Verificar conectividade:**
```powershell
Test-NetConnection api.api-futebol.com.br -Port 443
Test-NetConnection v3.football.api-sports.io -Port 443
```

2. **Testar requisição manual:**
```powershell
curl -H "Authorization: Bearer SEU_TOKEN" https://api.api-futebol.com.br/v1/campeonatos/10/rodadas/22
```

3. **Verificar proxy/firewall:**
   - Algumas redes corporativas bloqueiam APIs externas
   - Testar com conexão móvel/diferente

4. **Contatar suporte das APIs:**
   - API Futebol: suporte@api-futebol.com.br
   - RapidAPI: https://rapidapi.com/support

---

## 📞 Próximos Passos

1. **Agora:** Aplicar Solução 1 (corrigir SEASON)
2. **Hoje:** Testar em ambiente de desenvolvimento
3. **Esta semana:** Implementar scraping GE.com como backup final
4. **Mês:** Avaliar renovação API Futebol se necessário

---

**Última atualização:** 30/11/2025  
**Status:** Sistema implementado, aguardando configuração de pelo menos 1 fonte válida
