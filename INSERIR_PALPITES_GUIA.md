# Guia para Inserir Palpites de Usuários

## 📋 Visão Geral

Este guia explica como inserir palpites (apostas/previsões) de usuários no banco de dados de produção de forma consistente e segura, reutilizando um padrão estabelecido em vez de criar scripts individuais a cada necessidade.

**Contexto:** Os palpites são as previsões dos usuários para os placar dos jogos de uma rodada específica do campeonato.

---

## 🔧 Pré-requisitos

### 1. Conexão com o Banco de Dados
- SSH tunnel ativo na porta 3307 apontando para o servidor de produção
- Comando para iniciar o tunnel:
  ```powershell
  .\start-ssh-tunnel.ps1
  ```
- Verificar status: `netstat -an | findstr 3307` (Windows)

### 2. Credenciais do Banco
```
Host: localhost
Porta: 3307
Usuário: root
Senha: fBVhh6w2KW
Database: bolaovip
```

### 3. Dados Necessários
- **Nome do usuário** (para validação)
- **6 palpites** para a rodada (podem vir de imagens, planilhas, etc.)

---

## 📊 Estrutura de Dados Esperada

### Identificar o Usuário
1. Localize o `id` e `nome` do usuário na tabela `usuarios`
2. Se o usuário não existir, será necessário criá-lo antes

### Dados do Palpite
Cada palpite deve conter:
- `id_usuario`: ID numérico do usuário (integer)
- `id_jogo`: ID do jogo (integer) - obtido da tabela `jogos`
- `gols_casa`: Gols do time mandante (integer 0-10)
- `gols_fora`: Gols do time visitante (integer 0-10)

### Dados Fixos para Brasileirão Série A 2026
- `grupo_id`: 3 (BolaoBrasileiraoA)
- `campeonato_id`: 10 (Brasileirão Série A)
- `rodada`: Número da rodada (ex: 2, 3, 4...)

---

## 🚀 Passo a Passo para Inserir Palpites

### Opção A: Usar Script Reutilizável (Recomendado)

#### 1. Preparar os Dados

Identifique os 6 palpites do usuário e os IDs dos jogos correspondentes. Exemplo:
```
Usuário: Jorge Artur da Silva Nunes (ID: 21)
Rodada: 2

Palpites:
- Jogo 43725 (Flamengo vs Internacional): 2 x 0
- Jogo 43726 (Bragantino vs Atlético-MG): 1 x 2
- Jogo 43727 (Santos vs São Paulo): 0 x 1
- Jogo 43728 (Remo vs Mirassol): 0 x 3
- Jogo 43729 (Palmeiras vs Vitória): 1 x 0
- Jogo 43730 (Grêmio vs Botafogo): 1 x 1
```

#### 2. Adaptar o Script Modelo

Copie e adapte o script em `backend/scripts/inserir-palpites-jorge.js`:

```javascript
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: 'fBVhh6w2KW',
  database: 'bolaovip',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 🔴 EDITAR AQUI: Substitua pelos IDs dos jogos e placares reais
const palpites = [
  { jogo_id: 43725, gols_casa: 2, gols_fora: 0 },
  { jogo_id: 43726, gols_casa: 1, gols_fora: 2 },
  { jogo_id: 43727, gols_casa: 0, gols_fora: 1 },
  { jogo_id: 43728, gols_casa: 0, gols_fora: 3 },
  { jogo_id: 43729, gols_casa: 1, gols_fora: 0 },
  { jogo_id: 43730, gols_casa: 1, gols_fora: 1 }
];

// 🔴 EDITAR AQUI: ID do usuário
const usuario_id = 21;

// 🔴 EDITAR AQUI: Número da rodada
const rodada = 2;

(async () => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    console.log('🔄 Iniciando inserção de palpites...\n');
    
    for (let i = 0; i < palpites.length; i++) {
      const palpite = palpites[i];
      await connection.query(
        `INSERT INTO palpites 
         (id_usuario, grupo_id, campeonato_id, rodada, id_jogo, gols_casa, gols_fora) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [usuario_id, 3, 10, rodada, palpite.jogo_id, palpite.gols_casa, palpite.gols_fora]
      );
      
      console.log(`✅ Palpite ${i + 1}/6 inserido - Jogo ID ${palpite.jogo_id}: ${palpite.gols_casa} x ${palpite.gols_fora}`);
    }
    
    await connection.commit();
    console.log('\n✅ Todos os 6 palpites foram inseridos com sucesso!');
    
    // Verificar inserção
    const [verificacao] = await connection.query(
      `SELECT COUNT(*) as total FROM palpites WHERE id_usuario = ? AND rodada = ?`,
      [usuario_id, rodada]
    );
    console.log(`\n📊 Verificação: ${verificacao[0].total} palpites para usuário ${usuario_id} na rodada ${rodada}`);
    
  } catch (error) {
    await connection.rollback();
    console.error('❌ ERRO na inserção:', error.message);
    console.error('Transação desfeita - nenhum dado foi alterado');
  } finally {
    connection.release();
    await pool.end();
  }
})();
```

#### 3. Nomear e Salvar o Script

Salve com um nome descritivo:
- `backend/scripts/inserir-palpites-[NOME-USUARIO].js`
- Exemplo: `inserir-palpites-carlos-silva.js`

#### 4. Executar o Script

```powershell
cd C:\BolaoVIP\backend
node scripts/inserir-palpites-[NOME-USUARIO].js
```

Saída esperada:
```
🔄 Iniciando inserção de palpites...

