/**
 * Script para deploy rápido com HTTPS
 */

const fs = require('fs');
const path = require('path');

function createNetlifyConfig() {
  const netlifyConfig = `# Netlify configuration
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[context.production.environment]
  NODE_ENV = "production"

# Headers for security
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
`;

  fs.writeFileSync('netlify.toml', netlifyConfig);
  console.log('✅ Configuração Netlify criada: netlify.toml');
}

function createVercelConfig() {
  const vercelConfig = `{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "handle": "filesystem"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}`;

  fs.writeFileSync('vercel.json', vercelConfig);
  console.log('✅ Configuração Vercel criada: vercel.json');
}

function createGitHubActions() {
  const workflowDir = '.github/workflows';
  if (!fs.existsSync(workflowDir)) {
    fs.mkdirSync(workflowDir, { recursive: true });
  }

  const githubAction = `name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
      uses: actions/checkout@v3
      
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build
      run: npm run build
      env:
        VITE_SUPABASE_URL: \${{ secrets.VITE_SUPABASE_URL }}
        VITE_SUPABASE_ANON_KEY: \${{ secrets.VITE_SUPABASE_ANON_KEY }}
        VITE_VAPID_PUBLIC_KEY: \${{ secrets.VITE_VAPID_PUBLIC_KEY }}
        
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      if: github.ref == 'refs/heads/main'
      with:
        github_token: \${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
`;

  fs.writeFileSync(path.join(workflowDir, 'deploy.yml'), githubAction);
  console.log('✅ GitHub Actions configurado: .github/workflows/deploy.yml');
}

function createDeployInstructions() {
  const instructions = `# 🚀 DEPLOY RÁPIDO - Instruções

## ✅ Arquivos de configuração criados:
- netlify.toml (para Netlify)
- vercel.json (para Vercel)  
- .github/workflows/deploy.yml (para GitHub Pages)

## 🎯 OPÇÃO 1: Netlify (Mais Fácil)

### Deploy Manual (2 minutos):
1. Execute: \`npm run build\`
2. Vá para: https://app.netlify.com/
3. Arraste a pasta \`dist\` para o Netlify Drop
4. Configure as variáveis de ambiente:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
   - VITE_VAPID_PUBLIC_KEY
5. Pronto! HTTPS automático 🎉

### Deploy Automático:
1. Conecte seu repositório GitHub no Netlify
2. Configure as variáveis de ambiente
3. Deploy automático a cada push!

## 🎯 OPÇÃO 2: Vercel

1. Vá para: https://vercel.com/
2. Conecte seu repositório GitHub
3. Configure as variáveis de ambiente
4. Deploy automático!

## 🎯 OPÇÃO 3: GitHub Pages

1. Vá para Settings > Pages no seu repositório
2. Configure source como "GitHub Actions"
3. Adicione as secrets no repositório:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
   - VITE_VAPID_PUBLIC_KEY
4. Faça push - deploy automático!

## 🎯 OPÇÃO 4: Cloudflare Tunnel (Desenvolvimento)

1. Acesse: https://dash.cloudflare.com/
2. Zero Trust > Access > Tunnels
3. Create Tunnel
4. Configure para localhost:5173
5. HTTPS instantâneo!

## ⚠️ IMPORTANTE: Variáveis de Ambiente

### Frontend (.env):
\`\`\`
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
VITE_VAPID_PUBLIC_KEY=BKjzQZ8rFvXhVGF2nE4L8wJxK9mP3qR7sT1uV5wX6yZ2aB3cD4eF5gH6iJ7kL8mN9oP0qR1sT2uV3wX4yZ5aB6c
\`\`\`

### Supabase Dashboard:
\`\`\`
VAPID_PUBLIC_KEY = BKjzQZ8rFvXhVGF2nE4L8wJxK9mP3qR7sT1uV5wX6yZ2aB3cD4eF5gH6iJ7kL8mN9oP0qR1sT2uV3wX4yZ5aB6c
VAPID_PRIVATE_KEY = aUiz-bdHb-J-3NcT4Cjdq6WgXMaM0kKi4t8kDXa3Oe8-fG9hI0jK1lM2nO3pQ4rS5tU6vW7xY8zA9bC0dE1f
VAPID_SUBJECT = mailto:seu-email@gmail.com
\`\`\`

## 🧪 Teste Após Deploy:

1. Acesse sua URL HTTPS
2. Faça login
3. Clique no sino 🔔 para ativar notificações
4. Clique no botão de teste 📤
5. Receba a notificação push! 🎉

## 💡 Dica:
Use Netlify para começar - é o mais simples e rápido!
`;

  fs.writeFileSync('DEPLOY_INSTRUCTIONS.md', instructions);
  console.log('✅ Instruções de deploy criadas: DEPLOY_INSTRUCTIONS.md');
}

function main() {
  console.log('🚀 Configurando deploy rápido com HTTPS...\n');
  
  createNetlifyConfig();
  createVercelConfig();
  createGitHubActions();
  createDeployInstructions();
  
  console.log('\n🎉 CONFIGURAÇÃO DE DEPLOY CONCLUÍDA!\n');
  
  console.log('📋 PRÓXIMOS PASSOS:');
  console.log('1. Escolha uma plataforma (Netlify recomendado)');
  console.log('2. Configure as variáveis de ambiente');
  console.log('3. Faça deploy');
  console.log('4. Teste as notificações push!\n');
  
  console.log('📖 Leia DEPLOY_INSTRUCTIONS.md para instruções detalhadas');
  
  console.log('\n⚡ OPÇÃO MAIS RÁPIDA:');
  console.log('1. npm run build');
  console.log('2. Arraste pasta "dist" para https://app.netlify.com/');
  console.log('3. Configure variáveis');
  console.log('4. Pronto! 🚀');
}

if (require.main === module) {
  main();
}

module.exports = { main };