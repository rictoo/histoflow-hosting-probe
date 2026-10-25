// What one context can do: shared by the page and every worker, so each is asked the same questions.
// An outside origin that allows any caller (CORS), so the only thing able to stop the request is
// the policy. Nothing is sent but the request itself.
export const OUTSIDE = 'https://api.github.com/zen';

export async function probe() {
  const result = {
    crossOriginIsolated: globalThis.crossOriginIsolated === true,
    sharedArrayBuffer: typeof SharedArrayBuffer === 'function',
  };
  try {
    new Function('return 1');
    result.eval = 'allowed';
  } catch {
    result.eval = 'blocked';
  }
  try {
    const response = await fetch(OUTSIDE, { cache: 'no-store' });
    result.requestToAnotherOrigin = `allowed (HTTP ${response.status})`;
  } catch (error) {
    result.requestToAnotherOrigin = `blocked (${String(error.message ?? error).slice(0, 40)})`;
  }
  return result;
}