✅ Palpite 1/6 inserido - Jogo ID 43725: 2 x 0
✅ Palpite 2/6 inserido - Jogo ID 43726: 1 x 2
✅ Palpite 3/6 inserido - Jogo ID 43727: 0 x 1
✅ Palpite 4/6 inserido - Jogo ID 43728: 0 x 3
✅ Palpite 5/6 inserido - Jogo ID 43729: 1 x 0
✅ Palpite 6/6 inserido - Jogo ID 43730: 1 x 1

✅ Todos os 6 palpites foram inseridos com sucesso!

📊 Verificação: 6 palpites para usuário 21 na rodada 2
```

---

## 🔍 Verificar os Dados Inseridos

### 1. Verificação Rápida (no Script)
O script já executa uma verificação automática ao final. A contagem deve retornar **6**.

### 2. Verificação Manual via MySQL

```sql
-- Ver todos os palpites de um usuário na rodada
SELECT * FROM palpites 
WHERE id_usuario = 21 AND rodada = 2;

-- Ver estatísticas
SELECT COUNT(*) as total_palpites 
FROM palpites 
WHERE id_usuario = 21 AND rodada = 2;

-- Ver com detalhes dos jogos
SELECT p.id, p.gols_casa, p.gols_fora, j.time_mandante, j.time_visitante
FROM palpites p
JOIN jogos j ON p.id_jogo = j.id
WHERE p.id_usuario = 21 AND p.rodada = 2;
```

---

## 🔎 Como Encontrar os IDs dos Jogos da Rodada

### Script para Consultar Jogos da Rodada

Crie `backend/scripts/buscar-jogos-rodada.js`:

```javascript
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: 'fBVhh6w2KW',
  database: 'bolaovip',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

