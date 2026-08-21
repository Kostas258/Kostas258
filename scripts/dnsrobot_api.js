/**
 * Third source, used only as a tie-breaker on names where vervox and socialcal
 * disagree.
 *
 * It queries Instagram directly and streams one NDJSON line per platform. That
 * makes it the closest thing to ground truth available here — but it is also
 * why it is often rate-limited itself, in which case it reports
 * available:null with an explicit error. That honest null is respected: a
 * blocked answer is never read as a verdict.
 */
const { execFile } = require('child_process');

const API = 'https://dnsrobot.net/api/social-username';
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

const sleep = ms => new Promise(r => setTimeout(r, ms));

function post(username, timeoutMs) {
  const args = [
    '-sS', '--compressed', '-X', 'POST', API,
    '-H', 'Content-Type: application/json',
    '-H', 'Origin: https://dnsrobot.net',
    '-H', 'Referer: https://dnsrobot.net/username-checker',
    '-A', UA,
    '--data-binary', JSON.stringify({ username }),
    '--max-time', String(Math.round(timeoutMs / 1000)),
  ];
  return new Promise(resolve => {
    execFile('curl', args, { maxBuffer: 8 << 20 }, (err, stdout, stderr) => {
      if (err && !stdout) return resolve({ body: '', err: (stderr || err.message).trim().split('\n')[0] });
      resolve({ body: stdout, err: null });
    });
  });
}

/**
 * Check one username.
 * Returns { site:'dnsrobot', username, verdict:'taken'|'available'|'unknown', api, error, checkedAt }
 */
async function checkDnsrobot(username, { timeoutMs = 90000 } = {}) {
  const out = {
    site: 'dnsrobot', username, verdict: 'unknown',
    api: null, error: null, checkedAt: new Date().toISOString(),
  };

  const { body, err } = await post(username, timeoutMs);
  if (err) { out.error = `transport: ${err}`; return out; }

  const line = body.split('\n').find(l => /"platform"\s*:\s*"Instagram"/i.test(l));
  if (!line) { out.error = 'no Instagram line in stream'; return out; }
  out.api = line.slice(0, 600);

  let j;
  try { j = JSON.parse(line); } catch (e) { out.error = 'unparseable Instagram line'; return out; }

  if (j.available === true) out.verdict = 'available';
  else if (j.available === false) out.verdict = 'taken';
  else out.error = j.error ? `upstream: ${j.error}` : `available=${j.available} status=${j.status}`;

  return out;
}

module.exports = { checkDnsrobot, sleep };
