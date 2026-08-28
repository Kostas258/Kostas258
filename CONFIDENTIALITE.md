# Données de tiers dans ce dépôt

Ce dépôt est **public**, et c'est le dépôt de profil du compte : ce qui y est
écrit est visible de tous et rattaché à une identité. Ce document dit exactement
quelles données de tiers y figurent, pourquoi, et ce qui a été retiré.

## Ce qui est conservé

| Donnée | Volume | Pourquoi |
|---|---|---|
| Pseudos Instagram et leur statut | 1100 | c'est l'objet même du projet |
| Statut, niveau de confiance, horodatage | 1100 | `scripts/audit.js` s'en sert pour prouver qu'aucun verdict ne vient d'une erreur |

Les pseudos jugés **disponibles** n'appartiennent à personne. Les pseudos jugés
**pris** correspondent à des comptes réels : un pseudo est un identifiant en
ligne, donc une donnée personnelle au sens du RGPD, même quand il est déjà
public sur la plateforme.

## Ce qui a été retiré — 28/08

**1100 `profileUrl`**, soit un lien direct vers le compte Instagram de chaque
tiers, conservés dans les réponses brutes. Aucun n'était lu par quoi que ce soit :
l'audit vérifie la présence de `"status":"<verdict>"` dans le corps, et rien
d'autre. C'était de la donnée de tiers publiée sans usage.

Retirés par `scripts/purge_profile_urls.js`, et la source ne les enregistre plus
(`scripts/socialcal_api.js`). L'audit passe après retrait — la garantie du
projet est intacte.

Le retrait se fait par expression régulière sur la chaîne stockée, jamais par
parse et re-sérialisation : ce corps est la **preuve** qui adosse chaque verdict,
et le réécrire changerait des octets que l'audit compare.

## Ce qui n'a jamais été collecté

Aucun nom, aucune biographie, aucune photo, aucun abonné, aucun contenu de
compte. La vérification ne demande qu'une chose à ses sources — ce pseudo
est-il pris — et ne conserve que la réponse.

Aucun identifiant, mot de passe, cookie ni jeton n'a été soumis à un
vérificateur tiers. L'endpoint de récupération de compte Instagram a été écarté
dès le départ : il enverrait de vrais messages à de vraies personnes.

## Ce qui reste à ta main

Trois décisions m'appartiennent pas, et je ne les ai pas prises :

1. **La visibilité du dépôt.** Le passer en privé retirerait ces 1100 pseudos de
   l'espace public d'un coup. Mais c'est ton dépôt de profil : le rendre privé
   change ce qu'affiche ta page GitHub. Décision de présentation autant que de
   confidentialité.
2. **Sortir le projet du dépôt de profil.** Un dépôt dédié, privé, isolerait ces
   données sans toucher à ton profil. C'est la solution propre si le sujet
   compte.
3. **Publier ou non la liste des « pris ».** `pseudos_disponibles.md` — le
   livrable réellement utile — ne contient que des pseudos libres, qui
   n'appartiennent à personne. Les listes de « pris » servent à ta propre
   décision ; rien n'oblige à les laisser publiques une fois le tri fait.

## Vérifications passées

- Aucun secret dans le dépôt : `verify.sh` scanne le diff à chaque validation.
- Aucune adresse personnelle dans l'historique : les 182 commits portent
  `noreply@anthropic.com` ou `Kostas258@users.noreply.github.com`, toutes deux
  des adresses noreply. Vérifié sur l'auteur, le committer, les messages de
  commit et le contenu de tous les commits.
