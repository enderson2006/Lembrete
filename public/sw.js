// Service Worker for handling push notifications
const CACHE_NAME = 'lembrete-pro-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  if (!event.data) {
    console.log('Push event has no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('Push data:', data);

    const options = {
      body: data.body || 'Você tem um lembrete!',
      icon: '/vite.svg',
      badge: '/vite.svg',
      tag: data.tag || 'reminder',
      requireInteraction: true,
      actions: [
        {
          action: 'mark-complete',
          title: 'Marcar como concluído'
        },
        {
          action: 'view',
          title: 'Ver detalhes'
        }
      ],
      data: {
        reminderId: data.reminderId,
        url: data.url || '/'
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Lembrete', options)
    );
  } catch (error) {
    console.error('Error parsing push data:', error);
    
    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('Lembrete', {
        body: 'Você tem um novo lembrete!',
        icon: '/vite.svg',
        badge: '/vite.svg'
      })
    );
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'mark-complete') {
    // Handle mark as complete action
    const reminderId = event.notification.data?.reminderId;
    if (reminderId) {
      // Send message to client to mark reminder as complete
      event.waitUntil(
        self.clients.matchAll().then((clients) => {
          if (clients.length > 0) {
            clients[0].postMessage({
              type: 'MARK_REMINDER_COMPLETE',
              reminderId: reminderId
            });
          }
        })
      );
    }
  } else {
    // Default action - open the app
    const urlToOpen = event.notification.data?.url || '/';
    
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        // Check if there's already a window/tab open with the target URL
        for (const client of clients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        
        // If not, open a new window/tab
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
    );
  }
});

// Background sync for offline functionality (optional)
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event.tag);
  
  if (event.tag === 'reminder-sync') {
    event.waitUntil(
      // Handle background sync for reminders
      console.log('Syncing reminders in background...')
    );
  }
});