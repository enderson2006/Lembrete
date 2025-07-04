import { supabase } from '../lib/supabase';

// VAPID public key from environment variables
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa40HI8YlOu_7VrZbOONiNjnMaADDfFkbCrRJuigKR7_7Nqc0CQuhsRvbzHI4s';

export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

// Convert base64 string to Uint8Array
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

// Check if push notifications are supported
export const isPushNotificationSupported = (): boolean => {
  return 'serviceWorker' in navigator && 
         'PushManager' in window && 
         'Notification' in window &&
         window.location.protocol === 'https:';
};

// Register service worker
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!isPushNotificationSupported()) {
    console.warn('❌ Push notifications are not supported in this environment');
    return null;
  }

  try {
    console.log('🔧 Registering service worker...');
    
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    console.log('✅ Service Worker registered successfully:', registration.scope);

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

// Request notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isPushNotificationSupported()) {
    console.warn('❌ Push notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    console.log('✅ Notification permission already granted');
    return true;
  }

  if (Notification.permission === 'denied') {
    console.warn('❌ Notification permission denied');
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

// Subscribe to push notifications
export const subscribeToPushNotifications = async (userId: string): Promise<boolean> => {
  if (!isPushNotificationSupported()) {
    console.warn('❌ Push notifications not supported');
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

    // Subscribe to push notifications
    console.log('🆕 Creating new push subscription...');
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    // Save subscription to database
    await savePushSubscription(userId, subscription);
    
    console.log('✅ Push notification subscription successful');
    return true;
  } catch (error) {
    console.error('❌ Failed to subscribe to push notifications:', error);
    
    // Show user-friendly error message
    if (error.name === 'NotSupportedError') {
      alert('Push notifications are not supported on this device/browser.');
    } else if (error.name === 'NotAllowedError') {
      alert('Push notifications were blocked. Please enable them in your browser settings.');
    } else {
      alert('Failed to enable push notifications. Please try again.');
    }
    
    return false;
  }
};

// Save push subscription to database
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
    throw error;
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

// Test push notification
export const testPushNotification = async (userId: string, reminderId: string): Promise<boolean> => {
  try {
    console.log('🧪 Sending test push notification...');
    
    const { data, error } = await supabase.functions.invoke('send-push-notification-production', {
      body: {
        reminderId,
        userId
      }
    });

    if (error) {
      console.error('❌ Failed to send test push notification:', error);
      return false;
    }

    console.log('✅ Test push notification response:', data);
    
    // Show a browser notification as fallback/confirmation
    if (Notification.permission === 'granted') {
      new Notification('🧪 Teste de Notificação', {
        body: 'Se você está vendo isso, as notificações estão funcionando!',
        icon: '/vite.svg',
        tag: 'test-notification',
        requireInteraction: false
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error sending test push notification:', error);
    return false;
  }
};

// Get push subscription info for debugging
export const getPushSubscriptionInfo = async (): Promise<any> => {
  try {
    if (!isPushNotificationSupported()) {
      return { supported: false };
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    return {
      supported: true,
      permission: Notification.permission,
      subscribed: subscription !== null,
      endpoint: subscription?.endpoint,
      vapidPublicKey: VAPID_PUBLIC_KEY
    };
  } catch (error) {
    console.error('❌ Error getting push subscription info:', error);
    return { supported: false, error: error.message };
  }
};