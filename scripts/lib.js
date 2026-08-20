const { chromium, request } = require('/opt/node22/lib/node_modules/playwright');

const PROXY = { server: 'http://127.0.0.1:33353' };
const STATIC_RE = /\.(js|css|woff2?|ttf|otf|png|jpe?g|gif|svg|webp|ico)(\?|$)/i;
const BLOCK_RE = /googletagmanager|google-analytics|doubleclick|facebook\.net|hotjar|clarity\.ms|monitoring\?|\/ingest\/|sentry/i;

const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * Browser whose every request is performed by Playwright's Node-side fetch.
 * Chromium's own TLS stack is reset by this environment's egress gateway,
 * while Node's works, so all traffic is proxied through route interception.
 */
// Next.js link prefetches (?_rsc=) pull a dozen unrelated pages on every load.
// Blocking them cuts requests per check ~5x, which lowers the load we put on the site.
const PREFETCH_RE = /[?&]_rsc=/;
const HEAVY_RE = /\/_next\/image|\.(png|jpe?g|gif|webp|mp4|woff2?)(\?|$)/i;

async function makeBrowser({ cache = true, lean = false } = {}) {
  const api = await request.newContext({ proxy: PROXY });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
    locale: 'fr-FR',
  });

  const assetCache = new Map();
  const stats = { fetches: 0, cacheHits: 0, retries: 0, failures: 0 };

  await ctx.route('**/*', async route => {
    const req = route.request();
    const url = req.url();

    if (BLOCK_RE.test(url)) { try { await route.abort(); } catch (e) {} return; }
    if (lean && (PREFETCH_RE.test(url) || HEAVY_RE.test(url))) { try { await route.abort(); } catch (e) {} return; }

    const cacheable = cache && req.method() === 'GET' && STATIC_RE.test(url);
    if (cacheable && assetCache.has(url)) {
      stats.cacheHits++;
      const c = assetCache.get(url);
      try { await route.fulfill(c); } catch (e) {}
      return;
    }

    let lastErr;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        stats.fetches++;
        const r = await api.fetch(url, {
          method: req.method(),
          headers: req.headers(),
          data: req.postDataBuffer() || undefined,
          maxRedirects: 5,
          timeout: 45000,
        });
        const h = { ...r.headers() };
        delete h['content-encoding'];
        delete h['content-length'];
        delete h['content-security-policy'];
        delete h['content-security-policy-report-only'];
        const payload = { status: r.status(), headers: h, body: await r.body() };
        if (cacheable && r.status() === 200) assetCache.set(url, payload);
        await route.fulfill(payload);
        return;
      } catch (e) {
        lastErr = e;
        stats.retries++;
        await sleep(1500 * (attempt + 1));
      }
    }
    stats.failures++;
    console.error('[route-fail]', req.resourceType(), url.slice(0, 100), lastErr && lastErr.message.split('\n')[0]);
    try { await route.abort(); } catch (e) {}
  });

  return {
    browser, ctx, api, stats,
    close: async () => {
      try { await browser.close(); } catch (e) {}
      try { await api.dispose(); } catch (e) {}
    },
  };
}

module.exports = { makeBrowser, sleep };
