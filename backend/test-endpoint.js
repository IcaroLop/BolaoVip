// Quick test to verify jogosAoVivoScraper works
const axios = require('axios');

async function test() {
  try {
    console.log('[TEST] Testing endpoint on localhost:3002...');
    
    // Test 1: Simple debug route
    try {
      const r1 = await axios.get('http://localhost:3002/debug/test', { timeout: 5000 });
      console.log('[TEST] /debug/test returned:', r1.status);
    } catch (e) {
      console.log('[TEST] /debug/test failed:', e.message);
    }
    
    // Test 2: Main endpoint
    try {
      const r2 = await axios.get('http://localhost:3002/jogos-ao-vivo', { timeout: 5000 });
      console.log('[TEST] /jogos-ao-vivo returned:', r2.status, 'with', r2.data.length, 'items');
    } catch (e) {
      console.log('[TEST] /jogos-ao-vivo failed:', e.message);
    }
    
    // Test 3: Debug test route
    try {
      const r3 = await axios.get('http://localhost:3002/debug/jogos-ao-vivo-test', { timeout: 5000 });
      console.log('[TEST] /debug/jogos-ao-vivo-test returned:', r3.status, 'with', r3.data.length, 'items');
    } catch (e) {
      console.log('[TEST] /debug/jogos-ao-vivo-test failed:', e.message);
    }
  } catch (e) {
    console.error('[TEST] Unexpected error:', e.message);
  }
}

test();
