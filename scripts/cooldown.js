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

/**
 * @param {number|null} retryAfterMs  Durée annoncée par le serveur (en-tête
 *   Retry-After). Quand elle existe, elle l'emporte sur tout ce qu'on aurait
 *   deviné : c'est la source elle-même qui dit quand revenir.
 */
function recordBlock(source, detail = null, retryAfterMs = null) {
  const l = read();
  const prev = l.blocks[source];
  // Consecutive blocks compound. Picking a fixed cooldown meant guessing: 65 min
  // was wrong for vervox twice, and 45 min was wrong for socialcal today. Doubling
  // after each repeat lets the source itself set the pace, and one good answer
  // resets it — so a single bad patch never imposes a long wait forever.
  const streak = prev ? (prev.streak || 1) + 1 : 1;
  const entry = { at: new Date().toISOString(), detail, streak };
  // Le doublement reste le repli, pas la règle. Il existe parce qu'on ignorait
  // la durée réelle ; dès que le serveur l'annonce, deviner n'a plus de sens.
  // On ne borne pas par MAX_COOLDOWN_MS ici : si un service demande 6 h, les
  // écourter, c'est retourner se faire bloquer.
  if (Number.isFinite(retryAfterMs) && retryAfterMs > 0) entry.retryAfterMs = retryAfterMs;
  l.blocks[source] = entry;
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
  const left = Date.parse(b.at) + cooldownFor(b, base) - Date.now();
  return left > 0 ? left : 0;
}

/** What the next wait would be, for logging before it is served. */
function currentCooldownMs(source, base = COOLDOWN_MS[source] || 3600000) {
  const b = read().blocks[source];
  return b ? cooldownFor(b, base) : base;
}

/**
 * Durée d'un blocage. Le Retry-After du serveur prime ; sinon, doublement.
 *
 * L'écart mesuré justifie à lui seul le détour : vervox était puni 3 h par
 * défaut sans que personne n'ait jamais lu ce qu'il répondait, parce que curl
 * n'était appelé qu'avec %{http_code} et jetait les en-têtes. Attendre trois
 * heures quand le serveur en demande dix minutes coûte dix-huit fois le
 * nécessaire, et rien dans les journaux ne le montrait.
 */
function cooldownFor(b, base) {
  if (Number.isFinite(b.retryAfterMs) && b.retryAfterMs > 0) return b.retryAfterMs;
  return Math.min(base * Math.pow(2, ((b && b.streak) || 1) - 1), MAX_COOLDOWN_MS);
}

function lastBlock(source) {
  const b = read().blocks[source];
  return b ? { at: b.at, detail: b.detail } : null;
}

module.exports = { recordBlock, recordSuccess, remainingMs, currentCooldownMs, lastBlock, COOLDOWN_MS, LEDGER };
