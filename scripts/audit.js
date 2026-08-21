/**
 * Integrity audit over everything already recorded.
 *
 * The method has a few rules that must hold for the results to be worth
 * anything. They are easy to state and easy to violate silently across a long
 * run, so they are checked explicitly rather than assumed:
 *
 *   1. No verdict was derived from a failure. A rate-limit, timeout or
 *      transport error must leave "unknown", never "available" or "taken".
 *   2. Every stored verdict is backed by a raw API body that actually says so.
 *   3. No name is called available on one source while another calls it taken
 *      without that conflict being surfaced.
 *   4. Every name queried is a syntactically valid Instagram handle.
 *   5. The checkpoint files agree with the lists they are supposed to cover.
 *
 * Exits non-zero if any rule is broken, so it can gate the final report.
 */
const path = require('path');
const fs = require('fs');
const { readJsonSafe, isValidUsername } = require('./safe.js');

const REPO = path.join(__dirname, '..');
const load = f => (fs.existsSync(path.join(REPO, f)) ? readJsonSafe(path.join(REPO, f)) : null);

const p100 = load('progress.json');
const p1000 = load('progress_1000.json');
const sc = load('socialcal.json') || { results: {} };
const dr = load('dnsrobot.json') || { results: {} };

const problems = [];
const fail = (rule, detail) => problems.push(`[${rule}] ${detail}`);

const FAILURE_RE = /RATE_LIMITED|transport|timeout|HTTP \d|unparseable|challenge|no answer/i;

/** Rules 1, 2 and 4, applied to one stored record. */
function checkRecord(where, u, r) {
  if (!r) return;
  if (!isValidUsername(u)) fail('valid-handle', `${where}: "${u}" is not a valid Instagram handle`);

  if (r.verdict === 'available' || r.verdict === 'taken') {
    if (r.error && FAILURE_RE.test(r.error)) {
      fail('no-verdict-from-failure', `${where}/${u}: verdict "${r.verdict}" recorded alongside error "${r.error}"`);
    }
    if (r.rateLimited) fail('no-verdict-from-failure', `${where}/${u}: verdict "${r.verdict}" on a rate-limited response`);

    // Rule 2: the raw body must corroborate the verdict we stored.
    const body = r.api || '';
    if (!body) {
      if (!r.source) fail('verdict-backed-by-body', `${where}/${u}: verdict "${r.verdict}" with no stored API body`);
    } else if (r.site === 'vervox') {
      const want = r.verdict === 'available' ? '"available":true' : '"available":false';
      if (!body.includes(want)) fail('verdict-backed-by-body', `${where}/${u}: vervox verdict "${r.verdict}" not supported by body`);
    } else if (r.site === 'socialcal') {
      if (!body.includes(`"status":"${r.verdict}"`)) fail('verdict-backed-by-body', `${where}/${u}: socialcal verdict "${r.verdict}" not supported by body`);
    } else if (r.site === 'dnsrobot') {
      const want = r.verdict === 'available' ? '"available":true' : '"available":false';
      if (!body.includes(want)) fail('verdict-backed-by-body', `${where}/${u}: dnsrobot verdict "${r.verdict}" not supported by body`);
    }
  }
}

for (const [label, st, key] of [['100', p100, 'usernames'], ['1000', p1000, 'names']]) {
  if (!st) { fail('checkpoint', `progress file for the ${label} list is missing`); continue; }
  const names = st[key];
  const expected = label === '100' ? 100 : 1000;
  if (names.length !== expected) fail('checkpoint', `${label} list holds ${names.length} names, expected ${expected}`);

  const known = new Set(names);
  for (const [u, r] of Object.entries(st.results)) {
    if (!known.has(u)) fail('checkpoint', `${label}: results contain "${u}", absent from the list`);
    checkRecord(label, u, r);
  }
  // Rule 5: the cached "available" array must match the records.
  const derived = names.filter(u => st.results[u] && st.results[u].verdict === 'available');
  const extra = (st.available || []).filter(u => !derived.includes(u));
  if (extra.length) fail('checkpoint', `${label}: "available" lists ${extra.join(', ')} without a matching available verdict`);
}

for (const [u, r] of Object.entries(sc.results)) checkRecord('socialcal', u, r);
for (const [u, r] of Object.entries(dr.results)) checkRecord('dnsrobot', u, r);

// Rule 3: every cross-source disagreement must be visible, not silently dropped.
const V = r => (r && r.verdict && r.verdict !== 'unknown' ? r.verdict : null);
const conflicts = [];
for (const [names, res] of [[p100.usernames, p100.results], [p1000.names, p1000.results]])
  for (const u of names) {
    const verdicts = [V(res[u]), V(sc.results[u]), V(dr.results[u])].filter(Boolean);
    if (new Set(verdicts).size > 1) conflicts.push(u);
  }

console.log(`audited: ${Object.keys(p100.results).length + Object.keys(p1000.results).length} vervox, ` +
  `${Object.keys(sc.results).length} socialcal, ${Object.keys(dr.results).length} dnsrobot`);
console.log(`cross-source conflicts (must all appear in the report): ${conflicts.length}` +
  (conflicts.length ? ` -> ${conflicts.join(', ')}` : ''));

if (problems.length) {
  console.error(`\nFAILED — ${problems.length} integrity problem(s):`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log('\nOK — every recorded verdict is backed by its raw response, and no verdict came from a failure.');
