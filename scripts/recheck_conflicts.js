/**
 * Réinterroge les deux sources sur les pseudos où elles se contredisent.
 *
 * Pourquoi ce n'est pas un arbitrage. On ne choisit pas un camp : on redemande.
 * Si les deux réponses fraîches concordent, la contradiction n'existe plus —
 * elle venait d'une mesure vieille, pas d'un désaccord de fond. Si elles
 * divergent encore, le pseudo reste « contradiction ». Aucune règle ne promeut
 * l'un des deux verdicts.
 *
 * Pourquoi ça vaut le coup. Les 15 contradictions du 28/08 datent toutes de
 * ~8 jours, et les deux clients ont changé depuis : lecture de Retry-After,
 * distinction 403/429, retrait des réponses en cache. Une mesure d'il y a huit
 * jours n'engage pas la source d'aujourd'hui.
 *
 * Ce que le sens du désaccord dit déjà. Les 15 vont dans la même direction —
 * vervox « disponible », socialcal « pris ». Un désaccord aléatoire se
 * répartirait dans les deux sens ; 15 sur 15 dans le même désigne un biais
 * systématique, celui que SOURCES.md documente sur vervox. Cela ne suffit pas à
 * trancher, et ce script ne s'en sert pas pour trancher — mais c'est la raison
 * de commencer par redemander à vervox.
 *
 *   node scripts/recheck_conflicts.js socialcal
 *   node scripts/recheck_conflicts.js vervox
 *
 * Respecte le cooldown de la source et sort si elle est en silence.
 */
const path = require('path');
const { writeJsonAtomic, readJsonSafe } = require('./safe.js');
const { remainingMs } = require('./cooldown.js');
const { ts } = require('./time.js');

const REPO = path.join(__dirname, '..');
const read = f => readJsonSafe(path.join(REPO, f));
const V = r => (r && r.verdict && r.verdict !== 'unknown' ? r.verdict : null);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const SOURCE = process.argv[2];
if (!['socialcal', 'vervox'].includes(SOURCE)) {
  console.error('usage : node scripts/recheck_conflicts.js socialcal|vervox');
  process.exit(2);
}

// Plancher mesuré de chaque source. Ne jamais descendre : 70 s, 105 s et 339 s
// ont chacun coûté trois heures de silence à vervox.
const DELAY_MS = +(process.env.DELAY_MS || (SOURCE === 'vervox' ? 600000 : 60000));

const check = SOURCE === 'vervox'
  ? require('./vervox_api.js').checkVervox
  : require('./socialcal_api.js').checkSocialcal;

(async () => {
  const wait = remainingMs(SOURCE);
  if (wait > 0) {
    console.log(`${ts()} ${SOURCE} en silence encore ${Math.ceil(wait / 60000)} min — rien fait`);
    process.exit(1);
  }

  const a = read('progress.json'), b = read('progress_1000.json');
  const sc = read('socialcal.json').results;
  const vx = { ...a.results, ...b.results };

  const conflits = [];
  for (const u of [...a.usernames, ...b.names]) {
    const v = V(vx[u]), s = V(sc[u]);
    if (v && s && v !== s) conflits.push({ u, vervox: v, socialcal: s });
  }

  if (!conflits.length) { console.log(`${ts()} aucune contradiction`); return; }
  console.log(`${ts()} ${conflits.length} contradictions, nouvelle mesure via ${SOURCE} ` +
              `(${DELAY_MS / 1000} s entre requêtes)`);

  // Chaque source écrit dans son propre fichier, comme le reste du projet :
  // deux runners ne doivent jamais se disputer un même JSON.
  const cible = SOURCE === "socialcal"
    ? { file: 'socialcal.json', key: null }
    : null;

  let resolus = 0, persistants = 0, muets = 0;

  for (const { u, vervox, socialcal } of conflits) {
    const r = await check(u);

    if (r.verdict === 'unknown') {
      muets++;
      console.log(`${ts()} ${u} : ${SOURCE} ne tranche pas (${r.error || 'sans motif'}) — inchangé`);
    } else {
      const avant = SOURCE === 'vervox' ? vervox : socialcal;
      const autre = SOURCE === 'vervox' ? socialcal : vervox;
      if (r.verdict === autre) {
        resolus++;
        console.log(`${ts()} ${u} : ${SOURCE} dit maintenant « ${r.verdict} » ` +
                    `(avant « ${avant} ») — RÉSOLU, les deux sources concordent`);
      } else {
        persistants++;
        console.log(`${ts()} ${u} : ${SOURCE} maintient « ${r.verdict} » — contradiction persistante`);
      }

      // Écriture uniquement pour socialcal ici : le fichier vervox est réparti
      // entre progress.json et progress_1000.json, et un runner confirm.js peut
      // écrire dedans en même temps. Pour vervox, on mesure et on rapporte ;
      // l'enregistrement passe par son propre runner, qui tient le verrou.
      if (cible) {
        const store = read(cible.file);
        store.results[u] = { ...r, tries: ((store.results[u] && store.results[u].tries) || 0) + 1 };
        store.updatedAt = new Date().toISOString();
        writeJsonAtomic(path.join(REPO, cible.file), store);
      }
    }

    if (r.rateLimited) {
      console.log(`${ts()} ${SOURCE} bloque — arrêt, le blocage est au journal`);
      break;
    }
    await sleep(DELAY_MS);
  }

  // Trace du passage. Indispensable côté vervox : cette remesure n'écrit pas
  // dans progress*.json — le verrou y appartient à confirm.js — donc rien
  // n'indiquerait au contrôleur qu'elle a eu lieu, et il la reproposerait à
  // chaque relève. Quinze requêtes vervox et deux heures et demie pour
  // réapprendre ce qu'on vient d'apprendre.
  const marqueur = path.join(REPO, 'recheck_state.json');
  const etat = readJsonSafe(marqueur) || {};
  etat[SOURCE] = {
    at: new Date().toISOString(),
    conflits: conflits.length, resolus, persistants, muets,
  };
  writeJsonAtomic(marqueur, etat);

  console.log(`\n${ts()} ${resolus} résolus, ${persistants} persistants, ${muets} sans réponse`);
  if (SOURCE === 'vervox' && (resolus || persistants)) {
    console.log(`${ts()} mesure seule : les verdicts vervox ne sont pas réécrits ici, ` +
                `confirm.js tient le verrou sur progress*.json`);
  }
})();
