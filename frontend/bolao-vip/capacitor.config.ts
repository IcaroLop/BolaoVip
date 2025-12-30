import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.bolaovip',
  appName: 'Bolao VIP',
  webDir: 'build',
  server: {
    // Permite requisições HTTP em rede local (necessário para desenvolvimento)
    cleartext: true,
    // Permite conexões com IPs locais
    allowNavigation: [
      'http://192.168.56.127:3001',
      'http://localhost:3001',
      'http://192.168.*',
      'http://10.0.*'
    ]
  },
  android: {
    // Permite cleartext traffic no Android
    allowMixedContent: true
  }
};

export default config;
