
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./ws.js')
            .then((registration) => {
                console.log('Service Worker registrado', registration.scope); 
            })
            .catch((error) => {
                console.log('Error al registrar el Service Worker:', error);
            });
    });
}