# Instruções para Adicionar Campo Bloqueado

## Executar Script SQL

**Opção 1: Via Terminal**
```powershell
cd C:\BolaoVIP\backend
mysql -u root -p bolaovip < scripts\add_bloqueado_field.sql
```

**Opção 2: Via MySQL Workbench ou phpMyAdmin**
1. Abrir o arquivo `backend/scripts/add_bloqueado_field.sql`
2. Executar o conteúdo no banco `bolaovip`

## O que o script faz:
1. Adiciona coluna `bloqueado TINYINT(1) DEFAULT 0`
2. Define todos os usuários existentes como desbloqueados (bloqueado = 0)

## Após executar o script:
1. Reinicie o backend: `node server.js`
2. Reinicie o frontend: `npm start`
3. Teste a funcionalidade de bloquear/desbloquear usuários

## Como funciona:
- **Bloquear**: Senha = '654321', bloqueado = 1
- **Desbloquear**: Senha = '123456', bloqueado = 0, precisa_trocar_senha = 1
- Botão muda de cor e texto automaticamente
