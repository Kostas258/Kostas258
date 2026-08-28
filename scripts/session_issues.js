/**
 * Détecteur de « faux terminé ».
 *
 * Ce script n'existe pas par goût du diagnostic : chacune de ses règles vient
 * d'une panne réelle de la session du 27-28 août, où le système s'est déclaré
 * fini alors qu'il ne l'était pas. audit.js vérifie que les verdicts enregistrés
 * sont honnêtes. Celui-ci vérifie l'inverse : que le travail NON fait est bien
 * visible, et qu'aucun silence n'est en train de passer pour un achèvement.
 *
 * Les règles, et l'incident dont chacune est tirée :
 *
 *   1. Source réputée finie alors que ses « unknown » viennent d'une panne.
 *      socialcal s'est épuisé le 23/08 en laissant 174 pseudos indéterminés.
 *      MAX_TRIES étant atteint, la file les comptait comme réglés et annonçait
 *      « plus rien à vérifier ». J'ai rapporté « socialcal a fini » pendant cinq
 *      jours. C'était faux : sa sonde du 28/08 répondait normalement.
 *
 *   2. Source muette depuis longtemps, sans blocage au journal.
 *      Corollaire du 1 : un silence prolongé qui n'est pas un cooldown est un
 *      arrêt oublié, pas un achèvement.
 *
 *   3. Cadence descendue sous le plancher mesuré.
 *      70 s, 105 s et 339 s ont chacun provoqué un blocage de 3 h. 480 s et
 *      600 s tiennent. Une cadence sous le plancher connu est une régression.
 *
 *   4. Verrou d'instance périmé.
 *      Un runner tué laisse un fichier pid ; safe.js l'ignore si le pid est
 *      mort, mais un verrou périmé qui traîne masque l'état réel.
 *
 *   5. Contradictions non traitées.
 *      Elles ne doivent jamais être arbitrées en silence, donc elles doivent
 *      rester comptées et visibles jusqu'à décision explicite.
 *
 * Sortie : texte lisible, et code de sortie 1 s'il reste un problème ouvert,
 * pour qu'un enchaînement de scripts s'arrête dessus.
 */
const fs = require('fs');
const path = require('path');
const { ts } = require('./time.js');

const REPO = path.join(__dirname, '..');
const read = f => JSON.parse(fs.readFileSync(path.join(REPO, f), 'utf8'));
const V = r => (r && r.verdict && r.verdict !== 'unknown' ? r.verdict : null);

// Planchers mesurés, en secondes. Toute cadence inférieure a bloqué au moins
// une fois. Ce ne sont pas des préférences : ce sont des observations.
const FLOOR_S = { vervox: 480, socialcal: 60 };
// Au-delà, une source sans appel n'est plus « en cours » mais « oubliée ».
const STALE_H = +(process.env.STALE_HOURS || 24);

const issues = [];
const notes = [];
const add = (gravite, titre, detail, action) =>
  issues.push({ gravite, titre, detail, action });

// ── données ───────────────────────────────────────────────────────────────
const p100 = read('progress.json');
const p1000 = read('progress_1000.json');
const sc = read('socialcal.json');
const blocks = (() => { try { return read('blocks.json'); } catch { return { blocks: {} }; } })();

const vervoxResults = { ...p100.results, ...p1000.results };
const scResults = sc.results;
const allNames = [...p100.usernames, ...p1000.names];

const lastCall = results => Object.values(results)
  .map(r => r && r.checkedAt).filter(Boolean).sort().pop() || null;

const SOURCES = {
  vervox: { results: vervoxResults, last: lastCall(vervoxResults) },
  socialcal: { results: scResults, last: lastCall(scResults) },
};

// ── règle 1 : « unknown » figés, source pourtant vivante ───────────────────
for (const [name, src] of Object.entries(SOURCES)) {
  const unknown = Object.entries(src.results)
    .filter(([, r]) => r && r.verdict === 'unknown');
  const exhausted = unknown.filter(([, r]) => (r.tries || 1) >= 3);
  if (!exhausted.length) continue;

  // Un « unknown » épuisé n'est un problème que si les essais se sont
  // concentrés sur une courte période : c'est la signature d'une panne de la
  // source, pas celle de pseudos durs rencontrés au fil de l'eau.
  const dates = exhausted.map(([, r]) => r.checkedAt).filter(Boolean).sort();
  const span = dates.length > 1
    ? (Date.parse(dates[dates.length - 1]) - Date.parse(dates[0])) / 3600000
    : 0;

  // Un diagnostic qui alerte sur ce qu'on est en train de réparer est un
  // diagnostic qu'on apprend à ignorer. Si l'un de ces noms a été réinterrogé
  // dans l'heure, la reprise tourne : c'est du travail en cours, pas un état
  // figé. La distinction porte sur les noms eux-mêmes, pas sur l'activité de la
  // source en général — celle-ci pourrait très bien travailler ailleurs.
  const frais = Date.parse(dates[dates.length - 1]) > Date.now() - 3600000;
  if (frais) {
    notes.push(`${name} : ${exhausted.length} « indéterminés » en cours de reprise ` +
               `(dernier réessai il y a moins d'une heure) — suivi, pas signalé`);
    continue;
  }

  add(exhausted.length > 50 ? 'BLOQUANT' : 'à surveiller',
    `${name} : ${exhausted.length} pseudos « indéterminés » à essais épuisés, sans reprise en cours`,
    `Étalés sur ${span.toFixed(1)} h (du ${dates[0]} au ${dates[dates.length - 1]}), ` +
    `aucun réessai depuis plus d'une heure. Un épuisement groupé désigne une ` +
    `indisponibilité de la source, pas des pseudos difficiles. Tant qu'ils comptent ` +
    `comme réglés, la file annonce « plus rien à vérifier » à tort.`,
    `Sonder la source sur un de ces noms. Si elle répond, relancer avec RETRY_UNKNOWN=1.`);
}

