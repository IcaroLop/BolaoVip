# Bolão VIP - Frontend Web

Versão web pura do Bolão VIP, sem dependências Capacitor ou mobile.

## Instalação e Desenvolvimento

### Pré-requisitos
- Node.js 16+
- npm ou yarn
- SSH tunnel ativo para acesso ao backend (quando em desenvolvimento local)

### Desenvolvimento Local (npm run dev)

1. **Inicie o SSH tunnel** (em outro terminal):
```bash
cd c:\BolaoVIP
.\start-ssh-tunnel.ps1
```

2. **Instale dependências**:
```bash
cd c:\BolaoVIP\frontend-web
npm install
```

3. **Inicie servidor de desenvolvimento**:
```bash
npm run dev
```

O servidor iniciará na porta 3000 e se conectará ao backend via tunnel em `http://localhost:3001`.

### Build para Produção

1. **Build da aplicação**:
```bash
npm run build
```

Gera arquivos otimizados em `/build`.

2. **Iniciar servidor de produção** (requer `serve` instalado globalmente):
```bash
npm start
```

Ou execute em servidor real com NODE_ENV=production:
```bash
REACT_APP_API_URL=http://192.168.56.127:3001 npm run build
# Deploy /build para seu servidor web
```

## Variáveis de Ambiente

### .env.development
```
REACT_APP_API_URL=http://localhost:3001
PORT=3000
```
Usada ao executar `npm run dev`. Conecta ao backend via SSH tunnel.

### .env.production / .env
```
REACT_APP_API_URL=http://192.168.56.127:3001
PORT=3000
```
Usada para build de produção.

## Estrutura do Projeto

- `/src` - Código fonte React
- `/public` - Arquivos públicos estáticos
- `/build` - Build otimizado (gerado por `npm run build`)

## Diferenças em relação ao frontend mobile (Capacitor)

✅ Removidos:
- Dependências Capacitor (@capacitor/core, @capacitor/android, etc.)
- Plugins mobile (push notifications, local notifications via Capacitor)
- Configurações Android/iOS

✅ Adicionado:
- Scripts `dev` e `start` específicos para web
- Arquivos `.env.development` e `.env.production`
- Suporte a servir via HTTP em produção

## Troubleshooting

### "Não consegue conectar ao backend"
- Verifique se SSH tunnel está ativo: `.\start-ssh-tunnel.ps1`
- Confirme `REACT_APP_API_URL` correto em `.env.development`
- Teste conectividade: `curl http://localhost:3001/health` (ou rota equivalente)

### "Porta 3000 já está em uso"
- Mude em `.env.development`: `PORT=3001` ou outra porta disponível
- Ou termine processo que usa porta 3000

## Deploy

Para deploy em servidor real:
1. Atualize `REACT_APP_API_URL` em `.env.production` para URL real do backend
2. Execute `npm run build`
3. Sirva a pasta `/build` como site estático (nginx, Apache, Vercel, etc.)

---

**Versão**: 1.0  
**Data**: 03/02/2026  
**Status**: Web puro, sem Capacitor
