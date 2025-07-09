/**
 * Script para configurar HTTPS localmente
 * Alternativas ao ngrok para desenvolvimento
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

function generateSelfSignedCert() {
  console.log('🔒 Para HTTPS local, você tem algumas opções:\n');
  
  console.log('📋 OPÇÃO 1 - Cloudflare Tunnel (Recomendado):');
  console.log('1. Acesse: https://dash.cloudflare.com/');
  console.log('2. Vá em "Zero Trust" > "Access" > "Tunnels"');
  console.log('3. Crie um novo tunnel');
  console.log('4. Configure para apontar para localhost:5173');
  console.log('5. Você receberá uma URL HTTPS gratuita!\n');
  
  console.log('📋 OPÇÃO 2 - Serveo (Simples):');
  console.log('1. No terminal, rode: ssh -R 80:localhost:5173 serveo.net');
  console.log('2. Você receberá uma URL HTTPS automaticamente\n');
  
  console.log('📋 OPÇÃO 3 - LocalTunnel:');
  console.log('1. npm install -g localtunnel');
  console.log('2. lt --port 5173');
  console.log('3. Você receberá uma URL HTTPS\n');
  
  console.log('📋 OPÇÃO 4 - Deploy Direto (Mais Fácil):');
  console.log('1. Faça push do código para GitHub');
  console.log('2. Deploy no Netlify/Vercel (HTTPS automático)');
  console.log('3. Configure as variáveis lá mesmo\n');
  
  console.log('⚡ OPÇÃO RÁPIDA - Teste Local:');
  console.log('Para testar rapidamente, você pode usar o certificado auto-assinado:');
  console.log('1. Aceite o aviso de segurança no navegador');
  console.log('2. As notificações funcionarão para teste\n');
}

function createHTTPSServer() {
  const httpsConfig = `
// vite.config.ts - Configuração HTTPS local
import { defineConfig } from 'vite';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export default defineConfig({
  server: {
    https: {
      key: readFileSync(resolve(__dirname, 'localhost-key.pem')),
      cert: readFileSync(resolve(__dirname, 'localhost.pem')),
    },
    host: '0.0.0.0',
    port: 5173
  },
  // ... resto da configuração
});
`;

  console.log('🔧 Para configurar HTTPS local com certificado:');
  console.log('1. Instale mkcert: https://github.com/FiloSottile/mkcert');
  console.log('2. Execute: mkcert -install');
  console.log('3. Execute: mkcert localhost 127.0.0.1 ::1');
  console.log('4. Configure o vite.config.ts com o código acima\n');
}

function showDeploymentOptions() {
  console.log('🚀 OPÇÕES DE DEPLOY COM HTTPS AUTOMÁTICO:\n');
  
  console.log('1️⃣ NETLIFY (Recomendado):');
  console.log('   - Conecte seu repositório GitHub');
  console.log('   - Build command: npm run build');
  console.log('   - Publish directory: dist');
  console.log('   - HTTPS automático + domínio gratuito\n');
  
  console.log('2️⃣ VERCEL:');
  console.log('   - Conecte seu repositório GitHub');
  console.log('   - Deploy automático');
  console.log('   - HTTPS automático + domínio gratuito\n');
  
  console.log('3️⃣ GITHUB PAGES:');
  console.log('   - Configure GitHub Actions');
  console.log('   - HTTPS automático');
  console.log('   - Domínio: username.github.io/repo\n');
  
  console.log('4️⃣ RAILWAY:');
  console.log('   - Deploy direto do GitHub');
  console.log('   - HTTPS automático');
  console.log('   - Domínio personalizado gratuito\n');
}

function createDeployScript() {
  const deployScript = `#!/bin/bash
# Script de deploy automático

echo "🚀 Preparando deploy..."

# Build da aplicação
npm run build

echo "✅ Build concluído!"
echo "📁 Arquivos prontos na pasta 'dist'"
echo ""
echo "🌐 Opções de deploy:"
echo "1. Arraste a pasta 'dist' para Netlify Drop"
echo "2. Use 'vercel --prod' se tiver Vercel CLI"
echo "3. Faça push para GitHub e configure GitHub Pages"
echo ""
echo "⚠️  Não esqueça de configurar as variáveis de ambiente:"
echo "   VITE_SUPABASE_URL"
echo "   VITE_SUPABASE_ANON_KEY" 
echo "   VITE_VAPID_PUBLIC_KEY"
`;

  fs.writeFileSync('deploy.sh', deployScript);
  fs.chmodSync('deploy.sh', '755');
  console.log('✅ Script de deploy criado: deploy.sh');
}

function main() {
  console.log('🔒 CONFIGURAÇÃO HTTPS - Alternativas ao ngrok\n');
  
  generateSelfSignedCert();
  createHTTPSServer();
  showDeploymentOptions();
  createDeployScript();
  
  console.log('💡 RECOMENDAÇÃO:');
  console.log('Para testar rapidamente, use Cloudflare Tunnel ou deploy direto no Netlify!');
  console.log('Ambos fornecem HTTPS automático e são gratuitos.\n');
  
  console.log('🎯 PRÓXIMO PASSO:');
  console.log('1. Escolha uma das opções acima');
  console.log('2. Configure as variáveis do Supabase');
  console.log('3. Teste as notificações push!');
}

if (require.main === module) {
  main();
}

module.exports = { main };