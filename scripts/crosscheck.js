/**
 * Runs the second source (socialcal) over the username lists, writing to its own
 * file so it never races the vervox drip that is writing progress*.json.
 *
 * Priority order, most valuable first:
 *   1. names vervox called "available"  — these are the ones the user would
 *      actually claim, and they currently rest on a single source
 *   2. names vervox called "taken"      — cheap disagreement detector
 *   3. names vervox has not reached yet — extra coverage on a separate quota
 */
const fs = require('fs');
const path = require('path');
const { checkSocialcal, sleep } = require('./socialcal_api.js');
const { writeJsonAtomic, readJsonSafe, assertUsername, claimSingleInstance } = require('./safe.js');

const REPO = path.join(__dirname, '..');
const OUT = path.join(REPO, 'socialcal.json');

const DELAY_MS = +(process.env.SC_DELAY_MS || 60000);
const MAX_DELAY_MS = +(process.env.SC_MAX_DELAY_MS || 300000);
const BACKOFF_MS = +(process.env.SC_BACKOFF_MS || 15 * 60000);
// Hard stop, so an unattended overnight run always leaves time to publish.
const DEADLINE = process.env.DEADLINE ? Date.parse(process.env.DEADLINE) : 0;
const MAX_BACKOFFS = +(process.env.SC_MAX_BACKOFFS || 3);
const LIMIT = +(process.env.SC_LIMIT || 0); // 0 = no cap
// Bounded runs, on purpose. Twice now the runners have been killed with no
// notification at all — the harness simply lost them, and the loss was only
// discovered hours later by looking. A run that ends *itself* exits cleanly, and
// a clean exit produces a completion notification that wakes the session to
// start the next stretch. Silent death becomes a scheduled handover; progress is
// checkpointed after every name, so a handover costs nothing.
const RUN_MS = +(process.env.RUN_MINUTES || 0) * 60000;
const STARTED_AT = Date.now();
// Some names come back "unknown/medium" every time. Retry a few times, then
// accept the indeterminate answer instead of looping on it forever.
const MAX_TRIES = +(process.env.SC_MAX_TRIES || 3);
// Reprise des « unknown » laissés par une panne de la source (voir SOURCES.md,
// amont épuisé le 23/08 puis rétabli le 28/08). Deux choses en dépendent, et il
// faut les deux : la file doit reprendre ces noms, et le throttle doit cesser de
// les traiter comme des noms réglés du premier coup.
const RETRY_UNKNOWN = process.env.RETRY_UNKNOWN === '1';
// Essais effectués pendant CE run, par pseudo. Le compteur persistant
// (results[u].tries) décrit l'historique, y compris celui d'une panne ; celui-ci
// décrit la session en cours, seule mesure honnête de « ce nom résiste-t-il à une
// source aujourd'hui saine ».
const RUN_TRIES = new Map();
const runTries = u => RUN_TRIES.get(u) || 0;
// The integrity control retries too: one transient miss is not proof a source
// is down, and treating it as proof cost three hours of silence on 22 August.
const CONTROL_TRIES = +(process.env.SC_CONTROL_TRIES || 3);
const CONTROL_RETRY_MS = +(process.env.SC_CONTROL_RETRY_MS || 90000);

const readJson = readJsonSafe;
const { ts } = require('./time.js');
const { Throttle } = require('./throttle.js');
const { remainingMs, lastBlock, recordBlock, currentCooldownMs } = require('./cooldown.js');

// 60 s is the cadence this source was answering well at; it is the floor.
const throttle = new Throttle({ min: DELAY_MS, max: MAX_DELAY_MS });

const store = fs.existsSync(OUT) ? readJson(OUT) : { results: {}, updatedAt: null };
const save = () => {
  store.updatedAt = new Date().toISOString();
  writeJsonAtomic(OUT, store);
};


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

