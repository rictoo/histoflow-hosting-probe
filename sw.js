// Adds the headers a static host cannot send to every same-origin response, worker scripts included.
// The technique coi-serviceworker uses for cross-origin isolation, extended to the security policy.
const HEADERS = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'wasm-unsafe-eval' blob:; worker-src 'self' blob:; " +
    "connect-src 'self'; style-src 'self'; object-src 'none'; base-uri 'self'",
};

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    (async () => {
      const response = await fetch(event.request);
      if (response.type === 'opaque' || response.status === 0) return response;
      const headers = new Headers(response.headers);
      for (const [name, value] of Object.entries(HEADERS)) headers.set(name, value);
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    })(),
  );
});
