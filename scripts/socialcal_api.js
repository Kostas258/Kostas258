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
    '-w', '\n__HTTP__%{http_code}',
  ];
  return new Promise(resolve => {
    execFile('curl', args, { maxBuffer: 4 << 20 }, (err, stdout, stderr) => {
      if (err && !stdout) return resolve({ status: 0, body: '', err: (stderr || err.message).trim().split('\n')[0] });
      const i = stdout.lastIndexOf('\n__HTTP__');
      const status = i === -1 ? 0 : parseInt(stdout.slice(i + 9), 10);
      resolve({ status, body: i === -1 ? stdout : stdout.slice(0, i), err: null });
    });
  });
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

  const { status, body, err } = await post(username, timeoutMs);
  out.api = body ? body.slice(0, 600) : null;
  if (err) { out.error = `transport: ${err}`; return out; }
  if (status === 429) { recordBlock('socialcal', `HTTP ${status}`); out.error = 'RATE_LIMITED'; out.rateLimited = true; return out; }
  if (status !== 200) { out.error = `HTTP ${status}`; return out; }

  let j;
  try { j = JSON.parse(body); } catch (e) { out.error = 'unparseable JSON response'; return out; }

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
