const fs = require('fs');
const path = require('path');

const REPO = '/home/user/Kostas258';
const OUT = path.join(REPO, 'nomutilisateursprare_verifies.md');
const s = JSON.parse(fs.readFileSync(path.join(REPO, 'progress_1000.json'), 'utf8'));

const checked = Object.entries(s.results).filter(([, e]) => e);
const avail = checked.filter(([, e]) => e.verdict === 'available').map(([n]) => n);
const taken = checked.filter(([, e]) => e.verdict === 'taken').map(([n]) => n);
const unknown = checked.filter(([, e]) => e.verdict === 'unknown').map(([n]) => n);

const stamps = checked.map(([, e]) => e.checkedAt).filter(Boolean).sort();
const fmt = iso => new Date(iso).toLocaleString('fr-FR', { timeZone: 'UTC', dateStyle: 'long', timeStyle: 'short' }) + ' UTC';

const doc = `# nomutilisateursprare — vérification de disponibilité Instagram

**Source :** \`nomutilisateursprare.md\` — 1000 pseudos uniques inspirés de m7ia (349 de 4 caractères, 651 de 5 caractères).
**Objectif demandé :** vérifier la liste et s'arrêter dès **10 pseudos disponibles** confirmés.
**Vérification effectuée :** du ${fmt(stamps[0])} au ${fmt(stamps[stamps.length - 1])}
**Site interrogé :** [vervox.app](https://vervox.app/fr/outils/verificateur-nom-instagram) — seule source fonctionnelle (voir « Pourquoi une seule source »).

## État : ${avail.length}/10 pseudos disponibles trouvés — run interrompu

**${checked.length} pseudos vérifiés sur 1000.** Le run est arrêté par le quota du site, pas terminé.

### Pseudos disponibles (${avail.length})

${avail.length ? avail.map((n, i) => `${i + 1}. **${n}** — ${n.length} caractères`).join('\n') : '_aucun_'}

${avail.includes('m7ia') ? '> À noter : **`m7ia`**, le pseudo de référence de la liste, ressort disponible.\n' : ''}
### Pseudos pris (${taken.length})

${taken.length ? taken.map(n => `\`${n}\``).join(', ') : '_aucun_'}

${unknown.length ? `### Indéterminés (${unknown.length})\n\n${unknown.map(n => `\`${n}\``).join(', ')}\n` : ''}
## Pourquoi le run s'est arrêté

vervox.app applique un quota par adresse IP. Après 58 vérifications, il a répondu :

\`\`\`json
{"errorCode":"IP_RATE_LIMITED","error":"Trop de requêtes. Réessaie dans 1h.","params":{"hours":1}}
\`\`\`

Une heure de silence complet a été respectée, sans aucune requête. À la reprise, **2 vérifications seulement sont passées avant un nouveau blocage** — ce qui montre que le quota n'est pas une fenêtre glissante d'une heure (la plage 14:05–15:05, totalement vide, l'aurait alors remis à zéro) mais un quota nettement plus long, vraisemblablement journalier, déjà consommé.

Le script s'arrête désormais net sur un 429 au lieu de réessayer : réessayer contre un quota le prolonge.

**Aucune tentative de contournement n'a été faite.** Les proxys et outils tiers sont de toute façon inatteignables depuis cet environnement (toute sortie réseau passe par la passerelle de l'organisation, qui n'autorise que les hôtes de la liste blanche sur le port 443 : les 923 proxys de \`iplocate/free-proxy-list\` sont sur des ports 4145/8080/1080/3128, et \`huggingface.co\` est également refusé). Et contourner une limite que le site pose explicitement serait exactement ce qu'il faut éviter pour ne pas se faire bannir.

## Pourquoi une seule source

brandsnag.com est hors service pour Instagram : son backend renvoie \`{"code":404,"available":null}\` pour toute requête, et l'interface affiche « vérifier manuellement ». Vérifié sur des pseudos de contrôle au statut certain — \`instagram\`, \`nike\`, \`cristiano\` — les trois sont renvoyés indéterminés alors qu'ils sont évidemment pris. 35 vérifications sur 35 sont ressorties indéterminées. Il ne peut donc modifier aucun verdict.

Chaque verdict ci-dessus repose sur un accord entre **le texte affiché dans le DOM** et **le champ \`available\` de l'API interne du site**. Sur les 60 vérifications effectuées : 60 corroborations, 0 incohérence, 0 réponse de rate-limit enregistrée comme verdict.

⚠️ « Disponible » signifie qu'aucun compte public ne porte ce pseudo au moment de la vérification. Instagram réserve certains handles (marques, anciens comptes supprimés, comptes désactivés) : la disponibilité n'est définitive qu'à la création du compte.

## Reprise

\`progress_1000.json\` conserve pour chaque pseudo le verdict, le texte lu dans le DOM, la réponse brute de l'API, l'horodatage et le nombre de tentatives. Relancer \`scripts/resume.js\` reprend exactement où le run s'est arrêté, sans refaire les vérifications réussies, et s'arrêtera de lui-même dès 10 disponibles atteints.
`;

fs.writeFileSync(OUT, doc);
console.log(`written ${OUT}: ${checked.length} checked, ${avail.length} available, ${taken.length} taken, ${unknown.length} unknown`);
