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

// Every load that arrived without the service worker in control, kept across the reloads that
// recover from it: a first visit, or a hard reload (Ctrl+Shift+R), which bypasses service workers.
const RECOVERIES = 'histoflow-probe-recoveries';
const recoveries = () => JSON.parse(sessionStorage.getItem(RECOVERIES) ?? '[]');

async function serviceWorkerReady() {
  if (!('serviceWorker' in navigator)) return { available: false };
  const registration = await navigator.serviceWorker.register('./sw.js');
  await navigator.serviceWorker.ready;
  // The test is isolation, not control. A service worker claims an already-open page the moment it
  // activates, so a page can be "controlled" while its own response arrived without the headers;
  // only a document served through the worker is cross-origin isolated. And a hard reload
  // (Ctrl+Shift+R) bypasses the worker entirely. Either way nothing may start: record it, reload.
  if (!crossOriginIsolated) {
    const earlier = recoveries();
    // Two attempts in a row that come back unprotected mean the worker cannot help on this host.
    if (earlier.length > 0 && Date.now() - Date.parse(earlier.at(-1).at) < 10000 && earlier.length >= 2) {
      return { available: true, scope: registration.scope, gaveUp: true };
    }
    sessionStorage.setItem(
      RECOVERIES,
      JSON.stringify([
        ...earlier,
        {
          at: new Date().toISOString(),
          controlled: navigator.serviceWorker.controller !== null,
          crossOriginIsolated,
        },
      ]),
    );
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
    // Loads that arrived uncontrolled and reloaded themselves, oldest first, this tab only.
    uncontrolledLoadsRecovered: recoveries(),
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
