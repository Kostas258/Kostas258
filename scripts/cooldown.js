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
  l.blocks[source] = { at: new Date().toISOString(), detail };
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
function remainingMs(source, cooldownMs = COOLDOWN_MS[source] || 3600000) {
  const b = read().blocks[source];
  if (!b) return 0;
  const left = Date.parse(b.at) + cooldownMs - Date.now();
  return left > 0 ? left : 0;
}

function lastBlock(source) {
  const b = read().blocks[source];
  return b ? { at: b.at, detail: b.detail } : null;
}

module.exports = { recordBlock, recordSuccess, remainingMs, lastBlock, COOLDOWN_MS, LEDGER };
