/**
 * Script para gerar chaves VAPID para notificações push
 * Execute com: node scripts/generate-vapid-keys.js
 */

const crypto = require('crypto');

function generateVAPIDKeys() {
  try {
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
  } catch (error) {
    console.error('❌ Erro ao gerar chaves VAPID:', error);
    throw error;
  }
}

function validateKeys(keys) {
  if (!keys.publicKey || !keys.privateKey) {
    throw new Error('Chaves VAPID inválidas');
  }
  
  if (keys.publicKey.length < 80 || keys.privateKey.length < 40) {
    throw new Error('Chaves VAPID muito curtas');
  }
  
  return true;
}

function main() {
  console.log('🔑 Gerando chaves VAPID para notificações push...\n');
  
  try {
    const keys = generateVAPIDKeys();
    validateKeys(keys);
    
    console.log('✅ Chaves VAPID geradas com sucesso!\n');
    console.log('📋 Adicione estas variáveis ao seu ambiente:\n');
    
    console.log('🌐 Frontend (.env):');
    console.log(`VITE_VAPID_PUBLIC_KEY=${keys.publicKey}\n`);
    
    console.log('🔧 Backend (Supabase Edge Functions):');
    console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
    console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
    console.log(`VAPID_SUBJECT=mailto:seu-email@exemplo.com\n`);
    
    console.log('⚠️  IMPORTANTE:');
    console.log('- Mantenha a chave privada segura e nunca a exponha no frontend');
    console.log('- Use HTTPS em produção (obrigatório para push notifications)');
    console.log('- Substitua o email no VAPID_SUBJECT pelo seu email real');
    console.log('- Configure as variáveis no Supabase Dashboard > Edge Functions');
    console.log('- Teste em um domínio real com HTTPS\n');
    
    console.log('📚 Próximos passos:');
    console.log('1. Adicione VITE_VAPID_PUBLIC_KEY ao arquivo .env');
    console.log('2. Configure VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY e VAPID_SUBJECT no Supabase');
    console.log('3. Configure HTTPS para seu domínio');
    console.log('4. Teste as notificações push');
    console.log('5. Configure um cron job para verificar lembretes vencidos\n');
    
    console.log('🔗 Links úteis:');
    console.log('- Supabase Dashboard: https://app.supabase.com/');
    console.log('- Documentação Web Push: https://web.dev/push-notifications/');
    console.log('- Teste de notificações: https://tests.peter.sh/notification-generator/');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

// Função para testar as chaves geradas
function testKeys(keys) {
  try {
    // Teste básico de validação
    const publicKeyBuffer = Buffer.from(keys.publicKey, 'base64');
    const privateKeyBuffer = Buffer.from(keys.privateKey, 'base64');
    
    if (publicKeyBuffer.length < 60 || privateKeyBuffer.length < 30) {
      throw new Error('Chaves muito curtas');
    }
    
    console.log('✅ Chaves validadas com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro na validação das chaves:', error);
    return false;
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { 
  generateVAPIDKeys, 
  validateKeys, 
  testKeys 
};