/**
 * Spends vervox's scarce quota only where it changes the answer.
 *
 * socialcal covers the lists cheaply and is the stricter source, so it produces
 * the candidate set. vervox is then asked about nothing but the names socialcal
 * called available — a few dozen requests instead of eleven hundred.
 *
 * Cadence: the first session measured that one check every ~6 minutes never
 * triggered a 429 over several hours, while faster settings did. This run
 * defaults to 8 minutes. 70s and 105s were both tried here and both got blocked,
 * and a block costs far more than the time it saves.
 */
const path = require('path');
const { checkVervox, sleep } = require('./vervox_api.js');
const { writeJsonAtomic, readJsonSafe, claimSingleInstance } = require('./safe.js');
const { ts } = require('./time.js');
const { Throttle } = require('./throttle.js');
const { remainingMs, lastBlock, recordBlock, currentCooldownMs } = require('./cooldown.js');

const REPO = path.join(__dirname, '..');
const P100 = path.join(REPO, 'progress.json');
const P1000 = path.join(REPO, 'progress_1000.json');
const SC = path.join(REPO, 'socialcal.json');

const DELAY_MS = +(process.env.DELAY_MS || 480000);          // ~7.5 checks/hour, the measured-safe floor
const MAX_DELAY_MS = +(process.env.MAX_DELAY_MS || 1800000);
const BACKOFF_MS = +(process.env.BACKOFF_MS || 3 * 3600000); // a block here lasts hours, not one
const MAX_BACKOFFS = +(process.env.MAX_BACKOFFS || 4);
const QUIET_UNTIL = process.env.QUIET_UNTIL ? Date.parse(process.env.QUIET_UNTIL) : 0;
// Hard stop, so an unattended overnight run always leaves time to publish.
const DEADLINE = process.env.DEADLINE ? Date.parse(process.env.DEADLINE) : 0;
// A control costs one request out of a quota that has fallen to a couple per
// window. If vervox answered correctly a few minutes ago, that IS the evidence
// the control would buy, so skip it rather than spend the request twice.
const CONTROL_SKIP_MS = +(process.env.CONTROL_SKIP_MS || 45 * 60000);
// A name vervox never settles must not be asked forever on a quota this thin.
const MAX_TRIES = +(process.env.MAX_TRIES || 3);
// Bounded runs, on purpose. Twice now the runners have been killed with no
// notification at all — the harness simply lost them, and the loss was only
// discovered hours later by looking. A run that ends *itself* exits cleanly, and
// a clean exit produces a completion notification that wakes the session to
// start the next stretch. Silent death becomes a scheduled handover; progress is
// checkpointed after every name, so a handover costs nothing.
const RUN_MS = +(process.env.RUN_MINUTES || 0) * 60000;
const STARTED_AT = Date.now();

// 8 min is the cadence measured as safe on this source; it is the floor.
const throttle = new Throttle({ min: DELAY_MS, max: MAX_DELAY_MS, windowSize: 6 });


/**
 * The rule: never restart against a service that just blocked us. Enforced from
 * the on-disk ledger, so it survives both this process and a container restart.
 */
async function respectCooldown(source, deadline, runMs = 0) {
  const left = remainingMs(source);
  if (!left) return true;
  const b = lastBlock(source);
  const until = new Date(Date.now() + left);
  // Sleeping past our own handover window would hold the slot for hours and then
  // exit with nothing done. The block is on disk, so the next stretch picks it up.
  if (runMs && left >= runMs) {
    console.log(`${ts()} ${source} est en silence jusqu'à ${ts(until)} (${Math.ceil(left / 60000)} min), au-delà de cette fenêtre de relève — sortie immédiate`);
    return false;
  }
  if (deadline && Date.now() + left >= deadline) {
    console.log(`${ts()} ${source} a bloqué à ${ts(new Date(b.at))} ; le cooldown court au-delà de l'échéance — on ne le relance pas.`);
    return false;
  }
  console.log(`${ts()} ${source} a bloqué à ${ts(new Date(b.at))} — silence jusqu'à ${ts(until)} (${Math.ceil(left / 60000)} min) avant la moindre requête`);
  await sleep(left);
  return true;
}