/** Rebuilt each pass: the vervox drip keeps adding verdicts underneath us. */
function workList() {
  const p100 = readJson(path.join(REPO, 'progress.json'));
  const p1000 = readJson(path.join(REPO, 'progress_1000.json'));
  const all = [...p100.usernames, ...p1000.names];
  const verdict = u => {
    const r = p100.results[u] || p1000.results[u];
    return r ? r.verdict : null;
  };
  // MAX_TRIES épuisé veut dire « la source ne tranchait pas ce jour-là », pas
  // « ce pseudo est intranchable ». L'amont de socialcal s'est épuisé le 23/08 et
  // a récupéré depuis : les 174 « unknown » de cette période sont des victimes de
  // la panne, pas des cas durs. RETRY_UNKNOWN=1 les remet dans la file. Un
  // « unknown » reste un « unknown » — on ne fait que redemander, jamais promouvoir.
  const done = u => {
    const r = store.results[u];
    if (!r) return false;
    if (r.verdict !== 'unknown') return true;
    // Sous RETRY_UNKNOWN, le compteur historique ne décide plus : ces noms ont
    // épuisé leurs essais pendant la panne du 23/08, pas contre une source
    // saine. Ils repartent avec un budget neuf, compté sur CE run seulement,
    // pour que la reprise ne devienne pas une boucle sans fin sur les mêmes.
    if (RETRY_UNKNOWN) return runTries(u) >= MAX_TRIES;
    return (r.tries || 1) >= MAX_TRIES;
  };
  // Cross-checking a vervox "taken" is the least useful thing this can do: the
  // two sources have never once disagreed in that direction, while every
  // disagreement so far has been vervox calling a taken name available. So
  // "taken" sinks to the bottom, behind names nobody has looked at yet.
  // The 100 list has to be covered in full; the 1000 list only needs enough
  // names to reach the target, so it yields within an equal tier.
  const in100 = new Set(p100.usernames);
  const tier = u => {
    const v = verdict(u);
    if (v === 'available') return 0;
    if (v === 'taken') return 3;
    return in100.has(u) ? 1 : 2;
  };
  // Breadth first: every name gets a first look before any name gets a second.
  //
  // Retrying an indeterminate name immediately costs about 2.4 requests per
  // settled name, which is why the effective rate is 143 s rather than the 60 s
  // floor. That trade is fine with unlimited time and wrong against a deadline:
  // it would leave a few hundred names looked at three times and several hundred
  // never looked at at all. Coverage first, second opinions with what is left.
  // Même piège que pour le throttle : sous RETRY_UNKNOWN, le compteur persistant
  // vaut 3+ pour TOUS les noms de la file, donc « déjà regardé » ne distingue plus
  // rien, le tri stable garde le même nom en tête et le runner le réinterroge
  // jusqu'à épuisement avant de passer au suivant. C'est le comportement en
  // profondeur que ce bloc dit justement d'éviter. Le budget du run rétablit le
  // parcours en largeur : un premier tour complet, les seconds avis ensuite.
  const tries = u => (RETRY_UNKNOWN
    ? runTries(u)
    : (store.results[u] && store.results[u].tries) || 0);
  const rank = u => (tries(u) > 0 ? 1000 : 0) + tier(u) * 2 + (in100.has(u) ? 0 : 1);
  return all.filter(u => !done(u)).sort((a, b) => rank(a) - rank(b));
}

