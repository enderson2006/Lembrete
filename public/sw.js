// Service Worker for handling push notifications
const CACHE_NAME = 'lembrete-pro-v4';
const urlsToCache = [
  '/',
  '/vite.svg',
  '/manifest.json'
];

// Keep service worker alive for background sync
let keepAliveInterval;

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
      
      // Start keep-alive mechanism for background operation
      startKeepAlive();
      
      return self.clients.claim();
    })
  );
});

// Keep service worker alive for background notifications
function startKeepAlive() {
  // Clear any existing interval
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }
  
  // Send a message to keep the service worker alive every 25 seconds
  keepAliveInterval = setInterval(() => {
    console.log('🔄 Service Worker keep-alive ping');
    
    // Check for due reminders in background
    checkBackgroundReminders();
  }, 25000); // 25 seconds to stay under 30s limit
}

// Background reminder checking
async function checkBackgroundReminders() {
  try {
    // Get all clients (open tabs)
    const clients = await self.clients.matchAll({
      includeUncontrolled: true,
      type: 'window'
    });
    
    if (clients.length === 0) {
      console.log('📱 No active clients, checking reminders in background...');
      
      // Post message to any available client to check reminders
      // This will wake up the app if it's minimized
      const allClients = await self.clients.matchAll();
      if (allClients.length > 0) {
        allClients[0].postMessage({
          type: 'CHECK_REMINDERS_BACKGROUND'
        });
      }
    }
  } catch (error) {
    console.error('❌ Error in background reminder check:', error);
  }
}

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

// Listen for messages from the main app
self.addEventListener('message', (event) => {
  console.log('📨 Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'KEEP_ALIVE') {
    // Respond to keep-alive ping from main app
    event.ports[0].postMessage({ success: true });
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

  // Default action - open the app
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

// Handle errors
self.addEventListener('error', (event) => {
  console.error('❌ Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Service Worker unhandled rejection:', event.reason);
});

// Log service worker lifecycle
console.log('🔧 Service Worker script loaded');