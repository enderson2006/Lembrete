// Service Worker for handling push notifications
const CACHE_NAME = 'lembrete-pro-v2';
const urlsToCache = [
  '/',
  '/vite.svg',
  '/manifest.json'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ Service Worker installed successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service Worker install failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker activated successfully');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch(() => {
        // Fallback for offline
        if (event.request.destination === 'document') {
          return caches.match('/');
        }
      })
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('📨 Push event received:', event);
  
  if (!event.data) {
    console.log('⚠️ Push event has no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('📋 Push data:', data);

    // Validate required fields
    if (!data.title) {
      console.error('❌ Push notification missing title');
      return;
    }

    const options = {
      body: data.body || 'Você tem um lembrete!',
      icon: data.icon || '/vite.svg',
      badge: data.badge || '/vite.svg',
      tag: data.tag || 'reminder',
      requireInteraction: data.requireInteraction !== false,
      silent: false,
      vibrate: data.vibrate || [200, 100, 200],
      actions: data.actions || [
        {
          action: 'mark-complete',
          title: 'Marcar como concluído',
          icon: '/vite.svg'
        },
        {
          action: 'view',
          title: 'Ver detalhes',
          icon: '/vite.svg'
        }
      ],
      data: {
        reminderId: data.data?.reminderId,
        url: data.data?.url || '/',
        timestamp: data.data?.timestamp || new Date().toISOString(),
        ...data.data
      },
      // Additional options for better UX
      renotify: true,
      timestamp: Date.now()
    };

    console.log('🔔 Showing notification with options:', options);

    event.waitUntil(
      self.registration.showNotification(data.title, options)
        .then(() => {
          console.log('✅ Notification shown successfully');
        })
        .catch((error) => {
          console.error('❌ Failed to show notification:', error);
        })
    );
  } catch (error) {
    console.error('❌ Error parsing push data:', error);
    
    // Fallback notification for malformed data
    event.waitUntil(
      self.registration.showNotification('Lembrete', {
        body: 'Você tem um novo lembrete!',
        icon: '/vite.svg',
        badge: '/vite.svg',
        tag: 'fallback-reminder',
        requireInteraction: true,
        data: {
          url: '/',
          timestamp: new Date().toISOString()
        }
      })
    );
  }
});

// Notification click event - handle user interactions
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Notification clicked:', event);
  
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  // Close the notification
  notification.close();

  if (action === 'mark-complete') {
    console.log('✅ Mark complete action triggered');
    
    // Handle mark as complete action
    const reminderId = data.reminderId;
    if (reminderId) {
      // Send message to all clients to mark reminder as complete
      event.waitUntil(
        self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
          if (clients.length > 0) {
            clients.forEach(client => {
              client.postMessage({
                type: 'MARK_REMINDER_COMPLETE',
                reminderId: reminderId
              });
            });
          }
        })
      );
    }
  } else {
    // Default action or 'view' action - open the app
    console.log('👀 Opening app');
    
    const urlToOpen = data.url || '/';
    
    event.waitUntil(
      self.clients.matchAll({ 
        type: 'window', 
        includeUncontrolled: true 
      }).then((clients) => {
        // Check if there's already a window/tab open with the target URL
        for (const client of clients) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            console.log('🔍 Focusing existing window');
            return client.focus();
          }
        }
        
        // If not, open a new window/tab
        if (self.clients.openWindow) {
          console.log('🆕 Opening new window');
          return self.clients.openWindow(urlToOpen);
        }
      }).catch((error) => {
        console.error('❌ Failed to handle notification click:', error);
      })
    );
  }
});

// Notification close event - handle when user dismisses notification
self.addEventListener('notificationclose', (event) => {
  console.log('❌ Notification closed:', event.notification.tag);
  
  // Optional: Track notification dismissals for analytics
  const data = event.notification.data || {};
  if (data.reminderId) {
    console.log('📊 Notification dismissed for reminder:', data.reminderId);
  }
});

// Background sync for offline functionality
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync event:', event.tag);
  
  if (event.tag === 'reminder-sync') {
    event.waitUntil(
      syncReminders().catch((error) => {
        console.error('❌ Background sync failed:', error);
      })
    );
  }
});

// Function to sync reminders when back online
async function syncReminders() {
  console.log('🔄 Syncing reminders in background...');
  
  try {
    // Get all clients
    const clients = await self.clients.matchAll();
    
    // Notify clients to sync reminders
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_REMINDERS'
      });
    });
    
    console.log('✅ Reminder sync completed');
  } catch (error) {
    console.error('❌ Reminder sync failed:', error);
    throw error;
  }
}

// Handle errors
self.addEventListener('error', (event) => {
  console.error('❌ Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Service Worker unhandled rejection:', event.reason);
});

// Log service worker lifecycle
console.log('🔧 Service Worker script loaded');