(async () => {
  const claim = claimSingleInstance('socialcal');
  if (!claim.ok) {
    console.log(`${ts()} un autre runner socialcal tourne déjà (pid ${claim.pid}) — sortie, deux files sur la même source la feraient bloquer`);
    return;
  }

  let backoffs = 0, checks = 0;
  if (!await respectCooldown('socialcal', DEADLINE, RUN_MS)) return;
  console.log(`${ts()} SOCIALCAL START — plancher ${DELAY_MS / 1000}s, plafond ${MAX_DELAY_MS / 1000}s` + (DEADLINE ? `, deadline ${ts(new Date(DEADLINE))}` : ''));

  // Integrity gate, both directions, before anything is recorded.
  //
  // Retried, because a single sample is not evidence. On 22 August the negative
  // control failed at 16:32 and the source answered it correctly three minutes
  // later — one transient miss had condemned socialcal to a three-hour silence
  // it did not need. Everywhere else this system retries before concluding; the
  // control is the most consequential decision it makes, so it retries too.
  // A source that misses the same control three times, spaced, really is down.
  for (const [u, want] of [['instagram', 'taken'], ['zqv7xkq9wzqjj4', 'available']]) {
    let r;
    for (let attempt = 1; attempt <= CONTROL_TRIES; attempt++) {
      r = await checkSocialcal(u);
      console.log(`${ts()} control ${u} -> ${r.verdict} (attendu ${want})` +
        (r.verdict === want ? '' : `  essai ${attempt}/${CONTROL_TRIES}`));
      if (r.verdict === want) break;
      if (attempt < CONTROL_TRIES) await sleep(CONTROL_RETRY_MS);
    }
    if (r.verdict !== want) {
      // Recorded, not just logged: a source that cannot pass its own control is
      // refusing us, and without this the next restart walks straight back into
      // the same failure. The wait doubles on each repeat.
      recordBlock('socialcal', `contrôle en échec ${CONTROL_TRIES}x : ${u} -> ${r.verdict}`);
      console.error(`${ts()} contrôle en échec ${CONTROL_TRIES} fois (${u} -> ${r.verdict}, attendu ${want}) — rien n'est enregistré, silence ${Math.round(currentCooldownMs('socialcal') / 60000)} min`);
      process.exit(1);
    }
    await sleep(throttle.delay);
  }

  for (;;) {
    if (DEADLINE && Date.now() >= DEADLINE) { console.log(`${ts()} deadline reached — stopping`); break; }
    if (RUN_MS && Date.now() - STARTED_AT >= RUN_MS) {
      console.log(`${ts()} relève : ${RUN_MS / 60000} min écoulées, sortie propre pour déclencher la reprise`);
      break;
    }
    const list = workList();
    if (!list.length) { console.log(`${ts()} nothing left to cross-check`); break; }
    if (LIMIT && checks >= LIMIT) { console.log(`${ts()} limit ${LIMIT} reached`); break; }

    const u = list[0];
    const res = await checkSocialcal(u);

    if (res.rateLimited) {
      if (++backoffs > MAX_BACKOFFS) { console.log(`${ts()} rate limited ${backoffs}x — stopping`); break; }
      console.log(`${ts()} RATE LIMITED at "${u}" (#${backoffs}) — silent ${BACKOFF_MS / 60000} min`);
      if (RUN_MS && Date.now() + BACKOFF_MS >= STARTED_AT + RUN_MS) {
        console.log(`${ts()} le backoff dépasse la fenêtre de relève — sortie immédiate, le blocage est au journal`);
        break;
      }
      await sleep(BACKOFF_MS);
      continue;
    }

    // Une réponse servie depuis le cache amont ET sans verdict ne changera pas
    // tant que ce cache n'expire pas : la redemander dans le même run dépense
    // 60 s pour obtenir le même octet. Mesuré le 28/08 : 5 requêtes sur 40.
    // On épuise donc son budget d'essais d'un coup, ce qui la sort de la file
    // sans rien promouvoir — elle reste « unknown » dans le magasin, et un run
    // ultérieur, cache expiré, la reprendra normalement.
    //
    // Un cache qui porte un verdict reste utile et n'est pas concerné : sur les
    // mêmes 40 requêtes, une réponse en cache a répondu « taken ».
    if (res.cached && res.verdict === 'unknown') {
      RUN_TRIES.set(u, MAX_TRIES);
      console.log(`${ts()} [sc] ${u} -> unknown (cache amont) — inutile de réessayer ce run`);
      store.results[u] = { ...res, tries: ((store.results[u] && store.results[u].tries) || 0) + 1 };
      save();
      checks++;
      await sleep(throttle.delay);
      continue;
    }

    RUN_TRIES.set(u, runTries(u) + 1);
    res.tries = ((store.results[u] && store.results[u].tries) || 0) + 1;
    store.results[u] = res;
    save();
    checks++;
    console.log(`${ts()} [sc] ${u} -> ${res.verdict}${res.cached ? ' (cached)' : ''}${res.error ? ' | ' + res.error : ''}  | ${list.length - 1} left`);

    // One sample per NAME, taken when that name is finished with — not one per
    // request. Many names answer "unknown/medium" once or twice and then give a
    // firm verdict; counting each of those attempts as a miss describes the name,
    // not the service. Measured over 1353 requests: the throttle was reading a
    // 62% miss rate while the service's real per-name failure rate was 12%, and
    // 264 names had resolved on a retry. That false signal had dragged the
    // cadence from 60s to its 300s ceiling overnight — a fivefold slowdown
    // caused by the runner misreading its own retries.
    // Sous RETRY_UNKNOWN, res.tries vaut déjà 3 ou plus dès la première tentative
    // (ces noms traînent le compteur de la panne du 23/08). Le lire ici ferait
    // exactement l'erreur décrite au-dessus : chaque premier essai compterait
    // comme un nom réglé, et comme la file ne contient QUE les noms les plus durs,
    // le throttle lirait un taux d'échec voisin de 100 % et grimperait aussitôt à
    // son plafond. C'est ce qui s'est produit le 28/08 à 12:01, 153 s -> 246 s.
    // Le budget du run est la seule mesure valable pour cette décision.
    const attempts = RETRY_UNKNOWN ? runTries(u) : res.tries;
    const settled = res.verdict !== 'unknown' || attempts >= MAX_TRIES;
    if (settled) {
      const change = throttle.record(res.verdict !== 'unknown');
      if (change) {
        console.log(`${ts()} throttle ${change.from / 1000}s -> ${change.to / 1000}s (${Math.round(change.missRate * 100)}% de pseudos sans verdict)`);
      }
    }
    if (throttle.exhausted()) {
      console.log(`${ts()} slowing down stopped helping — pausing ${BACKOFF_MS / 60000} min to let the source recover`);
      await sleep(BACKOFF_MS);
      throttle.delay = throttle.min;
    }
    await sleep(throttle.delay);
  }

  const v = Object.values(store.results);
  console.log(`${ts()} ${throttle.summary()}`);
  console.log(`${ts()} SOCIALCAL END — ${checks} checks this run, ${v.length} stored ` +
    `(${v.filter(r => r.verdict === 'available').length} available, ` +
    `${v.filter(r => r.verdict === 'taken').length} taken, ` +
    `${v.filter(r => r.verdict === 'unknown').length} unknown)`);
})();
