# Sistema de Fallback para Busca de Resultados - Bolão VIP

## 📋 Visão Geral

Sistema implementado para buscar resultados do Campeonato Brasileiro Série A de **múltiplas fontes automaticamente**, garantindo alta disponibilidade mesmo quando a API principal falha ou expira.

### Estratégia de Fallback
O sistema tenta as fontes em ordem de prioridade até encontrar dados válidos:
1. **API Futebol** (api-futebol.com.br) - Fonte original
2. **API-Football** (RapidAPI) - Principal alternativa
3. **API Globo** (não oficial) - Fonte brasileira
4. **Football-Data.org** (desativada por padrão)

---

## 🏗️ Arquitetura

### Estrutura de Arquivos Criados
```
backend/
├── services/
│   ├── adapters/
│   │   ├── normalizadorDados.js      # Normaliza diferentes formatos para estrutura interna
│   │   ├── apiFutebolAdapter.js      # Adapter para API-Football (RapidAPI)
│   │   ├── footballDataAdapter.js    # Adapter para Football-Data.org
│   │   └── globoApiAdapter.js        # Adapter para API Globo
│   ├── resultadosFallbackService.js  # Orquestrador principal do fallback
│   └── consultaResultadosService.js  # ATUALIZADO com integração do fallback
└── scripts/
    └── testarFallback.js             # Script de testes
```

### Fluxo de Dados
```
Requisição de Rodada
        ↓
resultadosFallbackService
        ↓
Tenta Fonte 1 (api-futebol) → Sucesso? → Normaliza → Retorna
        ↓ Falha
Tenta Fonte 2 (api-football) → Sucesso? → Normaliza → Retorna
        ↓ Falha
Tenta Fonte 3 (globo) → Sucesso? → Normaliza → Retorna
        ↓ Falha
Retorna erro completo
```

---

## ⚙️ Configuração

### 1. Variáveis de Ambiente (`.env`)

Adicione as seguintes variáveis no arquivo `backend/.env`:

```env
# API Futebol (fonte original)
API_FUTEBOL_TOKEN=live_f8c1a04cc46f0273c2eb8dab2f558e

# API-Football (RapidAPI) - Recomendado obter no https://rapidapi.com/api-sports/api/api-football
API_FOOTBALL_KEY=SUA_CHAVE_AQUI
API_FOOTBALL_HOST=v3.football.api-sports.io

# Football-Data.org - Opcional
FOOTBALL_DATA_TOKEN=

# API Globo - Não requer token (não oficial)
GLOBO_API_ENABLED=true
```

### 2. Obter Chaves de API

#### API-Football (RapidAPI) - **RECOMENDADO**
1. Acesse https://rapidapi.com/api-sports/api/api-football
2. Crie uma conta gratuita
3. Inscreva-se no plano gratuito (100 requisições/dia)
4. Copie sua `X-RapidAPI-Key`
5. Cole em `API_FOOTBALL_KEY` no `.env`

**Importante:** A API-Football requer o **League ID 71** para Brasileirão Série A e você deve ajustar o ano em `SEASON` no código se necessário.

#### Football-Data.org - **OPCIONAL**
1. Acesse https://www.football-data.org/
2. Cadastre-se (gratuito)
3. Obtenha seu token
4. Cole em `FOOTBALL_DATA_TOKEN` no `.env`
5. **Atenção:** Verifique se o Brasileirão está disponível (código BSA)

#### API Globo - **NÃO OFICIAL**
- Não requer token
- Pode mudar sem aviso
- Use como último recurso

---

## 🚀 Uso

### Integração Automática
O sistema já está integrado em `consultaResultadosService.js`. Todas as chamadas existentes agora usam fallback automaticamente:

```javascript
const { consultarResultadosDaRodada } = require('./services/consultaResultadosService');

// Usa fallback automaticamente
await consultarResultadosDaRodada(22);
```

### Uso Direto do Fallback Service
```javascript
const { buscarResultadosComFallback } = require('./services/resultadosFallbackService');

const resultado = await buscarResultadosComFallback(22);

if (resultado.sucesso) {
  console.log(`Fonte: ${resultado.descricaoFonte}`);
  console.log(`Partidas: ${resultado.partidas.length}`);
  console.log(`Tentativas: ${resultado.tentativas}`);
} else {
  console.log('Todas as fontes falharam:', resultado.erros);
}
```

### Buscar Partidas ao Vivo
```javascript
const { buscarPartidasAoVivoComFallback } = require('./services/resultadosFallbackService');

const partidasAoVivo = await buscarPartidasAoVivoComFallback();
console.log(`${partidasAoVivo.length} partidas ao vivo`);
```

---

## 🧪 Testes

### Executar Suite Completa de Testes
```powershell
cd c:\BolaoVIP\backend
node scripts/testarFallback.js
```

### Testes Específicos
```powershell
# Testar rodada específica
node scripts/testarFallback.js --rodada 15

# Testes rápidos
node scripts/testarFallback.js --quick

# Ajuda
node scripts/testarFallback.js --help
```

### Saída Esperada
```
🧪 TESTE DO SISTEMA DE FALLBACK
✅ API-Football (RapidAPI): funcionando (382ms, 10 partidas)
✅ Rodada 22 processada via api-football
📊 Resumo: 1/3 fontes funcionando
🎉 Sistema pronto para produção!
```

