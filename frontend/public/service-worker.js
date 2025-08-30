// frontend/public/service-worker.js

// Make this SW take control quickly during development
self.addEventListener('install', (event) => {
  // Optional: pre-cache files here later if you want
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim clients so updates apply without a full reload
  event.waitUntil(self.clients.claim());
  // Dev log (visible in chrome://inspect)
  console.log('[SW] activated');
});

// We'll use this later in Steps 10-12 for real push handling.
// Leaving a harmless stub now is fine.
self.addEventListener('push', (event) => {
  // If you send data, it will be event.data.json()
  // For step 9 we do nothing; we'll implement in Step 12.
});

// Handy for Step 12 (clicking a notif opens a URL)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // e.g., open /issue/:id later
});

