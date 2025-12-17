# Bolão VIP ⚽

Plataforma de bolão de apostas esportivas para o Campeonato Brasileiro com integração de pagamentos PIX via Efí Pay (Gerencianet).

## 📋 Descrição

Sistema completo de bolão online com:
- **Frontend**: React 19 + React Router + Tailwind CSS
- **Backend**: Node.js + Express + MySQL
- **APIs Externas**: api-futebol.com.br, Efí Pay (PIX)
- **Web Scraping**: Globo Esporte (notícias e placares ao vivo)

## 🚀 Funcionalidades

### Para Usuários
- ✅ Cadastro e autenticação com JWT
- 🎯 Envio de palpites com sistema de pontuação multi-tier
- 💰 Sistema de saldo (depósito/saque via PIX)
- 🏆 Rankings (rodada vigente e geral)
- 📊 Tabela de classificação do Brasileirão
- 📜 Histórico de palpites e premiações
- 📰 Notícias atualizadas do futebol brasileiro

### Para Administradores
- 👥 Gerenciamento de usuários e grupos
- ⚙️ Configurações do sistema
- 💳 Administração de pagamentos (aprovação/rejeição)
- 🔄 Atualização automática de resultados via cron jobs

## 🛠️ Tecnologias

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Banco de Dados**: MySQL 2 (connection pool)
- **Autenticação**: JWT (jsonwebtoken) + bcrypt
- **Agendamento**: node-cron
- **Pagamentos**: Efí Pay SDK (PIX)
- **Web Scraping**: Puppeteer + Cheerio
- **Data/Hora**: Luxon (timezone São Paulo → Manaus)

### Frontend
- **Framework**: React 19
- **Roteamento**: React Router DOM
- **Estilização**: Tailwind CSS
- **HTTP Client**: Axios
- **Storage**: LocalStorage customizado
- **Modais**: React Portals

## 📂 Estrutura do Projeto

```
BolaoVIP/
├── backend/
│   ├── controllers/       # Lógica de negócio das rotas
│   ├── database/          # Conexão MySQL
│   ├── helpers/           # Utilitários
│   ├── jobs/              # Cron jobs e agendamentos
│   ├── middleware/        # Autenticação e validações
│   ├── pix/               # Certificados Efí Pay
│   ├── public/            # Arquivos estáticos (escudos)
│   ├── routes/            # Definição de rotas
│   ├── scripts/           # Scripts utilitários
│   ├── services/          # Serviços (API, scrapers, pontuação)
│   ├── config/            # Configurações (tokens)
│   ├── .env               # Variáveis de ambiente (NÃO commitado)
│   ├── server.js          # Entrada do servidor
│   └── package.json
│
├── frontend/bolao-vip/
│   ├── public/            # Assets estáticos
│   ├── src/
│   │   ├── components/    # Header, Footer, Modais
│   │   ├── pages/         # Páginas React
│   │   ├── services/      # Chamadas API (se houver)
│   │   ├── utils/         # Storage customizado
│   │   ├── App.js         # Configuração de rotas
│   │   └── index.js       # Entrada do React
│   ├── package.json
│   └── tailwind.config.js
│
├── Documentações/         # Scripts de backup e docs
├── .gitignore
└── README.md
```

## ⚙️ Instalação e Configuração

### Pré-requisitos
- Node.js 16+
- MySQL 8+
- Conta na api-futebol.com.br
- Conta Efí Pay (Gerencianet) com certificados PIX

### 1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/BolaoVIP.git
cd BolaoVIP
```

### 2. Configure o Backend

```bash
cd backend
npm install
```

Crie o arquivo `.env`:
```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=bolaovip

# JWT
JWT_SECRET=seu_jwt_secret_super_secreto

# API Futebol
API_FUTEBOL_TOKEN=live_seu_token_producao
API_FUTEBOL_DEV_TOKEN=test_seu_token_desenvolvimento
API_FUTEBOL_ENVIRONMENT=production

# Efí Pay PIX
EFI_CLIENT_ID=seu_client_id
EFI_CLIENT_SECRET=seu_client_secret
EFI_PIX_KEY=sua_chave_pix
EFI_PIX_CERT_PATH=./pix/certificados/producao.pem
EFI_PIX_KEY_PATH=./pix/certificados/producao-key.pem
EFI_PIX_SANDBOX=false
```

Importe o schema do banco de dados:
```bash
# Execute os scripts SQL na pasta Documentações/Scripts Backups/
mysql -u root -p bolaovip < schema.sql
```

Inicie o servidor:
```bash
node server.js
# Servidor rodando em http://localhost:3001
```

### 3. Configure o Frontend

```bash
cd ../frontend/bolao-vip
npm install
```

Ajuste a URL da API em `src/` (procure por `http://192.168.56.127:3001` e substitua conforme necessário).

Inicie o desenvolvimento:
```bash
npm start
# Aplicação rodando em http://localhost:3000
```

## 🎯 Sistema de Pontuação

O sistema calcula pontos por palpite de forma hierárquica:

| Resultado | Pontos | Critério |
|-----------|--------|----------|
| **Placar exato** | 4.0 a 8.5+ pts | Baseado no total de gols |
| **Empate** | 1.5 pts | Acertou que seria empate (qualquer placar) |
| **Vencedor** | 1.5 pts | Acertou apenas o time vencedor |
| **1 gol certo** | 0.5 pts | Acertou gols de apenas 1 time |
| **Tudo errado** | 0.0 pts | Nenhum acerto |

**Escala de placar exato:**
- ≤3 gols: 4.0 pts
- 4 gols: 5.5 pts
- 5 gols: 6.5 pts
- 6 gols: 7.5 pts
- 7+ gols: 8.5+ pts

## 🔄 Automação

O sistema possui cron jobs que executam:

- **A cada 15 minutos**: Busca rodada vigente e atualiza jogos
- **A cada 30 minutos**: Consulta resultados e calcula pontuações
- **Diariamente**: Atualiza classificação do Brasileirão
- **A cada 2 horas**: Coleta notícias do GE

## 🔐 Autenticação

- Tokens JWT com validade de 12 horas
- Middleware `authMiddleware.js` protege rotas sensíveis
- Senha hash com bcrypt (10 rounds)

## 💳 Pagamentos PIX

- Integração via Efí Pay SDK
- Geração de QR Code PIX
- Webhook para confirmação automática (em desenvolvimento)
- Gestão de saldo por usuário (tabela `saldo_usuario`)
- Extrato de movimentações (depósitos, saques, apostas, prêmios)

## 📱 Interface

- Design responsivo (mobile-first)
- Tema dark esportivo moderno
- Cores principais: Verde (#3df29d) e Azul (#4ba4ff)
- Animações e transições suaves

## 🐛 Debug e Logs

- Console logs detalhados em todos os serviços
- Registro de requisições à API no banco (`requisicoes_api_futebol`)
- Ambiente de desenvolvimento vs produção (tokenConfig.js)

## 📄 Licença

Este projeto é proprietário. Todos os direitos reservados.

## 👨‍💻 Autor

Desenvolvido para gerenciamento de bolões esportivos brasileiros.

## 🤝 Contribuindo

Este é um projeto privado. Para contribuir, entre em contato com o administrador.

---

⚽ **Bolão VIP** - Transformando palpites em prêmios!