---

## 📊 Status Atual (Baseado no Último Teste)

### Problemas Identificados

1. **API Futebol (api-futebol.com.br)** ❌
   - Status: **401 Unauthorized / Plano expirado**
   - Erro: "Este campeonato não faz parte do seu plano"
   - **Solução:** Renovar assinatura ou usar alternativas

2. **API-Football (RapidAPI)** ⚠️
   - Status: **Conecta mas retorna 0 partidas**
   - Possíveis causas:
     - SEASON incorreto (2024 vs 2025)
     - Parâmetro de rodada incompatível
     - Brasileirão não disponível no plano gratuito
   - **Solução:** Verificar documentação e ajustar parâmetros

3. **API Globo** ❌
   - Status: **DNS não resolve (ENOTFOUND)**
   - URL testada: `api.api-one.globo.com`
   - **Solução:** Verificar URL correta ou implementar scraping HTML do GE.com

4. **Football-Data.org** ⏸️
   - Status: **Desativada por padrão**
   - Motivo: Brasileirão pode não estar disponível

### Recomendações Imediatas

#### Opção 1: Corrigir API-Football (Mais Rápido)
```javascript
// Em apiFutebolAdapter.js, linha 7:
const SEASON = 2025; // Mudar para ano correto

// Testar URL diretamente:
// https://v3.football.api-sports.io/fixtures?league=71&season=2025&round=Regular Season - 22
```

#### Opção 2: Renovar API Futebol Original
- Acessar https://api-futebol.com.br/dashboard
- Fazer upgrade do plano
- Atualizar token no `.env`

#### Opção 3: Implementar Scraping do GE.com
```javascript
// globoApiAdapter.js já tem estrutura
// Implementar parsing HTML com cheerio
const cheerio = require('cheerio');
// Scrape de https://ge.globo.com/futebol/brasileirao-serie-a/
```

---

## 🔧 Configurações Avançadas

### Ativar/Desativar Fontes
```javascript
const { configurarFontes } = require('./services/resultadosFallbackService');

configurarFontes({
  'api-futebol': false,      // Desativa fonte original
  'api-football': true,       // Ativa RapidAPI
  'globo': true,              // Ativa Globo
  'football-data': false      // Mantém desativada
});
```

### Listar Fontes Disponíveis
```javascript
const { listarFontes } = require('./services/resultadosFallbackService');

const fontes = listarFontes();
fontes.forEach(f => {
  console.log(`${f.nome}: ${f.ativa ? 'Ativa' : 'Desativada'} (prioridade ${f.prioridade})`);
});
```

### Testar Conectividade
```javascript
const { testarTodasAsFontes } = require('./services/resultadosFallbackService');

const status = await testarTodasAsFontes();
// Retorna array com status de cada fonte
```

---

## 📝 Formato de Dados Normalizado

Todas as fontes são convertidas para este formato interno:

```javascript
{
  partida_id: 123456,
  rodada: 22,
  data_realizacao_iso: "2024-11-30T19:00:00.000Z",
  time_mandante: {
    nome_popular: "Flamengo",
    escudo: "https://url-do-escudo.png"
  },
  time_visitante: {
    nome_popular: "Palmeiras",
    escudo: "https://url-do-escudo.png"
  },
  placar_mandante: 2,
  placar_visitante: 1,
  status: "finalizado", // "agendado" | "ao-vivo" | "adiado" | "cancelado"
  estadio: {
    nome_popular: "Maracanã"
  }
}
```

---

## 🐛 Troubleshooting

### "Request failed with status code 401"
- **Causa:** Token da API expirado ou inválido
- **Solução:** Renovar token no `.env`

### "Dados inválidos ou incompletos"
- **Causa:** API retornou sem partidas ou formato incompatível
- **Solução:** Verificar SEASON e parâmetros da requisição

### "getaddrinfo ENOTFOUND"
- **Causa:** URL da API incorreta ou DNS não resolve
- **Solução:** Verificar conectividade e URL correta

### "Todas as fontes falharam"
- **Causa:** Nenhuma fonte configurada corretamente
- **Solução:** 
  1. Verificar tokens no `.env`
  2. Executar `node scripts/testarFallback.js`
  3. Configurar pelo menos uma fonte válida

---

## 📚 Referências

- **API-Football**: https://rapidapi.com/api-sports/api/api-football
- **Football-Data.org**: https://www.football-data.org/
- **API Futebol**: https://api-futebol.com.br/
- **Documentação Completa**: `/Documentações/API_FUTEBOL_FORMATO_JSON.md`

---

## ✅ Próximos Passos

1. ✅ Sistema de fallback implementado
2. ✅ Normalização de dados funcionando
3. ✅ Script de testes criado
4. ⚠️ **PENDENTE:** Configurar pelo menos uma fonte válida
5. ⚠️ **PENDENTE:** Ajustar parâmetros da API-Football para 2025
6. ⚠️ **OPCIONAL:** Implementar scraping do GE.com como backup final

---

## 🔐 Segurança

- **Nunca commitar** tokens reais no Git
- Manter `.env` no `.gitignore`
- Usar variáveis de ambiente em produção
- Logs não expõem tokens completos

---

**Desenvolvido para Bolão VIP**  
*Sistema de redundância para máxima disponibilidade*
