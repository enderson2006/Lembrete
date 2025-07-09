/**
 * Script para configurar automaticamente as push notifications
 * Execute com: node scripts/setup-push-notifications.js
 */

const fs = require('fs');
const path = require('path');
const { generateVAPIDKeys } = require('./generate-vapid-keys.js');

function createEnvFile(publicKey) {
  const envContent = `# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Push Notifications (VAPID) - Chaves geradas automaticamente
VITE_VAPID_PUBLIC_KEY=${publicKey}
`;

  fs.writeFileSync('.env', envContent);
  console.log('✅ Arquivo .env criado/atualizado');
}

function createConfigurationGuide(keys) {
  const guide = `# 🔔 Suas Chaves VAPID - CONFIGURAÇÃO NECESSÁRIA

## ⚠️ IMPORTANTE: Configure estas variáveis no Supabase Dashboard

### 1. Acesse: https://app.supabase.com/
### 2. Vá para seu projeto > Edge Functions > Settings
### 3. Adicione estas variáveis:

\`\`\`
VAPID_PUBLIC_KEY = ${keys.publicKey}
VAPID_PRIVATE_KEY = ${keys.privateKey}
VAPID_SUBJECT = mailto:seu-email@exemplo.com
\`\`\`

### 4. Substitua "seu-email@exemplo.com" pelo seu email real!

## 🔒 Configure HTTPS:

### Para desenvolvimento:
\`\`\`bash
npm install -g ngrok
npm run dev
# Em outro terminal:
ngrok http 5173
\`\`\`

### Para produção:
- Deploy no Netlify, Vercel ou similar

## 🧪 Teste:
1. Acesse via HTTPS
2. Faça login
3. Clique no sino para ativar
4. Clique no botão de teste
5. Receba a notificação! 🎉

## ✅ Status:
- [x] Chaves geradas
- [x] Frontend configurado
- [x] Service Worker pronto
- [x] Edge Functions preparadas
- [ ] Variáveis no Supabase (VOCÊ PRECISA FAZER)
- [ ] HTTPS configurado (VOCÊ PRECISA FAZER)
`;

  fs.writeFileSync('CONFIGURACAO_PUSH.md', guide);
  console.log('✅ Guia de configuração criado: CONFIGURACAO_PUSH.md');
}

function main() {
  console.log('🚀 Configurando Push Notifications automaticamente...\n');

  try {
    // Gerar chaves VAPID
    console.log('🔑 Gerando chaves VAPID...');
    const keys = generateVAPIDKeys();
    
    // Criar arquivo .env
    console.log('📁 Configurando arquivo .env...');
    createEnvFile(keys.publicKey);
    
    // Criar guia de configuração
    console.log('📋 Criando guia de configuração...');
    createConfigurationGuide(keys);
    
    console.log('\n🎉 CONFIGURAÇÃO AUTOMÁTICA CONCLUÍDA!\n');
    
    console.log('📋 PRÓXIMOS PASSOS (você precisa fazer):');
    console.log('1. Configure as variáveis no Supabase Dashboard');
    console.log('2. Configure HTTPS (ngrok ou deploy)');
    console.log('3. Teste as notificações');
    console.log('\n📖 Leia o arquivo CONFIGURACAO_PUSH.md para instruções detalhadas');
    
    console.log('\n🔧 Suas chaves para o Supabase:');
    console.log('VAPID_PUBLIC_KEY =', keys.publicKey);
    console.log('VAPID_PRIVATE_KEY =', keys.privateKey);
    console.log('VAPID_SUBJECT = mailto:seu-email@exemplo.com');
    
  } catch (error) {
    console.error('❌ Erro na configuração:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };