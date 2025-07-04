# 🔔 Configuração de Notificações Push para Produção

## 📋 Pré-requisitos

1. **Conta no Firebase** (para FCM - Firebase Cloud Messaging)
2. **Chaves VAPID** (geradas pelo Firebase ou manualmente)
3. **Certificado SSL** (HTTPS obrigatório para push notifications)
4. **Domínio próprio** (não funciona em localhost para produção)

## 🔧 Passo 1: Configurar Firebase Cloud Messaging (FCM)

### 1.1 Criar Projeto no Firebase
```bash
# 1. Acesse https://console.firebase.google.com/
# 2. Clique em "Adicionar projeto"
# 3. Digite o nome do projeto
# 4. Desabilite Google Analytics (opcional)
# 5. Clique em "Criar projeto"
```

### 1.2 Configurar Cloud Messaging
```bash
# 1. No console do Firebase, vá em "Project Settings" (ícone de engrenagem)
# 2. Clique na aba "Cloud Messaging"
# 3. Em "Web configuration", clique em "Generate key pair"
# 4. Copie a "Key pair" gerada (esta é sua VAPID Public Key)
```

### 1.3 Obter Server Key
```bash
# 1. Na mesma página "Cloud Messaging"
# 2. Copie o "Server key" (esta é sua VAPID Private Key)
```

## 🔧 Passo 2: Configurar Variáveis de Ambiente

### 2.1 Adicionar no Supabase Dashboard
```bash
# 1. Acesse seu projeto no Supabase Dashboard
# 2. Vá em Settings > Edge Functions
# 3. Adicione as seguintes variáveis:

VAPID_PUBLIC_KEY=sua_vapid_public_key_aqui
VAPID_PRIVATE_KEY=sua_vapid_private_key_aqui
FCM_SERVER_KEY=sua_fcm_server_key_aqui
```

### 2.2 Atualizar arquivo .env local
```env
# Adicione ao seu arquivo .env
VITE_VAPID_PUBLIC_KEY=sua_vapid_public_key_aqui
```

## 🔧 Passo 3: Instalar Dependências

### 3.1 Para o Frontend
```bash
npm install web-push
```

### 3.2 Para Edge Functions (já incluído)
```typescript
// As Edge Functions já usam web-push via npm: no Deno
import webpush from 'npm:web-push@3.6.7';
```

## 🔧 Passo 4: Implementar Autenticação VAPID

### 4.1 Atualizar Edge Function
```typescript
// supabase/functions/send-push-notification/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Configure VAPID
const vapidKeys = {
  publicKey: Deno.env.get('VAPID_PUBLIC_KEY') || '',
  privateKey: Deno.env.get('VAPID_PRIVATE_KEY') || '',
  subject: 'mailto:seu-email@exemplo.com' // Substitua pelo seu email
};

webpush.setVapidDetails(
  vapidKeys.subject,
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { reminderId, userId } = await req.json();

    // Get reminder and subscriptions
    const [reminderResult, subscriptionsResult] = await Promise.all([
      supabaseClient.from('reminders').select('*').eq('id', reminderId).single(),
      supabaseClient.from('push_subscriptions').select('*').eq('user_id', userId)
    ]);

    const reminder = reminderResult.data;
    const subscriptions = subscriptionsResult.data;

    if (!reminder || !subscriptions?.length) {
      throw new Error('Reminder or subscriptions not found');
    }

    // Prepare notification payload
    const payload = JSON.stringify({
      title: `Lembrete: ${reminder.title}`,
      body: reminder.description || 'Você tem um lembrete!',
      icon: '/vite.svg',
      badge: '/vite.svg',
      tag: `reminder-${reminder.id}`,
      data: {
        reminderId: reminder.id,
        url: '/'
      },
      actions: [
        {
          action: 'mark-complete',
          title: 'Marcar como concluído'
        },
        {
          action: 'view',
          title: 'Ver detalhes'
        }
      ]
    });

    // Send push notifications
    const results = await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth
          }
        };

        return await webpush.sendNotification(pushSubscription, payload);
      })
    );

    const successCount = results.filter(r => r.status === 'fulfilled').length;

    // Update database
    await Promise.all([
      supabaseClient
        .from('notification_queue')
        .update({
          status: successCount > 0 ? 'sent' : 'failed',
          processed_at: new Date().toISOString()
        })
        .eq('reminder_id', reminderId)
        .eq('user_id', userId),
      
      successCount > 0 ? supabaseClient
        .from('reminders')
        .update({ notified: true })
        .eq('id', reminderId) : Promise.resolve()
    ]);

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        message: `Sent ${successCount} of ${subscriptions.length} notifications`,
        results: results.map(r => ({
          success: r.status === 'fulfilled',
          error: r.status === 'rejected' ? r.reason.message : null
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Push notification error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### 4.2 Atualizar Frontend
```typescript
// src/utils/pushNotificationUtils.ts
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa40HI8YlOu_7VrZbOONiNjnMaADDfFkbCrRJuigKR7_7Nqc0CQuhsRvbzHI4s';

