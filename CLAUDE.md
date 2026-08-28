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

- vervox : 480 s entre requêtes. 70 s, 105 s et 339 s ont bloqué. 600 s tient
  sur une fenêtre de 240 min sans blocage. Blocage = 3 h.
- socialcal : 60 s. Cooldown adaptatif, double à chaque blocage consécutif.

# Reformulation systématique des prompts

À chaque demande de l'utilisateur, terminer la réponse par une reformulation de
sa demande. Aucun skill d'optimisation de prompt n'étant disponible, appliquer
cette méthode :

1. Séparer ce qui est demandé de ce qui est supposé. Nommer la supposition.
2. Retirer ce qui est infaisable ici, et dire lequel et pourquoi — ne jamais
   supprimer un élément en silence.
3. Garder les contraintes chiffrées telles quelles (cadences, deadlines,
   volumes) : ce sont elles qui portent le sens.
4. Une action par ligne, à l'impératif, dans l'ordre d'exécution.
5. Terminer par le format de réponse attendu.

La reformulation ne remplace pas le travail : faire d'abord, reformuler ensuite.

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
