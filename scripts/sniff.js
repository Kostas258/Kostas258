/**
 * Discovers the API behind a browser-only username checker.
 *
 * Most of these sites are React or Next.js apps whose checker lives in a server
 * action or a chunk that static probing cannot reach — reverse-engineering each
 * by hand went nowhere. So the browser drives the page once, and every request
 * it makes is recorded. The point is NOT to keep using the browser: it is to
 * learn the one call worth making, then make that call with curl for the bulk.
 * One browser run per site, instead of one per username.
 *
 * Usage: node scripts/sniff.js <url> <input-selector-hint> <username>
 */
const { chromium } = require('playwright-core');

const EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const [, , url, username = 'instagram'] = process.argv;
if (!url) { console.error('usage: sniff.js <url> [username]'); process.exit(1); }

// Requests the page makes anyway — analytics, fonts, frameworks. Listing them
// keeps the interesting calls visible instead of buried.
const NOISE = /google|gtag|analytics|facebook|doubleclick|hotjar|clarity|segment|sentry|intercom|stripe|cloudflareinsights|fonts\.|\.(png|jpe?g|svg|gif|webp|woff2?|ico|css)(\?|$)/i;

(async () => {
  // Chromium does not read HTTPS_PROXY on its own: without this it dials out
  // directly and the egress gateway resets the handshake (ERR_CONNECTION_RESET).
  // The CA is already trusted in the browser's NSS store, so nothing about TLS
  // verification is being weakened here — only the route is being set.
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const browser = await chromium.launch({
    executablePath: EXEC,
    args: ['--no-sandbox'],
    ...(proxy ? { proxy: { server: proxy } } : {}),
  });
  const page = await browser.newPage({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36' });

  const calls = [];
  page.on('request', r => {
    const u = r.url();
    if (NOISE.test(u) || u.startsWith('data:')) return;
    if (r.method() === 'GET' && !/api|check|username|handle|avail/i.test(u)) return;
    calls.push({ method: r.method(), url: u, body: r.postData() || null });
  });
  page.on('response', async r => {
    const c = calls.find(x => x.url === r.url() && x.status === undefined);
    if (c) { c.status = r.status(); try { c.sample = (await r.text()).slice(0, 300); } catch {} }
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(2500);

    // Find the most plausible text input and submit through it.
    const input = await page.$('input[type="text"], input[type="search"], input:not([type]), input[placeholder*="sername" i], input[placeholder*="andle" i], input[placeholder*="name" i]');
    if (!input) { console.log('AUCUN champ de saisie trouvé'); }
    else {
      await input.click();
      await input.fill(username);
      await page.waitForTimeout(400);
      await input.press('Enter');
      await page.waitForTimeout(1500);
      // Some forms ignore Enter and need the button.
      for (const sel of ['button[type="submit"]', 'button:has-text("Check")', 'button:has-text("Search")', 'button:has-text("Vérifier")']) {
        const b = await page.$(sel);
        if (b) { await b.click().catch(() => {}); break; }
      }
      await page.waitForTimeout(6000);
    }
  } catch (e) {
    console.log('navigation:', e.message.split('\n')[0]);
  }

  const seen = new Set();
  for (const c of calls) {
    const key = c.method + c.url.split('?')[0];
    if (seen.has(key)) continue;
    seen.add(key);
    console.log(`${c.method} ${c.status ?? '?'} ${c.url}`);
    if (c.body) console.log(`   body: ${c.body.slice(0, 200)}`);
    if (c.sample) console.log(`   resp: ${c.sample.replace(/\s+/g, ' ').slice(0, 200)}`);
  }
  if (!calls.length) console.log('(aucune requête réseau notable)');

  await browser.close();
})();