const V = r => (r && r.verdict && r.verdict !== 'unknown' ? r.verdict : null);

/**
 * Names socialcal calls available that vervox has not yet answered on.
 *
 * The tries cap is what stops a name from being asked forever. A name vervox
 * cannot settle stays unresolved, so it stays pending, so it comes back as the
 * head of the queue on the next pass — and this queue is spent against the
 * scarcest quota in the project, a couple of requests per window. Without the
 * cap one stubborn name would quietly consume every request and nothing else
 * would ever be confirmed.
 */
function pending() {
  const a = readJsonSafe(P100), b = readJsonSafe(P1000), sc = readJsonSafe(SC);
  const candidates = [], orphans = [];
  for (const [names, res, file] of [[a.usernames, a.results, P100], [b.names, b.results, P1000]])
    for (const u of names) {
      if (V(res[u])) continue;
      if (((res[u] && res[u].tries) || 0) >= MAX_TRIES) continue;
      const s = V(sc.results[u]);
      if (s === 'available') candidates.push({ u, file });
      // Names socialcal never settled in three tries. vervox has never looked at
      // these, because it only ever chased candidates — so they would end up as
      // blanks in the report, with no verdict from any source at all. Worth a
      // look once the candidates are done, never before: a candidate might be a
      // name the user actually claims, while these are, statistically, mostly
      // taken accounts that answer ambiguously because they are deactivated.
      else if (!s) orphans.push({ u, file });
    }
  return candidates.concat(orphans);
}

function record(file, u, res) {
  const s = readJsonSafe(file); // socialcal may have written since
  res.tries = ((s.results[u] && s.results[u].tries) || 0) + 1;
  s.results[u] = res;
  s.checked = Object.keys(s.results).filter(k => s.results[k].verdict !== 'unknown').length;
  if (res.verdict === 'available' && !s.available.includes(u)) s.available.push(u);
  s.updatedAt = new Date().toISOString();
  writeJsonAtomic(file, s);
}

