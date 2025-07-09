import { supabase } from '../lib/supabase';

// VAPID public key - matches the one in Edge Function
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa40HI8YlOu_7VrZbOONiNjnMaADDfFkbCrRJuigKR7_7Nqc0CQuhsRvbzHI4s';

export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

// Convert base64 string to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Check if running in development environment
const isDevelopmentEnvironment = (): boolean => {
  return window.location.hostname === 'localhost' || 
         window.location.hostname.includes('stackblitz') || 
         window.location.hostname.includes('webcontainer') ||
         window.location.protocol !== 'https:';
};

// Check if push notifications are supported
export const isPushNotificationSupported = (): boolean => {
  const isSupported = 'serviceWorker' in navigator && 
                     'PushManager' in window && 
                     'Notification' in window;
  
  if (!isSupported) {
    console.warn('❌ Push notifications not supported in this browser');
    return false;
  }

  // Check for HTTPS requirement (except localhost)
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
    console.warn('❌ Push notifications require HTTPS');
    return false;
  }

  return true;
};

// Register service worker with error handling
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!isPushNotificationSupported()) {
    console.warn('❌ Push notifications are not supported');
    return null;
  }

  try {
    console.log('🔧 Registering service worker...');
    
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none'
    });

    console.log('✅ Service Worker registered successfully:', registration.scope);

    // Listen for service worker updates
    registration.addEventListener('updatefound', () => {
      console.log('🔄 Service Worker update found');
    });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('📨 Message from service worker:', event.data);
      
      if (event.data.type === 'MARK_REMINDER_COMPLETE') {
        // Handle marking reminder as complete
        window.dispatchEvent(new CustomEvent('markReminderComplete', {
          detail: { reminderId: event.data.reminderId }
        }));
      }
    });

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;
    console.log('🚀 Service Worker is ready');

    return registration;
  } catch (error) {
    console.error('❌ Service Worker registration failed:', error);
    return null;
  }
};

// Request notification permission with user-friendly messaging
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isPushNotificationSupported()) {
    return false;
  }

  if (Notification.permission === 'granted') {
    console.log('✅ Notification permission already granted');
    return true;
  }

  if (Notification.permission === 'denied') {
    console.warn('❌ Notification permission denied');
    alert('As notificações foram bloqueadas. Para ativá-las, vá nas configurações do seu navegador e permita notificações para este site.');
    return false;
  }

  try {
    console.log('🔔 Requesting notification permission...');
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('✅ Notification permission granted');
      return true;
    } else {
      console.warn('❌ Notification permission denied by user');
      return false;
    }
  } catch (error) {
    console.error('❌ Error requesting notification permission:', error);
    return false;
  }
};

// Subscribe to push notifications with proper error handling
export const subscribeToPushNotifications = async (userId: string): Promise<boolean> => {
  if (!isPushNotificationSupported()) {
    console.warn('❌ Push notifications not supported');
    return false;
  }

  // Check notification permission first
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    return false;
  }

  try {
    console.log('📱 Subscribing to push notifications...');
    
    const registration = await navigator.serviceWorker.ready;
    
    if (!registration.pushManager) {
      console.error('❌ Push manager unavailable');
      return false;
    }

    // Check if already subscribed
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      console.log('🔄 Updating existing push subscription...');
      await savePushSubscription(userId, existingSubscription);
      return true;
    }

    // Subscribe to push notifications with VAPID key
    console.log('🆕 Creating new push subscription...');
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    // Save subscription to database
    await savePushSubscription(userId, subscription);
    
    console.log('✅ Push notification subscription successful');
    
    // Show success notification
    if (Notification.permission === 'granted') {
      new Notification('🔔 Notificações Ativadas!', {
        body: 'Você receberá notificações push para seus lembretes.',
        icon: '/vite.svg',
        tag: 'subscription-success'
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to subscribe to push notifications:', error);
    
    // Show user-friendly error messages
    if (error.name === 'NotSupportedError') {
      alert('Push notifications não são suportadas neste dispositivo/navegador.');
    } else if (error.name === 'NotAllowedError') {
      alert('Push notifications foram bloqueadas. Por favor, ative-as nas configurações do navegador.');
    } else if (error.name === 'AbortError') {
      alert('A inscrição foi cancelada. Tente novamente.');
    } else {
      alert('Falha ao ativar push notifications. Verifique sua conexão e tente novamente.');
    }
    
    return false;
  }
};

// Save push subscription to database with conflict handling
const savePushSubscription = async (userId: string, subscription: PushSubscription): Promise<void> => {
  const subscriptionData = subscription.toJSON();
  
  if (!subscriptionData.endpoint || !subscriptionData.keys?.p256dh || !subscriptionData.keys?.auth) {
    throw new Error('Invalid subscription data');
  }

  console.log('💾 Saving push subscription to database...');

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({
      user_id: userId,
      endpoint: subscriptionData.endpoint,
      p256dh: subscriptionData.keys.p256dh,
      auth: subscriptionData.keys.auth
    }, {
      onConflict: 'user_id,endpoint'
    });

  if (error) {
    console.error('❌ Failed to save push subscription:', error);
    throw new Error(`Failed to save subscription: ${error.message}`);
  }

  console.log('✅ Push subscription saved successfully');
};

// Unsubscribe from push notifications
export const unsubscribeFromPushNotifications = async (userId: string): Promise<boolean> => {
  try {
    console.log('🔕 Unsubscribing from push notifications...');
    
    // Remove from database first
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Failed to remove push subscription from database:', error);
    } else {
      console.log('✅ Push subscription removed from database');
    }

    if (!isPushNotificationSupported()) {
      return true;
    }

    // Unsubscribe from browser
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      console.log('✅ Browser push subscription removed');
    }

    return true;
  } catch (error) {
    console.error('❌ Failed to unsubscribe from push notifications:', error);
    return false;
  }
};

