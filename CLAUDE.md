# Projet

Vérification de disponibilité de pseudos Instagram sur deux listes (100 et 1000).
Lire `QUICK_REF.md` avant toute exploration. L'historique détaillé est dans
`PASSATION.md` — ne le lire qu'en cas de besoin précis, il est long.

# Commandes

- État, audit, rapport, commit, push : `bash scripts/control.sh`
- Validation avant de conclure : `bash scripts/verify.sh`
- Relancer une source (tâche d'arrière-plan, jamais détachée) :
  - `RUN_MINUTES=240 node scripts/crosscheck.js`   (socialcal)
  - `RUN_MINUTES=240 node scripts/confirm.js`      (vervox)

# Règles de méthode — non négociables

- Une erreur, un timeout, un 429 ou une absence de réponse ne devient JAMAIS un
  verdict. Le pseudo reste « indéterminé ».
- Un pseudo jamais interrogé est « non vérifié », surtout pas « libre ».
- Deux sources qui se contredisent donnent « contradiction », jamais un arbitrage.
- Un verdict n'est retenu que si plusieurs champs de la réponse concordent.
- Ne jamais relancer un service qui vient de bloquer : `scripts/cooldown.js`
  applique la règle, ne pas la contourner.
- Ne jamais résoudre un CAPTCHA. Le détecter, s'arrêter, noter où.
- Ne jamais faire tourner deux files sur la même source (verrou d'instance).
- Un seul échantillon ne prouve rien, y compris pour un contrôle d'intégrité.

# Cadences mesurées (ne pas descendre en dessous)

- vervox : 480 s entre requêtes. 70 s et 105 s ont bloqué. Blocage = 3 h.
- socialcal : 60 s. Cooldown adaptatif, double à chaque blocage consécutif.

# Sécurité

- Ne jamais soumettre d'identifiant, mot de passe, cookie ou jeton à un
  vérificateur tiers.
- Ne pas contourner une limite par IP : ni proxies, ni CI tierce, ni rotation.
  La passerelle les bloque de toute façon (403 `proxy_ip_not_allowed`).
- Ne pas utiliser l'endpoint de récupération de compte Instagram : il enverrait
  de vrais messages à de vraies personnes.

# Définition de terminé

1. `bash scripts/verify.sh` passe.
2. Le rapport distingue « 2 sources », « 1 source », « contradiction »,
   « indéterminé » — aucune promotion d'un état vers un autre.
3. La réponse finale dit ce qui n'a pas pu être fait et pourquoi.
