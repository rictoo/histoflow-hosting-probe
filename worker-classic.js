// A classic worker loaded from a URL. The same questions as probe-core.js, inline, because a classic
// worker cannot import a module.
(async () => {
  const result = {
    crossOriginIsolated: self.crossOriginIsolated === true,
    sharedArrayBuffer: typeof SharedArrayBuffer === 'function',
  };
  try {
    new Function('return 1');
    result.eval = 'allowed';
  } catch {
    result.eval = 'blocked';
  }
  try {
    const response = await fetch('https://api.github.com/zen', { cache: 'no-store' });
    result.requestToAnotherOrigin = `allowed (HTTP ${response.status})`;
  } catch (error) {
    result.requestToAnotherOrigin = `blocked (${String(error.message ?? error).slice(0, 40)})`;
  }
  postMessage(result);
})();
