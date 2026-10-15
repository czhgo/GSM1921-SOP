// role: [工程师]+[AI]
// ── 页面导航 URL 解析叶子：统一尊重 HTML <base> 与部署子路径 ──

/**
 * Resolve an in-site page URL against the active document base.
 * Pass `baseURI` explicitly in tests; browser callers use `document.baseURI`.
 * @param {string} path
 * @param {{ baseURI?: string, searchParams?: Record<string, string|number|boolean> }} [options]
 */
export function resolveDocumentUrl(path, { baseURI, searchParams } = {}) {
  const base = baseURI || (typeof document !== 'undefined' ? document.baseURI : '');
  if (!base) throw new TypeError('resolveDocumentUrl requires a document base URI');

  const url = new URL(path, base);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value != null) url.searchParams.set(key, String(value));
    }
  }
  return url.href;
}
