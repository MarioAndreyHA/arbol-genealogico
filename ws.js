// Nombre del caché actualizado para forzar los cambios
const CACHE_NAME = 'arbol-Cv1';

// Archivos locales y externos que se guardarán para funcionar offline
const urlsToCache = [
    './',
    './index.html',
    './diseño.html',
    './acerca_de.html',
    './manifest.json',
    './app.js',
    './ws.js',
    
    // Tus hojas de estilo
    './css/index.css',
    './css/diseño.css',
    './css/acerca_de.css',

    // Tus scripts
    './js/index.js',
    './js/diseño.js',
    './js/acerca_de.js',

    // Tus imágenes locales
    './img/logo.png',
    './img/pcSC.png',
    './img/mvSC.png',

    // Recursos externos (Framework Bootstrap)
    'https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js',

    // Imágenes externas de Unsplash usadas en la página de inicio
    'https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=1920&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1511895426328-dc8714191300?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1476820865390-c52aeebb9891?q=80&w=800&auto=format&fit=crop'
];

// 1. Instalación del Service Worker
self.addEventListener('install', event => {
    console.log('Service Worker: Instalado');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Archivos en caché guardados');
                return cache.addAll(urlsToCache);
            })
    );
});

// 2. Activación del Service Worker y limpieza de cachés antiguos
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    console.log('Service Worker: Activado');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Borrando caché antiguo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// 3. Estrategia de Fetch (Buscar primero en caché, luego en red)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            // Si el recurso ya está en el caché, lo devuelve sin gastar internet
            if (response) {
                return response; 
            }

            // Si no está, lo busca en la red
            return fetch(event.request)
                .then((networkResponse) => {
                    // Ignorar las peticiones de extensiones del navegador para evitar errores
                    if (event.request.url.startsWith('chrome-extension')) {
                        return networkResponse;
                    }
                    
                    // Si la respuesta es válida, la guarda en caché para la próxima vez
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, networkResponse.clone()); 
                        return networkResponse;
                    });
                })
                .catch(() => {
                    // Si no hay internet y se intentó navegar a otra página, muestra el index por defecto
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html'); 
                    }
                });
        })
    );
});