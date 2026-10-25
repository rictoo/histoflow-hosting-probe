# HistoFlow hosting probe

A throwaway test page, not part of HistoFlow. It measures what a static host (here GitHub Pages,
which sends no `Content-Security-Policy`, `Cross-Origin-Opener-Policy` or
`Cross-Origin-Embedder-Policy` headers) lets a page's security policy reach:

- **plain** (`?mode=plain`): the policy delivered as a `<meta>` tag only;
- **service worker** (`?mode=sw`): the same, with a service worker adding the missing headers to
  every same-origin response.

For the page and for URL-loaded, classic and `blob:` workers, it reports whether `eval` is allowed,
whether a request to another origin (`https://api.github.com/zen`) succeeds, and whether the
context is cross-origin isolated with `SharedArrayBuffer` available. It sends nothing else anywhere.
