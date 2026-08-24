// Toutes les chaînes de l'interface, en français.

export const fr = {
  app: {
    titre: "LocalUpscale",
    sousTitre: "Agrandissement d'images par IA — 100 % local, rien n'est envoyé sur Internet.",
  },
  import: {
    deposer: "Glissez-déposez vos images ici",
    ou: "ou",
    parcourir: "Choisir des fichiers…",
    formats: "Formats acceptés : PNG, JPG, JPEG, WebP",
  },
  fichiers: {
    nom: "Nom",
    poids: "Poids",
    resolutionOrigine: "Résolution d'origine",
    resolutionEstimee: "Résolution finale estimée",
    retirer: "Retirer",
    vide: "Aucune image importée pour le moment.",
  },
  reglages: {
    titre: "Réglages",
    facteur: "Facteur d'agrandissement",
    modele: "Modèle",
    modelePhoto: "Photo",
    modeleAnime: "Illustration / anime",
    visages: "Améliorer les visages",
    visagesAide:
      "Restauration de visages via GFPGAN. Désactivé par défaut : les visages produits sont reconstruits par l'IA.",
    formatSortie: "Format de sortie",
    dossierDestination: "Dossier de destination",
    choisirDossier: "Choisir…",
  },
  traitement: {
    lancer: "Lancer le traitement",
    annuler: "Annuler",
    annulerTout: "Tout annuler",
    fileAttente: "File d'attente",
    enAttente: "En attente",
    enCours: "En cours",
    termine: "Terminé",
    erreur: "Erreur",
    annulee: "Annulée",
    journalErreurs: "Journal des erreurs",
    aucuneErreur: "Aucune erreur.",
  },
  resultat: {
    titre: "Résultat",
    ouvrirFichier: "Ouvrir le fichier",
    ouvrirDossier: "Ouvrir le dossier de sortie",
    avant: "Avant",
    apres: "Après",
    curseurAide: "Déplacez le curseur pour comparer avant / après.",
  },
  modeles: {
    titre: "Modèles IA",
    telecharger: "Télécharger ce modèle",
    installe: "Installé",
    licence: "Licence",
    source: "Source",
    consentement:
      "Aucun modèle n'est téléchargé automatiquement. En cliquant sur « Accepter et télécharger », vous acceptez la licence ci-dessus et le téléchargement depuis la source indiquée.",
    accepter: "Accepter et télécharger",
    refuser: "Annuler",
  },
  avertissements: {
    ia: "Les détails ajoutés par l'IA sont générés : ils sont plausibles mais ne sont pas une restitution authentique de la scène d'origine.",
    cpu: "Mode CPU de secours actif : le traitement est nettement plus lent qu'avec un GPU.",
    sourcesPreservees: "Vos fichiers originaux ne sont jamais modifiés ni écrasés.",
  },
} as const;