// ── règle 2 : source muette sans blocage déclaré ───────────────────────────
for (const [name, src] of Object.entries(SOURCES)) {
  if (!src.last) { add('BLOQUANT', `${name} : jamais appelée`, 'Aucun checkedAt.', 'Vérifier la configuration.'); continue; }
  const hours = (Date.now() - Date.parse(src.last)) / 3600000;
  const blocked = blocks.blocks && blocks.blocks[name];
  if (hours > STALE_H && !blocked) {
    add('BLOQUANT',
      `${name} : muette depuis ${hours.toFixed(1)} h, sans blocage au journal`,
      `Dernier appel ${src.last}. Aucune entrée dans blocks.json, donc ce silence ` +
      `n'est pas un cooldown : c'est un arrêt que personne n'a repris.`,
      `Relancer la source, ou consigner pourquoi elle est arrêtée.`);
  } else {
    notes.push(`${name} : dernier appel il y a ${hours.toFixed(1)} h` + (blocked ? ' (blocage au journal)' : ''));
  }
}

// ── règle 3 : cadence sous le plancher mesuré ──────────────────────────────
for (const [name, floor] of Object.entries(FLOOR_S)) {
  const env = name === 'vervox' ? process.env.DELAY_MS : process.env.SC_DELAY_MS;
  if (!env) continue;
  const s = +env / 1000;
  if (s < floor) {
    add('BLOQUANT', `${name} : cadence ${s} s sous le plancher mesuré de ${floor} s`,
      `Chaque descente sous ce plancher a coûté un blocage de 3 h (70 s, 105 s, 339 s).`,
      `Remonter à ${floor} s au minimum.`);
  }
}

// ── règle 4 : verrou d'instance périmé ─────────────────────────────────────
for (const name of Object.keys(SOURCES)) {
  const lock = `/tmp/kostas-${name}.pid`;
  if (!fs.existsSync(lock)) continue;
  const pid = parseInt(fs.readFileSync(lock, 'utf8'), 10);
  let vivant = true;
  try { process.kill(pid, 0); } catch { vivant = false; }
  if (!vivant) {
    add('à surveiller', `${name} : verrou périmé (pid ${pid} mort)`,
      `${lock} référence un processus disparu.`,
      `safe.js le reprendra tout seul ; le supprimer si l'état affiché doit être net.`);
  } else {
    notes.push(`${name} : runner actif, pid ${pid}`);
  }
}

// ── règle 5 : contradictions et non vérifiés ───────────────────────────────
let conflicts = 0, never = 0, pending = 0;
for (const u of allNames) {
  const v = V(vervoxResults[u]), s = V(scResults[u]);
  if (v && s && v !== s) conflicts++;
  else if (!vervoxResults[u] && !scResults[u]) never++;
  else if (!v || !s) pending++;
}
if (conflicts) {
  add('à surveiller', `${conflicts} contradictions entre sources`,
    `Deux sources en désaccord. Aucune n'est arbitrée automatiquement, c'est voulu.`,
    `Les laisser en « contradiction » tant qu'une troisième preuve ne tranche pas.`);
}
if (never) {
  add('BLOQUANT', `${never} pseudos jamais interrogés`,
    `Ni vervox ni socialcal ne les a vus.`,
    `Ils doivent apparaître « non vérifié », jamais « libre ».`);
}
notes.push(`${pending} pseudos tranchés par une seule source (travail restant, pas une anomalie)`);

// ── rapport ───────────────────────────────────────────────────────────────
console.log(`${ts()} ── diagnostic « faux terminé » ──\n`);
const bloquants = issues.filter(i => i.gravite === 'BLOQUANT');
for (const i of issues) {
  console.log(`[${i.gravite}] ${i.titre}`);
  console.log(`   ${i.detail}`);
  console.log(`   → ${i.action}\n`);
}
if (!issues.length) console.log('Aucun problème ouvert détecté.\n');
console.log('── contexte ──');
for (const n of notes) console.log(`   ${n}`);
console.log(`\n${issues.length} problème(s), dont ${bloquants.length} bloquant(s).`);
process.exit(bloquants.length ? 1 : 0);
