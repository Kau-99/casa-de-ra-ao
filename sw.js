const CACHE = 'helvinho-admin-v1';

/* Instala o service worker e cacheia assets estáticos do admin */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE).then(cache =>
            cache.addAll(['/admin.html', '/admin.js'])
        ).catch(() => {})
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

/* Exibe notificação push quando o backend enviar (futura integração Web Push) */
self.addEventListener('push', event => {
    if (!event.data) return;
    let data = {};
    try { data = event.data.json(); } catch { data = { title: 'Helvinho Rações', body: event.data.text() }; }

    event.waitUntil(
        self.registration.showNotification(data.title ?? 'Helvinho Rações', {
            body:    data.body  ?? '',
            icon:    '/assets/dog.png',
            badge:   '/assets/dog.png',
            tag:     'helvinho-admin',
            vibrate: [200, 100, 200],
            data:    { url: data.url ?? '/admin.html' },
        })
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    const url = event.notification.data?.url ?? '/admin.html';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
            const adminClient = list.find(c => c.url.includes('admin.html'));
            return adminClient ? adminClient.focus() : clients.openWindow(url);
        })
    );
});
