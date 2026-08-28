/**
 * Second, independent availability source: the checker behind socialcal.app.
 *
 * Why it matters: brandsnag's Instagram backend is dead (35/35 indeterminate
 * last session, including on control names that are obviously taken), so every
 * "available" verdict so far rests on vervox alone. This endpoint is a
 * different service on different infrastructure with its own quota, so it
 * restores the two-source corroboration the method calls for.
 *
 * Endpoint discovered in the page's JS chunk:
 *   POST https://socialcal-media-proxy.jan-orsula1.workers.dev/username/check
 *   {"handle":"<name>","platforms":["instagram"]}
 */
const { execFile } = require('child_process');

const API = 'https://socialcal-media-proxy.jan-orsula1.workers.dev/username/check';
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

const { assertUsername } = require('./safe.js');
const { recordBlock, recordSuccess } = require('./cooldown.js');

const sleep = ms => new Promise(r => setTimeout(r, ms));

function post(username, timeoutMs) {
  const args = [
    '-sS', '--compressed', '-X', 'POST', API,
    '-H', 'Content-Type: application/json',
    '-H', 'Origin: https://www.socialcal.app',
    '-H', 'Referer: https://www.socialcal.app/',
    '-A', UA,
    '--data-binary', JSON.stringify({ handle: username, platforms: ['instagram'] }),
    '--max-time', String(Math.round(timeoutMs / 1000)),
    '-w', '\n__RA__%header{retry-after}\n__HTTP__%{http_code}',
  ];
  return new Promise(resolve => {
    execFile('curl', args, { maxBuffer: 4 << 20 }, (err, stdout, stderr) => {
      if (err && !stdout) return resolve({ status: 0, body: '', retryAfterMs: null, err: (stderr || err.message).trim().split('\n')[0] });
      const h = stdout.lastIndexOf('\n__HTTP__');
      const status = h === -1 ? 0 : parseInt(stdout.slice(h + 9), 10);
      const rest = h === -1 ? stdout : stdout.slice(0, h);
      const r = rest.lastIndexOf('\n__RA__');
      resolve({
        status,
        body: r === -1 ? rest : rest.slice(0, r),
        retryAfterMs: parseRetryAfter(r === -1 ? '' : rest.slice(r + 7).trim()),
        err: null,
      });
    });
  });
}

/** Retry-After : secondes ou date HTTP (RFC 9110). null si absent, illisible ou
 *  déjà passé — jamais 0, qui autoriserait à repartir immédiatement. */
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

/**
 * Check one username.
 * Returns { site:'socialcal', username, verdict:'taken'|'available'|'unknown',
 *           confidence, cached, api, error, checkedAt }
 */
async function checkSocialcal(username, { timeoutMs = 45000 } = {}) {
  assertUsername(username);
  const out = {
    site: 'socialcal', username, verdict: 'unknown',
    confidence: null, cached: null, api: null, error: null,
    checkedAt: new Date().toISOString(),
  };

  const { status, body, retryAfterMs, err } = await post(username, timeoutMs);
  // socialcal renvoie un profileUrl pointant vers le compte du tiers. Il n'entre
  // dans aucune vérification — audit.js ne lit que "status":"<verdict>" — et ce
  // dépôt est public. On ne le conserve donc pas. Retrait par expression
  // régulière et non par re-sérialisation : le corps stocké est la preuve, le
  // réécrire changerait des octets que l'audit compare.
  out.api = body ? body.replace(/,?"profileUrl":"[^"]*"(,)?/g,
    (m, apres) => (m.startsWith(',') && apres) ? ',' : (apres ? ',' : '')).slice(0, 600) : null;
  if (retryAfterMs) out.retryAfterMs = retryAfterMs;
  if (err) { out.error = `transport: ${err}`; return out; }
  if (status === 429) {
    recordBlock('socialcal', retryAfterMs
      ? `HTTP ${status}, Retry-After ${Math.round(retryAfterMs / 1000)}s`
      : `HTTP ${status}, sans Retry-After`, retryAfterMs);
    out.error = 'RATE_LIMITED'; out.rateLimited = true; return out;
  }
  // 403 : politique d'accès, pas cadence. Réessayer ne sert à rien et nuit.
  if (status === 403) {
    recordBlock('socialcal', `HTTP 403 (politique d'accès)`, retryAfterMs);
    out.error = 'FORBIDDEN — refus de politique : vérifier l\'accès, pas la cadence.';
    out.rateLimited = true; return out;
  }
  if (status !== 200) { out.error = `HTTP ${status}`; return out; }

  let j;
  try { j = JSON.parse(body); } catch { out.error = 'unparseable JSON response'; return out; }

  const r = j && j.results && j.results.instagram;
  if (!j.success || !r) { out.error = 'no instagram result in response'; return out; }

  out.confidence = r.confidence || null;
  out.cached = !!r.cached;

  // Only a high-confidence taken/available is recorded. Anything else — an
  // "unknown"/"error" status, or a low-confidence guess — stays indeterminate.
  if (r.status === 'taken' && r.confidence === 'high') out.verdict = 'taken';
  else if (r.status === 'available' && r.confidence === 'high') out.verdict = 'available';
  else out.error = `status=${r.status} confidence=${r.confidence}`;

  if (out.verdict !== 'unknown') recordSuccess('socialcal');

  return out;
}

module.exports = { checkSocialcal, sleep };
