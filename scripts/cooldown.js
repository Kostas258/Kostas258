/**
 * A ledger of which services have blocked us, and when.
 *
 * The rule this enforces: never restart a runner against a service that has
 * just blocked it. Today that rule was broken by hand eight times — each
 * restart re-ran startup controls, and five vervox requests were spent proving
 * a source was alive out of a quota that had fallen to a couple of requests per
 * window. The controls cost more than they told us.
 *
 * Discipline alone did not hold, so the ledger is on disk: it survives the
 * process, and it survives the container restart that killed all three runners
 * at 19:30 without anyone noticing for two hours. A runner asks permission
 * before its first request, and waits out whatever is left of the cooldown.
 */
const path = require('path');
const fs = require('fs');
const { writeJsonAtomic, readJsonSafe } = require('./safe.js');

const LEDGER = path.join(__dirname, '..', 'blocks.json');

// Past six hours a source is not rate-limiting us, it is refusing us.
const MAX_COOLDOWN_MS = 6 * 3600000;

/** Default cooldowns, measured on this IP rather than taken from the sites. */
const COOLDOWN_MS = {
  vervox: 3 * 3600000,    // 65 min was not enough twice; 3 h let it answer again
  // Measured, not guessed: on 21 August socialcal was stopped at 16:14 and was
  // answering firmly again by 16:39. 45 min gives that margin. A control that
  // fails on the negative case counts as a block — the source can still say
  // "taken" but can no longer establish availability, which is what we need.
  socialcal: 45 * 60000,
  dnsrobot: 30 * 60000,
};

const read = () => (fs.existsSync(LEDGER) ? readJsonSafe(LEDGER) : { blocks: {} });

function recordBlock(source, detail = null) {
  const l = read();
  const prev = l.blocks[source];
  // Consecutive blocks compound. Picking a fixed cooldown meant guessing: 65 min
  // was wrong for vervox twice, and 45 min was wrong for socialcal today. Doubling
  // after each repeat lets the source itself set the pace, and one good answer
  // resets it — so a single bad patch never imposes a long wait forever.
  const streak = prev ? (prev.streak || 1) + 1 : 1;
  l.blocks[source] = { at: new Date().toISOString(), detail, streak };
  l.updatedAt = new Date().toISOString();
  writeJsonAtomic(LEDGER, l);
}

/** Clears a source's block once it has answered properly again. */
function recordSuccess(source) {
  const l = read();
  if (!l.blocks[source]) return;
  delete l.blocks[source];
  l.updatedAt = new Date().toISOString();
  writeJsonAtomic(LEDGER, l);
}

/**
 * How long a runner must stay silent before touching this source.
 * Returns 0 when it is free to go.
 */
function remainingMs(source, base = COOLDOWN_MS[source] || 3600000) {
  const b = read().blocks[source];
  if (!b) return 0;
  const streak = b.streak || 1;
  const cooldownMs = Math.min(base * Math.pow(2, streak - 1), MAX_COOLDOWN_MS);
  const left = Date.parse(b.at) + cooldownMs - Date.now();
  return left > 0 ? left : 0;
}

/** What the next wait would be, for logging before it is served. */
function currentCooldownMs(source, base = COOLDOWN_MS[source] || 3600000) {
  const b = read().blocks[source];
  return Math.min(base * Math.pow(2, ((b && b.streak) || 1) - 1), MAX_COOLDOWN_MS);
}

function lastBlock(source) {
  const b = read().blocks[source];
  return b ? { at: b.at, detail: b.detail } : null;
}

module.exports = { recordBlock, recordSuccess, remainingMs, currentCooldownMs, lastBlock, COOLDOWN_MS, LEDGER };
