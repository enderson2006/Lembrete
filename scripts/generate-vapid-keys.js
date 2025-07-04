/**
 * Script para gerar chaves VAPID para notificações push
 * Execute com: node scripts/generate-vapid-keys.js
 */

const crypto = require('crypto');

function generateVAPIDKeys() {
  // Gerar par de chaves ECDSA P-256
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: {
      type: 'spki',
      format: 'der'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'der'
    }
  });

  // Converter para base64url
  const publicKeyBase64 = publicKey.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const privateKeyBase64 = privateKey.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return {
    publicKey: publicKeyBase64,
    privateKey: privateKeyBase64
  };
}

function main() {
  console.log('🔑 Gerando chaves VAPID para notificações push...\n');
  
  const keys = generateVAPIDKeys();
  
  console.log('✅ Chaves VAPID geradas com sucesso!\n');
  console.log('📋 Adicione estas variáveis ao seu ambiente:\n');
  
  console.log('🌐 Frontend (.env):');
  console.log(`VITE_VAPID_PUBLIC_KEY=${keys.publicKey}\n`);
  
  console.log('🔧 Backend (Supabase Edge Functions):');
  console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}\n`);
  
  console.log('⚠️  IMPORTANTE:');
  console.log('- Mantenha a chave privada segura e nunca a exponha no frontend');
  console.log('- Use HTTPS em produção (obrigatório para push notifications)');
  console.log('- Teste em um domínio real, não localhost');
  console.log('- Configure o subject (email) nas Edge Functions\n');
  
  console.log('📚 Próximos passos:');
  console.log('1. Adicione as variáveis de ambiente');
  console.log('2. Atualize as Edge Functions com web-push');
  console.log('3. Configure HTTPS');
  console.log('4. Teste as notificações');
}

if (require.main === module) {
  main();
}

module.exports = { generateVAPIDKeys };