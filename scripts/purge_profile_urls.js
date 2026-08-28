/**
 * Retire les `profileUrl` des réponses brutes stockées.
 *
 * Pourquoi. Le dépôt est public, et c'est le dépôt de profil du compte. Chaque
 * réponse socialcal conservée contenait un lien direct vers le compte Instagram
 * d'un tiers — 1100 au total. L'audit n'en a aucun besoin : il vérifie qu'un
 * verdict est corroboré par la présence de `"status":"<verdict>"` dans le corps,
 * et rien d'autre. Ces URL étaient donc de la donnée de tiers publiée sans que
 * personne ne s'en serve.
 *
 * Ce qui reste. Le pseudo lui-même, le statut, le niveau de confiance, l'horodatage.
 * De quoi rejouer la vérification et prouver qu'aucun verdict ne vient d'une
 * erreur — la garantie du projet est intacte.
 *
 * Comment. Suppression par expression régulière sur la chaîne, et non parse puis
 * re-sérialisation. Le corps stocké est la PREUVE : le réécrire, même à
 * l'identique en apparence, changerait des octets que l'audit compare. On retire
 * la paire clé-valeur et on ne touche à rien d'autre.
 *
 *   node scripts/purge_profile_urls.js            montre ce qui serait retiré
 *   node scripts/purge_profile_urls.js --appliquer applique et réécrit
 */
const fs = require('fs');
const path = require('path');
const { writeJsonAtomic, readJsonSafe } = require('./safe.js');
const { ts } = require('./time.js');

const REPO = path.join(__dirname, '..');
const FICHIERS = ['socialcal.json', 'progress.json', 'progress_1000.json', 'dnsrobot.json'];
const APPLIQUER = process.argv.includes('--appliquer');

// Retire "profileUrl":"..." avec la virgule qui l'accroche, quelle que soit sa
// position dans l'objet. Les deux formes sont couvertes : précédée d'une virgule,
// ou suivie d'une virgule quand elle ouvre l'objet.
const RE = /,?"profileUrl":"[^"]*"(,)?/g;
const retire = s => s.replace(RE, (m, virguleApres) => (m.startsWith(',') && virguleApres) ? ',' : (virguleApres ? ',' : ''));

let totalTrouves = 0, totalFichiers = 0;

for (const f of FICHIERS) {
  const p = path.join(REPO, f);
  if (!fs.existsSync(p)) continue;
  const data = readJsonSafe(p);
  if (!data || !data.results) continue;

  let n = 0;
  for (const [u, r] of Object.entries(data.results)) {
    if (!r || typeof r.api !== 'string' || !r.api.includes('profileUrl')) continue;
    const avant = r.api;
    const apres = retire(avant);
    if (apres === avant) continue;
    n++;
    if (n === 1) {
      console.log(`\n${f} — exemple sur « ${u} » :`);
      console.log(`   avant : ${avant.slice(0, 150)}`);
      console.log(`   après : ${apres.slice(0, 150)}`);
    }
    if (APPLIQUER) r.api = apres;
  }

  if (n) {
    totalTrouves += n;
    totalFichiers++;
    console.log(`${f} : ${n} profileUrl`);
    if (APPLIQUER) writeJsonAtomic(p, data);
  }
}

console.log(`\n${ts()} ${totalTrouves} profileUrl dans ${totalFichiers} fichier(s)`);
if (!APPLIQUER) {
  console.log('Aucune écriture. Relancer avec --appliquer pour retirer,');
  console.log('puis vérifier que l\'audit passe toujours : node scripts/audit.js');
} else {
  console.log('Retirés. Lancer maintenant : node scripts/audit.js');
}
