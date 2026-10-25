import { probe } from './probe-core.js';

const mode = new URLSearchParams(location.search).get('mode') === 'sw' ? 'sw' : 'plain';

/** Runs one worker's probe; a worker that cannot start reports why. */
function inWorker(worker) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ error: 'no answer within 15 s' }), 15000);
    worker.onmessage = (event) => {
      clearTimeout(timer);
      resolve(event.data);
    };
    worker.onerror = (event) => {
      clearTimeout(timer);
      event.preventDefault();
      resolve({ error: String(event.message ?? 'worker failed to start') });
    };
  });
}

async function serviceWorkerReady() {
  if (!('serviceWorker' in navigator)) return { available: false };
  const registration = await navigator.serviceWorker.register('./sw.js');
  await navigator.serviceWorker.ready;
  if (navigator.serviceWorker.controller === null) {
    // The first load is not yet controlled: the headers only apply from the next one.
    location.reload();
    return null;
  }
  return { available: true, scope: registration.scope };
}

async function unregister() {
  if (!('serviceWorker' in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  if (registrations.length === 0) return false;
  await Promise.all(registrations.map((registration) => registration.unregister()));
  return true;
}

async function run() {
  let serviceWorker = { available: false };
  if (mode === 'sw') {
    serviceWorker = await serviceWorkerReady();
    if (serviceWorker === null) return;
  } else if (await unregister()) {
    // A plain run must not be served through a service worker left over from an earlier visit.
    location.reload();
    return;
  }

  const workerSource = await (await fetch('./worker-classic.js')).text();
  const blobUrl = URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' }));

  const results = {
    host: location.host,
    mode,
    servedThroughServiceWorker: navigator.serviceWorker?.controller != null,
    page: await probe(),
    workers: {
      'URL-loaded module worker (how HistoFlow starts its workers)': await inWorker(
        new Worker('./worker-module.js', { type: 'module' }),
      ),
      'URL-loaded classic worker': await inWorker(new Worker('./worker-classic.js')),
      'blob: worker': await inWorker(new Worker(blobUrl)),
    },
    userAgent: navigator.userAgent,
  };

  document.getElementById('results').textContent = JSON.stringify(results, null, 2);
  document.getElementById('status').textContent = `Done (${mode}).`;
  window.__results = results;
}

run().catch((error) => {
  document.getElementById('status').textContent = `Failed: ${error}`;
  window.__results = { error: String(error) };
});