// Check if user is subscribed to push notifications
export const isPushNotificationSubscribed = async (): Promise<boolean> => {
  try {
    if (!isPushNotificationSupported()) {
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    const isSubscribed = subscription !== null;
    console.log('🔍 Push notification subscription status:', isSubscribed);
    
    return isSubscribed;
  } catch (error) {
    console.error('❌ Failed to check push notification subscription:', error);
    return false;
  }
};

// Test push notification with enhanced feedback
export const testPushNotification = async (userId: string, reminderId: string): Promise<boolean> => {
  try {
    console.log('🧪 Sending test push notification...');
    
    // Show loading state
    const loadingNotification = new Notification('🔄 Enviando Teste...', {
      body: 'Aguarde enquanto testamos as notificações push.',
      icon: '/vite.svg',
      tag: 'test-loading'
    });

    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        reminderId: `test-reminder-${Date.now()}`,
        userId
      }
    });

    // Close loading notification
    loadingNotification.close();

    if (error) {
      console.error('❌ Failed to send test push notification:', error);
      
      // Show error notification
      new Notification('❌ Teste Falhou', {
        body: 'Não foi possível enviar a notificação de teste. Verifique sua conexão.',
        icon: '/vite.svg',
        tag: 'test-error'
      });
      
      return false;
    }

    console.log('✅ Test push notification response:', data);
    
    // Show success notification if push notification didn't arrive
    setTimeout(() => {
      new Notification('✅ Teste Concluído', {
        body: 'Se você recebeu uma notificação push, o sistema está funcionando!',
        icon: '/vite.svg',
        tag: 'test-success'
      });
    }, 2000);
    
    return true;
  } catch (error) {
    console.error('❌ Error sending test push notification:', error);
    
    // Show error notification
    new Notification('❌ Erro no Teste', {
      body: 'Ocorreu um erro ao testar as notificações. Tente novamente.',
      icon: '/vite.svg',
      tag: 'test-error'
    });
    
    return false;
  }
};

// Get push subscription info for debugging
export const getPushSubscriptionInfo = async (): Promise<any> => {
  try {
    if (!isPushNotificationSupported()) {
      return { 
        supported: false, 
        reason: 'Browser does not support push notifications' 
      };
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    return {
      supported: true,
      permission: Notification.permission,
      subscribed: subscription !== null,
      endpoint: subscription?.endpoint,
      vapidPublicKey: VAPID_PUBLIC_KEY,
      serviceWorkerState: registration.active?.state,
      isDevelopment: isDevelopmentEnvironment(),
      protocol: window.location.protocol,
      hostname: window.location.hostname
    };
  } catch (error) {
    console.error('❌ Error getting push subscription info:', error);
    return { 
      supported: false, 
      error: error.message 
    };
  }
};