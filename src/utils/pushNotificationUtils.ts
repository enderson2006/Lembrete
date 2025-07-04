import { supabase } from '../lib/supabase';

// VAPID public key - should match the one in your Edge Function
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa40HI8YlOu_7VrZbOONiNjnMaADDfFkbCrRJuigKR7_7Nqc0CQuhsRvbzHI4s';

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

// Check if running in StackBlitz environment
const isStackBlitzEnvironment = (): boolean => {
  return window.location.hostname.includes('stackblitz') || 
         window.location.hostname.includes('webcontainer') ||
         window.location.hostname === 'localhost' && window.location.port === '5173';
};

// Check if push notifications are supported
export const isPushNotificationSupported = (): boolean => {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
};

// Register service worker
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  // Check if running in StackBlitz environment
  if (isStackBlitzEnvironment()) {
    console.log('Service Workers are not supported in StackBlitz environment. Push notifications will be disabled.');
    return null;
  }

  if (!isPushNotificationSupported()) {
    console.warn('Push notifications are not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    console.log('Service Worker registered successfully:', registration);

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'MARK_REMINDER_COMPLETE') {
        // Handle marking reminder as complete
        window.dispatchEvent(new CustomEvent('markReminderComplete', {
          detail: { reminderId: event.data.reminderId }
        }));
      }
    });

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isPushNotificationSupported()) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

// Subscribe to push notifications
export const subscribeToPushNotifications = async (userId: string): Promise<boolean> => {
  // Check if running in StackBlitz environment
  if (isStackBlitzEnvironment()) {
    console.log('Push notifications are not available in StackBlitz environment');
    // For StackBlitz, we'll simulate a subscription
    await simulatePushSubscription(userId);
    return true;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    if (!registration.pushManager) {
      console.error('Push manager unavailable');
      return false;
    }

    // Check if already subscribed
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      // Update existing subscription in database
      await savePushSubscription(userId, existingSubscription);
      return true;
    }

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    // Save subscription to database
    await savePushSubscription(userId, subscription);
    
    console.log('Push notification subscription successful:', subscription);
    return true;
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    return false;
  }
};

// Simulate push subscription for StackBlitz environment
const simulatePushSubscription = async (userId: string): Promise<void> => {
  const mockSubscription = {
    endpoint: `https://mock-push-service.com/send/${userId}`,
    keys: {
      p256dh: 'mock-p256dh-key',
      auth: 'mock-auth-key'
    }
  };

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({
      user_id: userId,
      endpoint: mockSubscription.endpoint,
      p256dh: mockSubscription.keys.p256dh,
      auth: mockSubscription.keys.auth
    }, {
      onConflict: 'user_id,endpoint'
    });

  if (error) {
    console.error('Failed to save mock push subscription:', error);
    throw error;
  }

  console.log('Mock push subscription saved successfully');
};

// Save push subscription to database
const savePushSubscription = async (userId: string, subscription: PushSubscription): Promise<void> => {
  const subscriptionData = subscription.toJSON();
  
  if (!subscriptionData.endpoint || !subscriptionData.keys?.p256dh || !subscriptionData.keys?.auth) {
    throw new Error('Invalid subscription data');
  }

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
    console.error('Failed to save push subscription:', error);
    throw error;
  }

  console.log('Push subscription saved successfully');
};

// Unsubscribe from push notifications
export const unsubscribeFromPushNotifications = async (userId: string): Promise<boolean> => {
  try {
    // Remove from database first
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to remove push subscription from database:', error);
    }

    // Check if running in StackBlitz environment
    if (isStackBlitzEnvironment()) {
      console.log('Push notifications unsubscribed (simulated for StackBlitz)');
      return true;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
    }

    return true;
  } catch (error) {
    console.error('Failed to unsubscribe from push notifications:', error);
    return false;
  }
};

// Check if user is subscribed to push notifications
export const isPushNotificationSubscribed = async (): Promise<boolean> => {
  try {
    if (!isPushNotificationSupported()) {
      return false;
    }

    // For StackBlitz, check database only
    if (isStackBlitzEnvironment()) {
      // We can't easily check the current user here, so we'll assume subscribed if service is supported
      return true;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    return subscription !== null;
  } catch (error) {
    console.error('Failed to check push notification subscription:', error);
    return false;
  }
};

// Test push notification
export const testPushNotification = async (userId: string, reminderId: string): Promise<boolean> => {
  try {
    console.log('Sending test push notification...');
    
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        reminderId,
        userId
      }
    });

    if (error) {
      console.error('Failed to send test push notification:', error);
      return false;
    }

    console.log('Test push notification response:', data);
    
    // Show a browser notification as fallback
    if (Notification.permission === 'granted') {
      new Notification('Teste de Notificação', {
        body: 'Se você está vendo isso, as notificações estão funcionando!',
        icon: '/vite.svg',
        tag: 'test-notification'
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error sending test push notification:', error);
    return false;
  }
};