export const subscribeToPushNotifications = async (userId: string): Promise<boolean> => {
  try {
    const registration = await navigator.serviceWorker.ready;
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    await savePushSubscription(userId, subscription);
    return true;
  } catch (error) {
    console.error('Failed to subscribe:', error);
    return false;
  }
};
```

## 🔧 Passo 5: Configurar Service Worker

### 5.1 Atualizar Service Worker
```javascript
// public/sw.js
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    
    const options = {
      body: data.body,
      icon: data.icon || '/vite.svg',
      badge: data.badge || '/vite.svg',
      tag: data.tag,
      data: data.data,
      actions: data.actions || [],
      requireInteraction: true,
      vibrate: [200, 100, 200]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (error) {
    console.error('Error processing push:', error);
  }
});
```

## 🔧 Passo 6: Configurar HTTPS

### 6.1 Para Desenvolvimento Local
```bash
# Use ngrok para HTTPS local
npm install -g ngrok

# Em um terminal, rode seu app
npm run dev

# Em outro terminal, exponha via HTTPS
ngrok http 5173
```

### 6.2 Para Produção
```bash
# Deploy no Netlify, Vercel, ou similar que fornece HTTPS automático
# Ou configure certificado SSL no seu servidor
```

## 🔧 Passo 7: Testar em Produção

### 7.1 Verificar Configuração
```javascript
// Console do navegador
console.log('VAPID Public Key:', import.meta.env.VITE_VAPID_PUBLIC_KEY);
console.log('Service Worker registered:', 'serviceWorker' in navigator);
console.log('Push supported:', 'PushManager' in window);
```

### 7.2 Testar Notificação
```javascript
// Use o botão de teste no app ou console
await testPushNotification(userId, 'test-reminder-123');
```

## 🚨 Considerações de Segurança

### 1. Proteger Chaves VAPID
- ✅ Nunca exponha a chave privada no frontend
- ✅ Use variáveis de ambiente no servidor
- ✅ Rotacione as chaves periodicamente

### 2. Validar Subscriptions
- ✅ Remova subscriptions inválidas (410/404)
- ✅ Limite número de subscriptions por usuário
- ✅ Valide origem das requisições

### 3. Rate Limiting
- ✅ Implemente rate limiting nas Edge Functions
- ✅ Limite frequência de notificações por usuário
- ✅ Use queue para processar notificações em lote

## 📱 Suporte a Dispositivos

### Navegadores Suportados
- ✅ Chrome 50+
- ✅ Firefox 44+
- ✅ Safari 16+ (macOS 13+, iOS 16.4+)
- ✅ Edge 17+

### Limitações
- ❌ iOS Safari < 16.4
- ❌ Navegadores sem HTTPS
- ❌ Modo privado/incógnito (alguns navegadores)

## 🔍 Debugging

### Logs Úteis
```javascript
// Verificar subscription
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Current subscription:', sub);
  });
});

// Verificar permissões
console.log('Notification permission:', Notification.permission);
```

### Ferramentas
- Chrome DevTools > Application > Service Workers
- Chrome DevTools > Application > Storage > Push Messaging
- Firebase Console > Cloud Messaging > Send test message

## 📚 Recursos Adicionais

- [Web Push Protocol](https://tools.ietf.org/html/rfc8030)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [VAPID Specification](https://tools.ietf.org/html/rfc8292)