(async () => {
  const connection = await pool.getConnection();
  
  try {
    const rodada = process.argv[2] || 2; // Padrão: rodada 2
    
    const [jogos] = await connection.query(
      `SELECT id, rodada, time_mandante, time_visitante, data 
       FROM jogos 
       WHERE campeonato_id = 10 AND rodada = ?
       ORDER BY data ASC`,
      [rodada]
    );
    
    console.log(`\n📅 Jogos da Rodada ${rodada}:\n`);
    jogos.forEach((jogo, index) => {
      console.log(`${index + 1}. ID: ${jogo.id} | ${jogo.time_mandante} vs ${jogo.time_visitante}`);
      console.log(`   Data: ${jogo.data}\n`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    connection.release();
    await pool.end();
  }
})();
```

**Usar:**
```powershell
node scripts/buscar-jogos-rodada.js 2  # Rodada 2
node scripts/buscar-jogos-rodada.js 3  # Rodada 3
```

---

## 👤 Como Encontrar o ID de um Usuário

### Script para Buscar Usuário

Crie `backend/scripts/buscar-usuario.js`:

```javascript
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: 'fBVhh6w2KW',
  database: 'bolaovip',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

(async () => {
  const connection = await pool.getConnection();
  
  try {
    const nome = process.argv[2];
    
    if (!nome) {
      console.error('❌ Uso: node scripts/buscar-usuario.js "Nome do Usuário"');
      process.exit(1);
    }
    
    const [usuarios] = await connection.query(
      `SELECT id, nome, email FROM usuarios WHERE nome LIKE ?`,
      [`%${nome}%`]
    );
    
    if (usuarios.length === 0) {
      console.log(`❌ Nenhum usuário encontrado com nome contendo "${nome}"`);
    } else {
      console.log(`\n👤 Usuários encontrados:\n`);
      usuarios.forEach(user => {
        console.log(`ID: ${user.id} | Nome: ${user.nome} | Email: ${user.email}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    connection.release();
    await pool.end();
  }
})();
```

**Usar:**
```powershell
node scripts/buscar-usuario.js "Jorge"
node scripts/buscar-usuario.js "Cassiano"
```

---

## 📋 Checklist Antes de Inserir

- [ ] SSH tunnel ativo (`.\start-ssh-tunnel.ps1`)
- [ ] Usuário existe no banco (executar `buscar-usuario.js`)
- [ ] Rodada existe e tem 6 jogos (executar `buscar-jogos-rodada.js`)
- [ ] IDs dos jogos corretos no script
- [ ] Placares validados (0-10 gols)
- [ ] `usuario_id`, `rodada` corretos no script
- [ ] Script nomeado descritivamente

---

## ⚠️ Tratamento de Erros

### Erro: "Connection refused"
- Verificar se SSH tunnel está ativo
- `netstat -an | findstr 3307`
- Reiniciar tunnel: `.\start-ssh-tunnel.ps1`

### Erro: "Access denied for user 'root'"
- Verificar credenciais (senha: `fBVhh6w2KW`)
- Confirmar que o SSH tunnel está apontando para servidor correto

### Erro: "Unknown column 'usuario_id'"
- Verificar nomes das colunas: **`id_usuario`** (não `usuario_id`)
- Verificar nomes dos campos corretos na tabela

### Erro: "Foreign key constraint failed"
- `id_jogo` não existe na tabela `jogos`
- Validar IDs com `buscar-jogos-rodada.js`

### Erro: "Transaction rolled back"
- Dados não foram inseridos
- Verificar mensagem de erro detalhada no console
- Corrigir problema e executar script novamente

---

## 📌 Estrutura de Pastas de Scripts

```
backend/
├── scripts/
│   ├── buscar-jogos-rodada.js          ✅ (Genérico - Reutilizável)
│   ├── buscar-usuario.js               ✅ (Genérico - Reutilizável)
│   ├── inserir-palpites-cassiano.js    (Específico - Já executado)
│   ├── inserir-palpites-diney.js       (Específico - Já executado)
│   ├── inserir-palpites-jorge.js       (Específico - Já executado)
│   ├── inserir-palpites-[NOVO].js      (Copiar modelo para novos usuários)
│   └── ... outros scripts
```

---

## 🎯 Exemplo Completo: Inserir Palpites de um Novo Usuário

### Cenário: Inserir palpites de "Maria Silva" para rodada 3

#### Passo 1: Buscar o usuário
```powershell
node scripts/buscar-usuario.js "Maria"
```
Resultado: ID = 45

#### Passo 2: Listar jogos da rodada 3
```powershell
node scripts/buscar-jogos-rodada.js 3
```
Resultado:
```
1. ID: 44001 | Flamengo vs Bragantino
2. ID: 44002 | Palmeiras vs São Paulo
3. ID: 44003 | ...
```

#### Passo 3: Criar arquivo `inserir-palpites-maria.js`
Copiar template, substituir:
```javascript
const usuario_id = 45;
const rodada = 3;
const palpites = [
  { jogo_id: 44001, gols_casa: 2, gols_fora: 1 },
  // ... restante dos 6 palpites
];
```

#### Passo 4: Executar
```powershell
node scripts/inserir-palpites-maria.js
```

#### Passo 5: Verificar
```sql
SELECT COUNT(*) FROM palpites WHERE id_usuario = 45 AND rodada = 3;
-- Resultado esperado: 6
```

---

## 📚 Referências

- **Tabela `palpites`**: Armazena previsões dos usuários
- **Tabela `usuarios`**: Dados dos usuários
- **Tabela `jogos`**: Dados dos jogos (rodadas, times, datas)
- **Tabela `grupos`**: Grupos de apostadores (BolaoBrasileiraoA = ID 3)
- **Tabela `campeonatos`**: Campeonatos (Brasileirão = ID 10)

---

## 💡 Dicas

1. **Sempre validar dados antes de inserir** - Verifique os IDs e placares
2. **Usar transações** - O script já usa `beginTransaction()`, seguro contra erros parciais
3. **Documentar sources** - Anote de onde vieram os dados (imagem, email, planilha)
4. **Verificação dupla** - Execute a query de verificação após inserir
5. **Manter scripts antigos** - Servem como referência se necessário reprocessar

---

**Data de Atualização:** 4 de fevereiro de 2026  
**Último Status:** 3 usuários processados com sucesso (Cassiano, Diney, Jorge)
