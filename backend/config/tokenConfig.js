/**
 * Gerenciador de Tokens API Futebol
 * Permite alternar entre tokens de Desenvolvimento e Produção
 * 
 * Uso:
 *   const tokenConfig = require('./tokenConfig');
 *   const token = tokenConfig.getToken();
 *   
 *   // Alternar para produção
 *   tokenConfig.setEnvironment('production');
 *   
 *   // Verificar ambiente atual
 *   console.log(tokenConfig.currentEnvironment);
 */

class TokenConfig {
  constructor() {
    const fs = require('fs');
    const path = require('path');
    
    // Inicializa com valores do .env ou padrões
    this.tokens = {
      development: process.env.API_FUTEBOL_DEV_TOKEN || 'test_e96621e3083f00ec1f644199091a46',
      production: process.env.API_FUTEBOL_PROD_TOKEN || process.env.API_FUTEBOL_TOKEN || 'live_f8c1a04cc46f0273c2eb8dab2f558e'
    };

    // Tenta ler ambiente persistido em .tokenenv
    this.tokenEnvPath = path.join(__dirname, '..', '.tokenenv');
    let persistedEnv = null;
    
    try {
      if (fs.existsSync(this.tokenEnvPath)) {
        persistedEnv = fs.readFileSync(this.tokenEnvPath, 'utf8').trim();
      }
    } catch (err) {
      // Ignora erro ao ler arquivo
    }

    // Define o ambiente: persisted > .env > default
    const defaultEnv = persistedEnv || process.env.API_FUTEBOL_ENVIRONMENT || 'development';
    this.currentEnvironment = defaultEnv;

    console.log(`[TokenConfig] Inicializado com ambiente: ${this.currentEnvironment}`);
  }

  /**
   * Retorna o token atual baseado no ambiente
   * @returns {string} Token da API Futebol
   */
  getToken() {
    return this.tokens[this.currentEnvironment];
  }

  /**
   * Retorna todas as informações do token atual
   * @returns {object} { token, environment, type }
   */
  getTokenInfo() {
    const type = this.currentEnvironment === 'development' ? 'Teste' : 'Produção';
    return {
      token: this.getToken(),
      environment: this.currentEnvironment,
      type: type,
      prefix: this.currentEnvironment === 'development' ? 'test_' : 'live_'
    };
  }

  /**
   * Altera o ambiente (development ou production)
   * @param {string} environment - 'development' ou 'production'
   * @returns {boolean} Sucesso da operação
   */
  setEnvironment(environment) {
    if (!['development', 'production'].includes(environment)) {
      console.error(`[TokenConfig] Ambiente inválido: ${environment}. Use 'development' ou 'production'.`);
      return false;
    }

    const oldEnv = this.currentEnvironment;
    this.currentEnvironment = environment;
    
    // Persiste o ambiente em arquivo
    try {
      const fs = require('fs');
      fs.writeFileSync(this.tokenEnvPath, environment, 'utf8');
    } catch (err) {
      console.error(`[TokenConfig] Erro ao persistir ambiente:`, err.message);
    }
    
    console.log(`[TokenConfig] Ambiente alterado: ${oldEnv} → ${environment}`);
    console.log(`[TokenConfig] Token ativo: ${this.getToken().substring(0, 10)}...`);
    
    return true;
  }

  /**
   * Alterna entre development e production
   * @returns {string} Novo ambiente
   */
  toggleEnvironment() {
    const newEnv = this.currentEnvironment === 'development' ? 'production' : 'development';
    this.setEnvironment(newEnv);
    return newEnv;
  }

  /**
   * Define um token personalizado
   * @param {string} environment - 'development' ou 'production'
   * @param {string} token - Novo token
   */
  setToken(environment, token) {
    if (!['development', 'production'].includes(environment)) {
      console.error(`[TokenConfig] Ambiente inválido: ${environment}`);
      return false;
    }

    this.tokens[environment] = token;
    console.log(`[TokenConfig] Token ${environment} atualizado`);
    return true;
  }

  /**
   * Retorna o status de ambos os ambientes
   * @returns {object}
   */
  getStatus() {
    return {
      currentEnvironment: this.currentEnvironment,
      development: {
        token: this.tokens.development.substring(0, 10) + '...',
        active: this.currentEnvironment === 'development'
      },
      production: {
        token: this.tokens.production.substring(0, 10) + '...',
        active: this.currentEnvironment === 'production'
      }
    };
  }
}

// Exporta singleton
module.exports = new TokenConfig();