(async () => {
  const claim = claimSingleInstance('vervox');
  if (!claim.ok) {
    console.log(`${ts()} un autre runner vervox tourne déjà (pid ${claim.pid}) — sortie, deux files sur la même source la feraient bloquer`);
    return;
  }

  if (QUIET_UNTIL && Date.now() < QUIET_UNTIL) {
    const mins = Math.ceil((QUIET_UNTIL - Date.now()) / 60000);
    console.log(`${ts()} silent until ${ts(new Date(QUIET_UNTIL))} (${mins} min) — letting the rate-limit window close`);
    await sleep(QUIET_UNTIL - Date.now());
  }

  if (!await respectCooldown('vervox', DEADLINE, RUN_MS)) return;

  const lastGood = (() => {
    let t = 0;
    for (const f of [P100, P1000])
      for (const r of Object.values(readJsonSafe(f).results))
        if (r && r.site === 'vervox' && r.verdict !== 'unknown' && r.checkedAt)
          t = Math.max(t, Date.parse(r.checkedAt));
    return t;
  })();

  // A control is only worth a request while requests are cheap. vervox is now
  // handing out roughly one per window: at 21:56 the control spent it, and the
  // first real check eight minutes later hit the wall. So once the ledger shows
  // the source has been blocking, the control is dropped and its job moves onto
  // the first real answer — which costs nothing extra and proves the same thing.
  //
  // Nothing is weakened by this. A rate-limited reply is detected explicitly and
  // never becomes a verdict, and a verdict is still only recorded when the
  // boolean, the status code and the message all agree. What the control adds is
  // catching an API that answers confidently but wrongly, and the first real
  // answer catches that just as well.
  const blocked = lastBlock('vervox');
  const scarce = blocked && Date.now() - Date.parse(blocked.at) < 24 * 3600000;
  let mustValidate = false;

  if (Date.now() - lastGood < CONTROL_SKIP_MS) {
    console.log(`${ts()} contrôle sauté — vervox a répondu correctement à ${ts(new Date(lastGood))}, même preuve pour moins de quota`);
  } else if (scarce) {
    mustValidate = true;
    console.log(`${ts()} contrôle sauté — vervox a bloqué à ${ts(new Date(blocked.at))} ; un contrôle coûterait la seule requête de la fenêtre. La première vraie réponse en tiendra lieu.`);
  } else {
    // Le contrôle réessaie : un seul échantillon ne prouve rien. Un HTTP 0
    // (bruit réseau ponctuel) a déjà condamné vervox à 180 min à tort le 25/08 —
    // même défaut que celui corrigé pour socialcal. Trois échecs espacés = vrai.
    let c;
    for (let attempt = 1; attempt <= 3; attempt++) {
      c = await checkVervox('instagram');
      console.log(`${ts()} control instagram -> ${c.verdict}${c.error ? ' | ' + c.error : ''}` +
        (c.verdict === 'taken' ? '' : `  essai ${attempt}/3`));
      if (c.verdict === 'taken') break;
      if (attempt < 3) await sleep(60000);
    }
    if (c.verdict !== 'taken') {
      recordBlock('vervox', `contrôle en échec 3x : instagram -> ${c.verdict}`);
      console.error(`${ts()} contrôle en échec 3 fois — vervox ne répond pas correctement, rien n'est enregistré, silence ${Math.round(currentCooldownMs('vervox') / 60000)} min`);
      process.exit(1);
    }
    await sleep(throttle.delay);
  }

  let done = 0, backoffs = 0;
  for (;;) {
    if (DEADLINE && Date.now() >= DEADLINE) { console.log(`${ts()} deadline reached — stopping`); break; }
    if (RUN_MS && Date.now() - STARTED_AT >= RUN_MS) {
      console.log(`${ts()} relève : ${RUN_MS / 60000} min écoulées, sortie propre pour déclencher la reprise`);
      break;
    }
    const list = pending();
    if (!list.length) { console.log(`${ts()} nothing left to confirm`); break; }
    const { u, file } = list[0];

    const res = await checkVervox(u);
    if (res.captcha) { console.log(`${ts()} STOP — ${res.error}`); break; }

    if (res.rateLimited) {
      if (++backoffs > MAX_BACKOFFS) { console.log(`${ts()} rate limited ${backoffs}x — stopping`); break; }
      const change = throttle.record(false);
      console.log(`${ts()} RATE LIMITED at "${u}" (#${backoffs}) — silent ${BACKOFF_MS / 3600000} h` +
        (change ? `, puis ${change.to / 1000}s entre requêtes` : ''));
      if (DEADLINE && Date.now() + BACKOFF_MS >= DEADLINE) {
        console.log(`${ts()} the backoff would run past the deadline — stopping now`);
        break;
      }
      // Same logic against the handover window. Sleeping through it would hold
      // this slot for hours and then exit having done nothing on waking; the
      // block is recorded in the ledger, so the next run waits it out at startup
      // and this one frees the slot immediately.
      if (RUN_MS && Date.now() + BACKOFF_MS >= STARTED_AT + RUN_MS) {
        console.log(`${ts()} le backoff dépasse la fenêtre de relève — sortie immédiate, le blocage est au journal`);
        break;
      }
      await sleep(BACKOFF_MS);
      continue;
    }

    // The dropped control's job, done on the first answer that actually cost a
    // request: a source that replies but cannot produce a coherent verdict is a
    // source we must not record from.
    if (mustValidate) {
      mustValidate = false;
      if (res.verdict === 'unknown') {
        console.error(`${ts()} première réponse inexploitable sur "${u}" (${res.error}) — vervox répond sans trancher, on n'enregistre rien.`);
        process.exit(1);
      }
      console.log(`${ts()} vervox répond correctement (verdict cohérent sur "${u}") — contrôle validé sans requête supplémentaire`);
    }

    record(file, u, res);
    done++;
    const agree = res.verdict === 'available' ? 'CONFIRMÉ' : `contredit socialcal (${res.verdict})`;
    console.log(`${ts()} [vx] ${u} -> ${res.verdict}  ${agree}  | ${list.length - 1} restants`);
    const change = throttle.record(true);
    if (change) console.log(`${ts()} throttle ${change.from / 1000}s -> ${change.to / 1000}s`);
    await sleep(throttle.delay);
  }
  console.log(`${ts()} ${throttle.summary()}`);
  console.log(`${ts()} CONFIRM END — ${done} confirmations, ${backoffs} blocages`);
})();
