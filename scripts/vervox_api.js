/**
 * vervox.app username checker, talking to its JSON API directly.
 *
 * The previous session drove a real Chromium through Playwright because that
 * environment's gateway reset Chromium's TLS handshakes. Here the API answers a
 * plain POST, so the browser is gone: one request per check instead of ~40,
 * which is both faster and much lighter on the site.
 *
 * Requests go through curl rather than Node's fetch: fetch ignores HTTPS_PROXY,
 * and this session's egress is proxied with a private CA.
 */
const { execFile } = require('child_process');

const API = 'https://vervox.app/api/tools/username-check';
const REFERER = 'https://vervox.app/fr/outils/verificateur-nom-instagram';
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

const { assertUsername } = require('./safe.js');
const { recordBlock, recordSuccess } = require('./cooldown.js');

const sleep = ms => new Promise(r => setTimeout(r, ms));

function curlJson(username, timeoutMs) {
  const args = [
    '-sS', '--compressed',
    '-X', 'POST', API,
    '-H', 'Content-Type: application/json',
    '-H', 'Accept: application/json',
    '-H', `Referer: ${REFERER}`,
    '-H', 'Origin: https://vervox.app',
    '-H', 'Accept-Language: fr-FR,fr;q=0.9',
    '-A', UA,
    '--data-binary', JSON.stringify({ username, platform: 'instagram' }),
    '--max-time', String(Math.round(timeoutMs / 1000)),
    // %header{} demande à curl l'en-tête de réponse sans imprimer tout le bloc,
    // donc sans toucher au découpage du corps. Disponible depuis curl 7.84 ;
    // sur une version plus ancienne il rend une chaîne vide, ce qui ramène
    // simplement au comportement d'avant.
    '-w', '\n__RA__%header{retry-after}\n__HTTP__%{http_code}',
  ];
  return new Promise(resolve => {
    execFile('curl', args, { maxBuffer: 4 << 20 }, (err, stdout, stderr) => {
      if (err && !stdout) return resolve({ status: 0, body: '', retryAfterMs: null, err: (stderr || err.message).trim().split('\n')[0] });
      const h = stdout.lastIndexOf('\n__HTTP__');
      const status = h === -1 ? 0 : parseInt(stdout.slice(h + 9), 10);
      const rest = h === -1 ? stdout : stdout.slice(0, h);
      const r = rest.lastIndexOf('\n__RA__');
      const retryAfter = r === -1 ? '' : rest.slice(r + 7).trim();
      resolve({
        status,
        body: r === -1 ? rest : rest.slice(0, r),
        retryAfterMs: parseRetryAfter(retryAfter),
        err: null,
      });
    });
  });
}

/**
 * Retry-After, dans ses deux formes (RFC 9110) : un nombre de secondes, ou une
 * date HTTP. Les deux circulent, et ne lire que la première laisserait passer
 * silencieusement les services qui envoient la seconde.
 *
 * Renvoie null sur tout ce qui est absent, illisible ou déjà passé — jamais 0,
 * qui voudrait dire « reprends tout de suite » et transformerait un en-tête
 * malformé en autorisation de marteler la source.
 */
function parseRetryAfter(v) {
  if (!v) return null;
  const s = String(v).trim();
  if (/^\d+$/.test(s)) {
    const ms = parseInt(s, 10) * 1000;
    return ms > 0 ? ms : null;
  }
  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  const ms = t - Date.now();
  return ms > 0 ? ms : null;
}

/** A Cloudflare / captcha interstitial rather than the API. Never solved — only detected. */
function looksLikeChallenge(status, body) {
  if (!body) return null;
  if (/<title>\s*just a moment/i.test(body)) return 'Cloudflare "Just a moment" interstitial';
  if (/challenges\.cloudflare\.com|cf-turnstile|g-recaptcha|h-captcha/i.test(body)) return 'captcha widget in response';
  if ((status === 403 || status === 503) && /<html/i.test(body)) return `HTML block page (HTTP ${status})`;
  return null;
}

/**
 * Check one username.
 * Returns { site, username, verdict:'taken'|'available'|'unknown', api, error,
 *           rateLimited?, captcha?, checkedAt, attempts }
 */
async function checkVervox(username, { timeoutMs = 45000 } = {}) {
  assertUsername(username);
  const out = {
    site: 'vervox', username, verdict: 'unknown',
    api: null, error: null, checkedAt: new Date().toISOString(), attempts: 1,
  };

  const { status, body, retryAfterMs, err } = await curlJson(username, timeoutMs);
  out.api = body ? body.slice(0, 1000) : null;
  if (retryAfterMs) out.retryAfterMs = retryAfterMs;

  if (err) { out.error = `transport: ${err}`; return out; }

  const challenge = looksLikeChallenge(status, body);
  if (challenge) { out.error = `anti-bot challenge detected (${challenge})`; out.captcha = true; return out; }

  if (status === 429 || /IP_RATE_LIMITED|Trop de requ/i.test(body)) {
    out.error = 'RATE_LIMITED';
    out.rateLimited = true;
    // Quand le serveur annonce la durée, elle remplace notre estimation de 3 h.
    recordBlock('vervox', retryAfterMs
      ? `HTTP ${status}, Retry-After ${Math.round(retryAfterMs / 1000)}s`
      : `HTTP ${status}, sans Retry-After`, retryAfterMs);
    return out;
  }
  // 403 : refus de politique, pas de cadence. Ralentir n'y change rien, et
  // réessayer aggrave. On l'enregistre comme un blocage pour que le runner
  // s'arrête, mais l'erreur dit explicitement qu'il faut regarder l'accès —
  // pas attendre. Un Retry-After sur un 403 reste honoré s'il est présent.
  if (status === 403) {
    out.error = 'FORBIDDEN — refus de politique, pas de cadence : vérifier accès, en-têtes attendus, ou blocage par IP. Ne pas réessayer en boucle.';
    out.rateLimited = true;
    recordBlock('vervox', `HTTP 403 (politique d'accès)`, retryAfterMs);
    return out;
  }
  if (status !== 200) { out.error = `HTTP ${status}`; return out; }

  let j;
  try { j = JSON.parse(body); } catch (e) { out.error = 'unparseable JSON response'; return out; }

  // Three independent fields of the same answer must agree before a verdict is
  // recorded: the boolean, the status code, and the human-readable message.
  // Any disagreement, or a missing field, stays "unknown" — never "available".
  const msg = String(j.message || '');
  const free = j.available === true && j.statusCode === 'AVAILABLE' && /disponible|available/i.test(msg);
  const taken = j.available === false && j.statusCode === 'TAKEN' && /d[ée]j[àa] pris|taken/i.test(msg);

  if (free) out.verdict = 'available';
  else if (taken) out.verdict = 'taken';
  if (out.verdict !== 'unknown') recordSuccess('vervox');
  else {
    out.error = typeof j.available === 'boolean'
      ? `field disagreement (available=${j.available}, statusCode=${j.statusCode})`
      : `no "available" field (errorCode=${j.errorCode || 'none'})`;
  }
  return out;
}

module.exports = { checkVervox, sleep };
