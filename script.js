/*
    ============================================================
    FICHIER : script.js
    RÔLE    : C'est le "cerveau" du jeu. Tout ce qui bouge, se
              calcule ou se dessine est piloté depuis ce fichier.

    CONTENU DU JEU COMPLET :
    - Un écran d'accueil où l'on choisit sa difficulté (Facile,
      Normal, Difficile) avant de commencer.
    - La carte : un quartier urbain vu de dessus, avec des rues qui
      se croisent, des toits de bâtiments, et le Commissariat
      Central (la base à défendre) à l'arrivée du chemin.
    - Le système d'argent (gagner/dépenser).
    - 10 niveaux (10 vagues d'ennemis de plus en plus difficiles) qui
      se déplacent le long du chemin.
    - 10 unités posables sur les toits (Police Secours, RAID, GIGN,
      CRS, BAC, BRI, Police Judiciaire, Unité Cynophile, Compagnie
      Motocycliste, Section Aérienne), avec achat, amélioration et
      vente. Chacune est illustrée par un vrai portrait généré par IA
      (dossier images/, voir fichier-images-personnages-graphisme.md).
    - Les points de vie du Commissariat, la victoire et la défaite.
    - Des Mods (modificateurs de jeu) débloqués après une première
      victoire sur les 10 niveaux, et un bouton "Rejouer" pour
      relancer une partie avec la difficulté et les mods choisis.
    - Des images générées par IA pour les personnages, le logo, les
      toits de bâtiments et le mobilier urbain (lampadaire, banc,
      abribus...), chargées une fois et réutilisées à chaque image
      (voir section 12bis).

    Le fichier est découpé en grandes sections numérotées, dans
    l'ordre où on les a construites : la carte d'abord, puis
    l'argent, puis les unités, puis les ennemis, puis la boucle de
    jeu qui fait tourner tout ça en continu.
    ============================================================
*/


/* ------------------------------------------------------------
   1. RÉCUPÉRATION DU CANVAS ET DE SON "CONTEXTE"
   ------------------------------------------------------------
   Le Canvas HTML est une toile vierge : pour dessiner dessus,
   on a besoin d'un objet appelé "contexte de rendu" (context).
   C'est cet objet qui fournit toutes les fonctions de dessin
   (rectangles, lignes, cercles, texte...).

   - document.getElementById('jeu-canvas') va chercher dans la
     page HTML l'élément <canvas id="jeu-canvas">.
   - .getContext('2d') demande un contexte de dessin en 2D
     (il existe aussi la 3D avec WebGL, mais on n'en a pas besoin
     pour un Tower Defense vu de dessus).
------------------------------------------------------------ */
const canvas = document.getElementById('jeu-canvas');
const ctx = canvas.getContext('2d');

// On récupère la largeur et la hauteur réelles du canvas (définies
// dans le HTML via width="960" height="640") pour pouvoir les
// réutiliser facilement dans nos calculs de dessin.
const LARGEUR_CANVAS = canvas.width;
const HAUTEUR_CANVAS = canvas.height;


/* ------------------------------------------------------------
   2. CONSTANTES DE CONFIGURATION VISUELLE
   ------------------------------------------------------------
   Regrouper les couleurs et tailles ici permet de modifier
   facilement l'apparence du jeu plus tard, sans devoir fouiller
   dans tout le code : un seul endroit à changer.
------------------------------------------------------------ */
const COULEUR_SOL = '#232a30';           // Couleur du "sol" général du quartier (trottoirs/terrain)
const COULEUR_RUE = '#3c444c';           // Couleur de l'asphalte des rues
const COULEUR_BORD_RUE = '#54606a';      // Couleur du bord de rue (petit trottoir clair)
const COULEUR_MARQUAGE = '#e8e8e8';      // Couleur des lignes blanches peintes sur la route
const COULEUR_TOIT_BASE = '#7a5230';     // Couleur de repli tant que l'image du toit n'est pas chargée
const COULEUR_COMMISSARIAT = '#245ec9';  // Couleur du toit du Commissariat (bleu police)
const COULEUR_COMMISSARIAT_BORD = '#ffffff'; // Contour blanc du Commissariat pour bien le repérer
const COULEUR_GYROPHARE_ROUGE = '#e63946'; // Petit accent rouge sur le Commissariat (façon gyrophare)
const COULEUR_GYROPHARE_BLEU = '#245ec9';  // Petit accent bleu sur le Commissariat (façon gyrophare)
const COULEUR_POINT_DEPART = '#e63946';  // Couleur du marqueur "point d'apparition" des ennemis

const LARGEUR_RUE = 60;                  // Largeur (en pixels) d'une rue dessinée


/* ------------------------------------------------------------
   3. DÉFINITION DU CHEMIN (LA RUE PRINCIPALE SUIVIE PAR LES ENNEMIS)
   ------------------------------------------------------------
   Comme pour une vraie carte de Tower Defense, le chemin est
   stocké comme une simple LISTE DE POINTS (des coordonnées x/y).
   Chaque point représente un "virage" de la rue.

   Pourquoi une liste de points plutôt qu'un dessin figé ?
   Parce que plus tard, les ennemis (pas encore codés) se
   déplaceront eux aussi de point en point, en suivant exactement
   ce même tracé. La carte ET les futurs ennemis partageront cette
   unique source de vérité.

   Le chemin part d'un point d'apparition (bord gauche de l'écran,
   comme une rue qui entre dans le quartier) et serpente entre les
   bâtiments jusqu'au Commissariat Central.
------------------------------------------------------------ */
const CHEMIN = [
    { x: 0,   y: 120 },  // Point de départ : les ennemis apparaîtront ici, sur le bord gauche
    { x: 220, y: 120 },
    { x: 220, y: 320 },
    { x: 520, y: 320 },
    { x: 520, y: 140 },
    { x: 800, y: 140 },
    { x: 800, y: 460 },
    { x: 400, y: 460 },
    { x: 400, y: 560 },
    { x: 660, y: 560 }  // Point final : le Commissariat Central, la base à défendre
];

/* ------------------------------------------------------------
   3bis. UNE RUE SECONDAIRE DÉCORATIVE (POUR LE CROISEMENT)
   ------------------------------------------------------------
   Le cahier des charges demande "des rues qui se croisent".
   En plus de la rue principale empruntée par les ennemis (CHEMIN),
   on dessine ici une petite rue transversale purement décorative,
   qui coupe la rue principale et donne l'impression d'un vrai
   quartier avec un carrefour. Elle n'est pas utilisée pour le
   déplacement des ennemis, seulement pour le décor.
------------------------------------------------------------ */
const RUE_SECONDAIRE = {
    debut: { x: 100, y: 220 },
    fin:   { x: 340, y: 220 }
};


/* ------------------------------------------------------------
   4. DÉFINITION DES BÂTIMENTS (LES TOITS VUS DE DESSUS)
   ------------------------------------------------------------
   Chaque bâtiment est un simple objet { x, y, largeur, hauteur }.
   Comme pour le chemin, on stocke ces informations dans un tableau
   plutôt que de "juste dessiner des rectangles au hasard" : plus
   tard, ces mêmes bâtiments serviront d'emplacements où poser des
   unités (tireur de précision, unité lourde, herse...).

   Les bâtiments sont placés autour des rues, sans les bloquer.
------------------------------------------------------------ */
const BATIMENTS = [
    { x: 30,  y: 170, largeur: 150, hauteur: 100 },
    { x: 280, y: 20,  largeur: 170, hauteur: 80  },
    { x: 610, y: 210, largeur: 150, hauteur: 90  },
    { x: 40,  y: 420, largeur: 150, hauteur: 100 },
    { x: 560, y: 300, largeur: 110, hauteur: 100 },
    { x: 840, y: 240, largeur: 100, hauteur: 160 },
    { x: 140, y: 560, largeur: 130, hauteur: 60  },
    { x: 780, y: 500, largeur: 150, hauteur: 100 }
];


/* ------------------------------------------------------------
   4bis. LE MOBILIER URBAIN (DÉCOR DE LA CARTE)
   ------------------------------------------------------------
   Une petite liste d'éléments de décor purement esthétiques (aucun
   impact sur le jeu, contrairement au CHEMIN ou aux BATIMENTS) :
   lampadaires, bancs, feux tricolores... Chaque élément a un "type"
   (qui détermine comment on le dessine, voir dessinerMobilierUrbain
   plus bas) et une position x/y.
------------------------------------------------------------ */
const MOBILIER_URBAIN = [
    { type: 'lampadaire',    x: 15,  y: 50  },
    { type: 'banc',          x: 250, y: 380 },
    { type: 'abribus',       x: 900, y: 60  },
    { type: 'poubelle',      x: 470, y: 200 },
    { type: 'feuTricolore',  x: 220, y: 220 }, // pile au carrefour entre les deux rues
    { type: 'boucheIncendie',x: 700, y: 380 },
    { type: 'barrierePolice',x: 90,  y: 610 },
    { type: 'voiturePolice', x: 850, y: 615 },
    { type: 'jardiniere',    x: 330, y: 615 },
    { type: 'passagePieton', x: 400, y: 500 }  // posé directement sur la rue
];


/* ------------------------------------------------------------
   5. FONCTION : dessinerFond()
   ------------------------------------------------------------
   Dessine le sol du quartier (couleur de fond pleine). C'est la
   toute première couche : tout le reste sera dessiné par-dessus.
------------------------------------------------------------ */
function dessinerFond() {
    // fillStyle définit la couleur utilisée par les prochains
    // "remplissages" (fillRect, fill...).
    ctx.fillStyle = COULEUR_SOL;

    // fillRect(x, y, largeur, hauteur) dessine un rectangle plein.
    // Ici on remplit TOUT le canvas avec la couleur de sol.
    ctx.fillRect(0, 0, LARGEUR_CANVAS, HAUTEUR_CANVAS);
}


/* ------------------------------------------------------------
   6. FONCTION : dessinerRues()
   ------------------------------------------------------------
   Dessine les rues du quartier : la rue principale (celle du
   tableau CHEMIN, empruntée par les ennemis) et la rue secondaire
   décorative qui la croise. On dessine d'abord la rue secondaire
   (en dessous), puis la rue principale par-dessus, pour que le
   croisement ait l'air naturel.
------------------------------------------------------------ */
function dessinerRues() {
    // --- La rue secondaire décorative (croisement) ---
    tracerSegmentRue(RUE_SECONDAIRE.debut, RUE_SECONDAIRE.fin);

    // --- La rue principale (le chemin suivi par les ennemis) ---
    if (CHEMIN.length === 0) return;

    // On trace d'abord un trait légèrement plus large et plus clair
    // en dessous : cela crée un fin "trottoir" visible sur les bords.
    tracerLigneChemin(LARGEUR_RUE + 8, COULEUR_BORD_RUE);

    // Puis on redessine l'asphalte par-dessus, un peu moins large.
    tracerLigneChemin(LARGEUR_RUE, COULEUR_RUE);

    // Enfin, on ajoute le marquage au sol (ligne blanche discontinue)
    // au centre de la rue principale, comme sur une vraie route.
    tracerLigneChemin(4, COULEUR_MARQUAGE, [16, 14]);
}

/**
 * Fonction utilitaire qui trace une ligne continue passant par tous les
 * points de CHEMIN, avec l'épaisseur et la couleur demandées.
 * Le paramètre optionnel "pointilles" permet de dessiner un trait
 * discontinu (utile pour le marquage au sol).
 */
function tracerLigneChemin(epaisseur, couleur, pointilles) {
    ctx.beginPath();

    // On se positionne sur le premier point du chemin...
    ctx.moveTo(CHEMIN[0].x, CHEMIN[0].y);

    // ...puis on trace une ligne vers chacun des points suivants, dans l'ordre.
    for (let i = 1; i < CHEMIN.length; i++) {
        ctx.lineTo(CHEMIN[i].x, CHEMIN[i].y);
    }

    ctx.strokeStyle = couleur;
    ctx.lineWidth = epaisseur;

    // "round" arrondit les extrémités et les angles de la ligne,
    // pour que les virages de la rue ne forment pas de pointes agressives.
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // setLineDash([...]) définit un motif de pointillés. On lui passe
    // un tableau vide pour revenir à un trait continu.
    ctx.setLineDash(pointilles || []);

    ctx.stroke(); // dessine le tracé défini ci-dessus

    // On remet un trait continu par défaut pour ne pas perturber
    // les prochains dessins effectués ailleurs dans le code.
    ctx.setLineDash([]);
}

/**
 * Fonction utilitaire qui trace un simple segment de rue rectiligne
 * entre deux points (utilisée pour la rue secondaire décorative).
 */
function tracerSegmentRue(pointA, pointB) {
    ctx.beginPath();
    ctx.moveTo(pointA.x, pointA.y);
    ctx.lineTo(pointB.x, pointB.y);
    ctx.strokeStyle = COULEUR_BORD_RUE;
    ctx.lineWidth = LARGEUR_RUE + 8;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(pointA.x, pointA.y);
    ctx.lineTo(pointB.x, pointB.y);
    ctx.strokeStyle = COULEUR_RUE;
    ctx.lineWidth = LARGEUR_RUE;
    ctx.lineCap = 'round';
    ctx.stroke();
}


/* ------------------------------------------------------------
   7. FONCTION : dessinerBatiments()
   ------------------------------------------------------------
   Parcourt le tableau BATIMENTS et dessine le toit de chacun avec
   une vraie image générée par IA (voir TOITS_IMAGES, section 12bis).
   On répartit les 4 variantes de toit disponibles sur les 8
   bâtiments avec l'opérateur "%" (modulo) : bâtiment 0 -> toit 0,
   bâtiment 1 -> toit 1, ... bâtiment 4 -> toit 0 à nouveau, etc.
   Tant que l'image correspondante n'est pas encore chargée, on
   affiche un simple rectangle de couleur à la place (solution de
   repli), pour ne jamais laisser de trou visuel sur la carte.

   Cette fonction ajoute aussi un indice visuel : si le joueur a
   sélectionné un type d'unité dans la boutique (variable
   "typeSelectionnePourAchat", définie plus bas dans le fichier) et
   qu'un toit est encore libre (aucune unité dessus), on l'entoure
   d'un contour doré en pointillés pour indiquer "vous pouvez
   construire ici".
------------------------------------------------------------ */
function dessinerBatiments() {
    // forEach(fonction(élément, index)) : le deuxième paramètre est la
    // position de l'élément dans le tableau (0, 1, 2...), ce qui nous
    // sert à choisir quelle image de toit utiliser.
    BATIMENTS.forEach(function (batiment, index) {
        const image = TOITS_IMAGES[index % TOITS_IMAGES.length];

        if (image.complete && image.naturalWidth > 0) {
            ctx.drawImage(image, batiment.x, batiment.y, batiment.largeur, batiment.hauteur);
        } else {
            // Solution de repli tant que l'image n'est pas encore chargée.
            ctx.fillStyle = COULEUR_TOIT_BASE;
            ctx.fillRect(batiment.x, batiment.y, batiment.largeur, batiment.hauteur);
        }

        // Indice visuel "emplacement constructible" (voir explication ci-dessus)
        if (typeSelectionnePourAchat && !uniteSurBatiment(batiment)) {
            ctx.strokeStyle = '#ffd166';
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 6]);
            ctx.strokeRect(batiment.x - 3, batiment.y - 3, batiment.largeur + 6, batiment.hauteur + 6);
            ctx.setLineDash([]);
        }
    });
}


/* ------------------------------------------------------------
   7bis. FONCTION : dessinerMobilierUrbain()
   ------------------------------------------------------------
   Parcourt MOBILIER_URBAIN et dessine chaque élément de décor avec
   sa vraie image (voir MOBILIER_IMAGES et MOBILIER_TAILLES, section
   12bis), grâce à notre fonction utilitaire dessinerImageCentree().
   Purement esthétique : ces éléments ne jouent aucun rôle dans les
   règles du jeu.
------------------------------------------------------------ */
function dessinerMobilierUrbain() {
    MOBILIER_URBAIN.forEach(function (objet) {
        dessinerImageCentree(
            MOBILIER_IMAGES[objet.type],
            objet.x, objet.y,
            MOBILIER_TAILLES[objet.type] || 32
        );
    });
}


/* ------------------------------------------------------------
   8. FONCTION : dessinerPointDepart()
   ------------------------------------------------------------
   Marque visuellement l'endroit où les ennemis apparaîtront
   (le tout premier point du tableau CHEMIN), sous forme d'un
   cercle coloré.
------------------------------------------------------------ */
function dessinerPointDepart() {
    const depart = CHEMIN[0]; // le premier point du chemin = point d'apparition

    ctx.beginPath();
    // arc(x, y, rayon, angleDébut, angleFin) dessine un cercle (ou portion de cercle).
    // Ici 0 -> Math.PI * 2 signifie "un tour complet", donc un cercle plein.
    ctx.arc(depart.x, depart.y, 20, 0, Math.PI * 2);
    ctx.fillStyle = COULEUR_POINT_DEPART;
    ctx.fill();

    // Un petit contour blanc pour bien détacher le marqueur du fond
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
}


/* ------------------------------------------------------------
   9. FONCTION : dessinerCommissariat()
   ------------------------------------------------------------
   Dessine le Commissariat Central : la base que le joueur doit
   défendre. Elle est placée au dernier point du tableau CHEMIN,
   avec une couleur bien distincte (bleu police) et deux petits
   accents rouge/bleu façon gyrophare, pour qu'on la repère
   immédiatement sur la carte.
------------------------------------------------------------ */
function dessinerCommissariat() {
    const base = CHEMIN[CHEMIN.length - 1]; // le dernier point du chemin = le Commissariat

    const largeur = 90;
    const hauteur = 70;
    const x = base.x - largeur / 2;
    const y = base.y - hauteur / 2;

    // Le bâtiment principal du Commissariat
    ctx.fillStyle = COULEUR_COMMISSARIAT;
    ctx.fillRect(x, y, largeur, hauteur);

    // Contour blanc épais pour bien le distinguer des toits ordinaires
    ctx.lineWidth = 4;
    ctx.strokeStyle = COULEUR_COMMISSARIAT_BORD;
    ctx.strokeRect(x, y, largeur, hauteur);

    // Petit "gyrophare" décoratif sur le toit : deux petits carrés
    // rouge et bleu côte à côte, comme sur un véhicule de police.
    const tailleGyrophare = 14;
    const yGyrophare = y - tailleGyrophare - 4;

    ctx.fillStyle = COULEUR_GYROPHARE_BLEU;
    ctx.fillRect(base.x - tailleGyrophare, yGyrophare, tailleGyrophare, tailleGyrophare);

    ctx.fillStyle = COULEUR_GYROPHARE_ROUGE;
    ctx.fillRect(base.x, yGyrophare, tailleGyrophare, tailleGyrophare);
}


/* ------------------------------------------------------------
   10. FONCTION PRINCIPALE : dessinerCarte()
   ------------------------------------------------------------
   Cette fonction orchestre le dessin complet de la carte, dans
   le BON ORDRE (très important avec un Canvas !). Chaque appel
   de fonction dessine par-dessus ce qui a déjà été tracé, comme
   des calques empilés :

     1. Le sol (tout en bas de la pile)
     2. Les rues (par-dessus le sol)
     3. Les bâtiments (par-dessus les rues, comme des toits vus du ciel)
     4. Le mobilier urbain (par-dessus les rues et bâtiments)
     5. Le point de départ (par-dessus tout, pour rester visible)
     6. Le Commissariat (par-dessus tout, pour rester visible)

   Si on inversait l'ordre, par exemple en dessinant le sol en
   dernier, il recouvrirait tout le reste !
------------------------------------------------------------ */
function dessinerCarte() {
    dessinerFond();
    dessinerRues();
    dessinerBatiments();
    dessinerMobilierUrbain();
    dessinerPointDepart();
    dessinerCommissariat();
}


/* ------------------------------------------------------------
   11. LE SYSTÈME D'ARGENT
   ------------------------------------------------------------
   Le joueur possède une somme d'argent qui lui sert à acheter et
   améliorer ses unités. Cette somme augmente quand un ennemi est
   éliminé (pas encore codé) et diminue quand le joueur dépense.

   On utilise une variable "let" (et pas "const") car sa valeur
   va changer tout au long de la partie, contrairement aux
   constantes de configuration définies plus haut.
------------------------------------------------------------ */

// Montant de départ du joueur. 300 est une valeur de test simple,
// qu'on pourra facilement ajuster plus tard pour équilibrer le jeu.
let argent = 300;

// On récupère une fois pour toutes la référence vers l'élément HTML
// <span id="argent-valeur"> (voir index.html), pour ne pas avoir à
// la rechercher à nouveau à chaque fois qu'on affiche l'argent.
const elementArgent = document.getElementById('argent-valeur');

/**
 * Met à jour l'affichage à l'écran pour qu'il corresponde toujours
 * à la valeur actuelle de la variable "argent". Cette fonction doit
 * être appelée juste après CHAQUE modification de "argent", sinon
 * le joueur verrait un nombre affiché qui ne correspond plus à la
 * réalité du jeu.
 */
function mettreAJourAffichageArgent() {
    // .textContent remplace le texte affiché à l'intérieur de l'élément HTML.
    elementArgent.textContent = argent;
}

/**
 * Ajoute une somme à l'argent du joueur.
 * Utilisée plus tard, par exemple, quand un ennemi est éliminé
 * (chaque ennemi rapportera une récompense en appelant cette fonction).
 *
 * @param {number} montant - la somme à ajouter (doit être positive)
 */
function ajouterArgent(montant) {
    argent += montant; // équivaut à : argent = argent + montant
    mettreAJourAffichageArgent();
}

/**
 * Tente de dépenser une somme d'argent, par exemple pour acheter
 * ou améliorer une unité.
 *
 * Cette fonction VÉRIFIE d'abord que le joueur a assez d'argent :
 * - Si oui, elle retire la somme et renvoie "true" (succès), afin
 *   que le reste du code sache que l'achat est confirmé.
 * - Si non, elle ne touche pas à l'argent et renvoie "false" (échec),
 *   pour que le reste du code puisse par exemple afficher un message
 *   "Fonds insuffisants" plus tard.
 *
 * @param {number} montant - la somme à dépenser
 * @returns {boolean} true si la dépense a pu être effectuée, false sinon
 */
function depenserArgent(montant) {
    if (argent >= montant) {
        argent -= montant; // équivaut à : argent = argent - montant
        mettreAJourAffichageArgent();
        return true;
    }

    // Pas assez d'argent : on ne change rien et on prévient l'appelant.
    return false;
}


/* ------------------------------------------------------------
   12. CONFIGURATION DES TYPES D'UNITÉS
   ------------------------------------------------------------
   On regroupe ICI, en un seul endroit, toutes les statistiques de
   chaque type d'unité posable. C'est ce qu'on appelle une "source
   unique de vérité" : la boutique (HTML) et le combat (plus bas)
   liront toujours ces mêmes valeurs, au lieu de les recopier à
   plusieurs endroits (ce qui finirait par créer des incohérences).

   - cout             : prix d'achat en $
   - degats            : dégâts infligés à chaque tir
   - portee            : distance (en pixels) à laquelle l'unité peut viser
   - tempsEntreTirs    : temps d'attente (en secondes) entre deux tirs
                         (plus c'est petit, plus l'unité tire vite)
   - rayonExplosion    : (unités à dégâts de zone) rayon dans lequel les
                         dégâts touchent TOUS les ennemis proches de la cible
   - facteurRalentissement : (unités de ralentissement) multiplicateur de
                         vitesse appliqué en continu aux ennemis dans sa
                         portée (0.45 = ils ne gardent que 45% de leur vitesse)
   - dureeMarquage / bonusDegatsMarque : (Police Judiciaire uniquement) une
                         cible "marquée" reste vulnérable pendant
                         dureeMarquage secondes, et subit alors
                         bonusDegatsMarque fois plus de dégâts de la part de
                         TOUTES les unités (pas seulement celle qui a marqué)
   - dureeImmobilisation : (Compagnie Motocycliste uniquement) durée pendant
                         laquelle la cible touchée est totalement stoppée
------------------------------------------------------------ */
const UNITES = {
    policeSecours: {
        nom: 'Police Secours',
        cout: 60,
        degats: 18,
        portee: 130,
        tempsEntreTirs: 0.5,
        couleur: '#4d9dff',
        portrait: 'images/portrait_policeSecours.jpg'
    },
    tireur: {
        nom: 'Agent RAID',
        cout: 120,
        degats: 45,
        portee: 170,
        tempsEntreTirs: 1.1,
        couleur: '#e63946',
        portrait: 'images/portrait_tireur.jpg'
    },
    lourd: {
        nom: 'Agent GIGN',
        cout: 160,
        degats: 18,
        portee: 130,
        tempsEntreTirs: 0.7,
        rayonExplosion: 55,
        couleur: '#f4a259',
        portrait: 'images/portrait_lourd.jpg'
    },
    herse: {
        nom: 'Agent CRS',
        cout: 70,
        degats: 0,
        portee: 90,
        tempsEntreTirs: 0,
        facteurRalentissement: 0.45,
        couleur: '#8d99ae',
        portrait: 'images/portrait_herse.jpg'
    },
    bac: {
        nom: 'Agent BAC',
        cout: 140,
        degats: 10,
        portee: 110,
        tempsEntreTirs: 0.35,
        rayonExplosion: 25,
        couleur: '#2ec4b6',
        portrait: 'images/portrait_bac.jpg'
    },
    bri: {
        nom: 'Agent BRI',
        cout: 220,
        degats: 95,
        portee: 170,
        tempsEntreTirs: 1.7,
        couleur: '#6a4c93',
        portrait: 'images/portrait_bri.jpg'
    },
    policeJudiciaire: {
        nom: 'Police Judiciaire',
        cout: 100,
        degats: 0,
        portee: 150,
        tempsEntreTirs: 1.2,
        dureeMarquage: 3,
        bonusDegatsMarque: 1.5,
        couleur: '#b08968',
        portrait: 'images/portrait_policeJudiciaire.jpg'
    },
    cynophile: {
        nom: 'Unité Cynophile',
        cout: 110,
        degats: 8,
        portee: 90,
        tempsEntreTirs: 0.5,
        facteurRalentissement: 0.7,
        couleur: '#4c7a3d',
        portrait: 'images/portrait_cynophile.jpg'
    },
    motocycliste: {
        nom: 'Cie Motocycliste',
        cout: 150,
        degats: 6,
        portee: 130,
        tempsEntreTirs: 1.4,
        dureeImmobilisation: 1,
        couleur: '#f7b32b',
        portrait: 'images/portrait_motocycliste.jpg'
    },
    aerienne: {
        nom: 'Section Aérienne',
        cout: 320,
        degats: 55,
        portee: 1200, // couvre toute la carte : plus grand que la diagonale du Canvas (960x640)
        tempsEntreTirs: 6,
        rayonExplosion: 150,
        couleur: '#5da9e9',
        portrait: 'images/portrait_aerienne.jpg'
    }
};

/* ------------------------------------------------------------
   12bis. IMAGES DU JEU (personnages, toits, mobilier urbain, logo)
   ------------------------------------------------------------
   On charge ici, une seule fois, toutes les images générées par IA
   (voir fichier-images-personnages-graphisme.md) dont le jeu a
   besoin. "new Image()" crée un objet image vide, et "img.src = ..."
   lance son téléchargement en arrière-plan, SANS bloquer le reste du
   script : le jeu démarre normalement pendant que les images se
   chargent en parallèle.

   Comme notre boucle de jeu redessine la scène 60 fois par seconde
   (voir section 20), on n'a même pas besoin d'attendre la fin du
   chargement "à la main" : dès qu'une image est prête, elle
   apparaît automatiquement dès l'image suivante. En attendant,
   "img.complete" vaut false et nos fonctions de dessin savent
   afficher une solution de repli simple (un rectangle de couleur).
------------------------------------------------------------ */

// Un portrait par type d'unité, chargé une seule fois et réutilisé à
// chaque image (frame) pour dessiner l'avatar rond sur la carte.
const PORTRAITS_UNITES = {};
Object.keys(UNITES).forEach(function (cle) {
    const image = new Image();
    image.src = UNITES[cle].portrait;
    PORTRAITS_UNITES[cle] = image;
});

// Le portrait du Commissaire (affiché sur l'écran d'accueil).
const PORTRAIT_COMMISSAIRE = new Image();
PORTRAIT_COMMISSAIRE.src = 'images/portrait_commissaire.jpg';

// Le logo compact (bandeau de titre) et le grand logo (écran d'accueil).
const LOGO_COMPACT = new Image();
LOGO_COMPACT.src = 'images/logo_compact.png';

// 12 variantes de toits pastel (extraites de la maquette d'interface
// fournie par l'utilisateur : bâtiments massifs aux toits plats colorés,
// vus strictement de dessus), réparties sur les 8 bâtiments de la carte
// (voir dessinerBatiments : BATIMENTS[i] utilise TOITS_IMAGES[i % 12]).
const TOITS_IMAGES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(function (numero) {
    const image = new Image();
    image.src = 'images/toit_maquette_' + numero + '.png';
    return image;
});

// Une image par élément de mobilier urbain (voir MOBILIER_URBAIN,
// section 4bis) : la clé correspond exactement au "type" utilisé
// dans ce tableau.
const MOBILIER_IMAGES = {};
['lampadaire', 'banc', 'abribus', 'poubelle', 'feuTricolore', 'boucheIncendie',
    'barrierePolice', 'voiturePolice', 'jardiniere', 'passagePieton'].forEach(function (cle) {
    const image = new Image();
    image.src = 'images/mobilier_' + cle + '.png';
    MOBILIER_IMAGES[cle] = image;
});

// La taille d'affichage cible (en pixels) de chaque élément de
// mobilier urbain : certains objets (abribus, voiture) sont bien
// plus larges que d'autres (bouche d'incendie, poubelle).
const MOBILIER_TAILLES = {
    lampadaire: 26, banc: 40, abribus: 58, poubelle: 22, feuTricolore: 30,
    boucheIncendie: 18, barrierePolice: 42, voiturePolice: 46, jardiniere: 32, passagePieton: 48
};

/**
 * Dessine une image centrée en (x, y), redimensionnée pour que son
 * plus grand côté fasse "tailleMax" pixels, sans déformer ses
 * proportions. Ne fait rien tant que l'image n'est pas encore
 * chargée (img.complete), pour éviter une erreur ou un dessin vide.
 */
function dessinerImageCentree(img, x, y, tailleMax) {
    if (!img.complete || img.naturalWidth === 0) return;

    const ratio = img.naturalWidth / img.naturalHeight;
    const largeur = ratio >= 1 ? tailleMax : tailleMax * ratio;
    const hauteur = ratio >= 1 ? tailleMax / ratio : tailleMax;

    ctx.drawImage(img, x - largeur / 2, y - hauteur / 2, largeur, hauteur);
}

// Facteurs utilisés lors d'une amélioration ou d'une vente
// (voir la section 13 ci-dessous pour leur utilisation).
const COUT_AMELIORATION_FACTEUR = 0.6; // une amélioration coûte 60% du prix d'achat initial
const BONUS_AMELIORATION_DEGATS = 1.5; // +50% de dégâts au niveau 2
const BONUS_AMELIORATION_PORTEE = 1.2; // +20% de portée au niveau 2
const REMBOURSEMENT_VENTE_FACTEUR = 0.5; // revendre une unité rembourse 50% de l'argent investi


/* ------------------------------------------------------------
   13. PLACEMENT, SÉLECTION, AMÉLIORATION ET VENTE DES UNITÉS
   ------------------------------------------------------------
   Cette section gère tout ce qui concerne les unités posées par le
   joueur : la liste des unités sur la carte, quel type est en
   cours d'achat, quelle unité est actuellement sélectionnée, et
   les fonctions appelées par les clics de souris.
------------------------------------------------------------ */

// La liste de toutes les unités actuellement posées sur la carte.
// Chaque élément est un objet : { batiment, type, niveau, degats,
// portee, tempsEntreTirs, cooldownRestant, investissementTotal }
let unitesPlacees = [];

// Quand le joueur clique sur un bouton de la boutique, on mémorise
// ici le type choisi ("tireur", "lourd" ou "herse"). Tant que cette
// variable n'est pas vide, le PROCHAIN clic sur un toit libre du
// Canvas construira une unité de ce type.
let typeSelectionnePourAchat = null;

// Quand le joueur clique sur une unité déjà posée (et qu'il n'est
// pas en train d'acheter), on mémorise ici cette unité pour
// afficher son panneau "Améliorer / Vendre".
let uniteSelectionnee = null;

/**
 * Calcule le centre (x, y) d'un bâtiment. On en a besoin très
 * souvent : c'est le point de référence pour dessiner l'unité,
 * calculer sa portée, ou viser les ennemis.
 */
function centreBatiment(batiment) {
    return {
        x: batiment.x + batiment.largeur / 2,
        y: batiment.y + batiment.hauteur / 2
    };
}

/**
 * Renvoie l'unité posée sur un bâtiment donné, ou "undefined" si
 * ce toit est encore libre.
 */
function uniteSurBatiment(batiment) {
    return unitesPlacees.find(function (unite) {
        return unite.batiment === batiment;
    });
}

/**
 * Calcule la distance à vol d'oiseau entre deux points (formule de
 * Pythagore : distance = racine carrée de (dx² + dy²)). On l'utilise
 * partout : portée des unités, détection de clic, ralentissement...
 */
function distanceEntre(pointA, pointB) {
    const dx = pointA.x - pointB.x;
    const dy = pointA.y - pointB.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/* ------------------------------------------------------------
   13bis. FICHES DE CARACTÉRISTIQUES (barres VITESSE / PORTÉE / DÉGÂTS)
   ------------------------------------------------------------
   Petit "bonus" visuel façon fiche de personnage de jeu vidéo :
   trois jauges qui permettent de comparer les unités d'un coup
   d'œil, aussi bien dans la boutique (avant achat) que dans le
   panneau de sélection (après avoir posé une unité).

   Ces trois constantes définissent les bornes MIN/MAX utilisées pour
   convertir une statistique brute (ex : 1.1 seconde entre deux tirs)
   en pourcentage de remplissage de jauge (0% à 100%). Elles sont
   calées sur les valeurs extrêmes réellement présentes dans UNITES,
   pour que les jauges utilisent bien toute leur longueur.
------------------------------------------------------------ */
const BARRE_CADENCE_MIN = 0.35; // Agent BAC : l'unité qui tire le plus vite
const BARRE_CADENCE_MAX = 6;    // Section Aérienne : l'unité qui recharge le plus lentement
const BARRE_PORTEE_MAX = 300;   // Au-delà, la jauge reste pleine (portée "illimitée" de la Section Aérienne)
const BARRE_DEGATS_MAX = 95;    // Agent BRI : les dégâts les plus élevés en un seul tir

/**
 * Construit le HTML d'UNE jauge (libellé + barre remplie à X%).
 * "ratio" doit être un nombre entre 0 et 1, ou null si la statistique
 * ne s'applique pas à cette unité (ex : la Vitesse de tir pour la
 * Herse CRS, qui ne tire jamais).
 */
function construireBarreStat(libelle, ratio) {
    const pourcentage = ratio === null ? 0 : Math.round(Math.min(1, Math.max(0, ratio)) * 100);
    return '<span class="stat-ligne">' +
        '<span class="stat-libelle">' + libelle + '</span>' +
        '<span class="jauge-fond"><span class="jauge-remplissage" style="width:' + pourcentage + '%"></span></span>' +
        '</span>';
}

/**
 * Construit les 3 jauges (Vitesse, Portée, Dégâts) d'une unité, à
 * partir de ses statistiques ACTUELLES. On accepte aussi bien un
 * objet UNITES[cle] (stats de base, pour la boutique avant achat)
 * qu'une unité déjà posée sur la carte (stats potentiellement
 * augmentées par une amélioration niveau 2) : les deux ont les
 * mêmes noms de champs (tempsEntreTirs, portee, degats).
 */
function construireBarresUnite(stats) {
    const vitesse = stats.tempsEntreTirs > 0
        ? 1 - Math.min(1, Math.max(0, (stats.tempsEntreTirs - BARRE_CADENCE_MIN) / (BARRE_CADENCE_MAX - BARRE_CADENCE_MIN)))
        : null; // la Herse CRS ne tire jamais : pas de vitesse de tir à afficher

    const portee = stats.portee / BARRE_PORTEE_MAX;
    const degats = stats.degats / BARRE_DEGATS_MAX;

    return '<span class="stats-unite">' +
        construireBarreStat('Vitesse', vitesse) +
        construireBarreStat('Portée', portee) +
        construireBarreStat('Dégâts', degats) +
        '</span>';
}

/**
 * Construit les boutons de la boutique (une carte par type d'unité) à
 * partir de l'objet UNITES, exactement comme initialiserPanneauMods()
 * et initialiserEcranAccueil() le font pour MODS et DIFFICULTES : le
 * nom et le prix ne sont écrits qu'à un seul endroit du projet (dans
 * UNITES), et la boutique s'adapte automatiquement si on ajoute ou
 * retire un type d'unité, sans jamais avoir à toucher au HTML.
 */
function initialiserBoutique() {
    const conteneur = document.getElementById('liste-unites');

    conteneur.innerHTML = Object.keys(UNITES).map(function (cle) {
        const infos = UNITES[cle];
        return '<button class="bouton-unite" data-type="' + cle + '">' +
            '<img class="bouton-unite-avatar" src="' + infos.portrait + '" alt="">' +
            '<span class="bouton-unite-texte">' +
                '<span class="bouton-unite-nom">' + infos.nom + '</span>' +
                '<span class="bouton-unite-cout">' + infos.cout + ' $</span>' +
                construireBarresUnite(infos) +
            '</span>' +
            '</button>';
    }).join('');

    conteneur.querySelectorAll('.bouton-unite').forEach(function (bouton) {
        const infos = UNITES[bouton.dataset.type];

        // Quand on clique sur ce bouton, on entre en "mode achat"
        // pour ce type d'unité.
        bouton.addEventListener('click', function () {
            typeSelectionnePourAchat = bouton.dataset.type;
            uniteSelectionnee = null;
            masquerPanneauSelection();
            afficherMessage('Cliquez sur un toit libre pour construire : ' + infos.nom + '.');
        });
    });
}

/**
 * Gère un clic de souris sur le Canvas. Selon le contexte, ce clic
 * sert soit à CONSTRUIRE une nouvelle unité (si un type est
 * sélectionné dans la boutique), soit à SÉLECTIONNER une unité déjà
 * posée (pour l'améliorer ou la vendre).
 */
function gererClicCanvas(evenement) {
    // Une fois la partie gagnée ou perdue, on ignore les clics : plus
    // aucune construction ni sélection n'a de sens.
    if (etatJeu === 'perdu' || etatJeu === 'gagne') return;

    // getBoundingClientRect() donne la position et la taille réelles
    // du Canvas à l'écran. On en a besoin pour convertir la position
    // de la souris (coordonnées de la fenêtre) en coordonnées à
    // l'intérieur du Canvas (coordonnées du jeu).
    const zone = canvas.getBoundingClientRect();
    const x = evenement.clientX - zone.left;
    const y = evenement.clientY - zone.top;

    // On cherche si le clic tombe à l'intérieur d'un des bâtiments.
    const batiment = BATIMENTS.find(function (b) {
        return x >= b.x && x <= b.x + b.largeur && y >= b.y && y <= b.y + b.hauteur;
    });

    if (!batiment) {
        // Clic dans le vide : on annule l'achat ou la sélection en cours.
        typeSelectionnePourAchat = null;
        uniteSelectionnee = null;
        masquerPanneauSelection();
        return;
    }

    const uniteExistante = uniteSurBatiment(batiment);

    // --- CAS 1 : le joueur est en train d'acheter une unité ---
    if (typeSelectionnePourAchat) {
        if (uniteExistante) {
            afficherMessage('Cet emplacement est déjà occupé.');
        } else {
            const infos = UNITES[typeSelectionnePourAchat];
            if (depenserArgent(infos.cout)) {
                unitesPlacees.push({
                    batiment: batiment,
                    type: typeSelectionnePourAchat,
                    niveau: 1,
                    degats: infos.degats,
                    portee: infos.portee,
                    tempsEntreTirs: infos.tempsEntreTirs,
                    cooldownRestant: 0,
                    investissementTotal: infos.cout
                });
                afficherMessage(infos.nom + ' construit(e) avec succès.');
            } else {
                afficherMessage('Fonds insuffisants pour construire ' + infos.nom + '.');
            }
        }
        typeSelectionnePourAchat = null;
        return;
    }

    // --- CAS 2 : le joueur clique sur une unité déjà posée, pour la sélectionner ---
    if (uniteExistante) {
        uniteSelectionnee = uniteExistante;
        afficherPanneauSelection(uniteExistante);
    } else {
        uniteSelectionnee = null;
        masquerPanneauSelection();
    }
}

/**
 * Affiche le panneau "Améliorer / Vendre" pour l'unité sélectionnée,
 * avec ses statistiques actuelles et le coût de chaque action.
 */
function afficherPanneauSelection(unite) {
    const infos = UNITES[unite.type];
    const panneau = document.getElementById('panneau-selection');
    const boutonAmeliorer = document.getElementById('bouton-ameliorer');
    const boutonVendre = document.getElementById('bouton-vendre');

    document.getElementById('selection-titre').textContent =
        infos.nom + ' (niveau ' + unite.niveau + ')';

    // On construit la description en ajoutant une phrase par capacité
    // présente sur ce type d'unité (une unité peut en cumuler plusieurs,
    // comme l'Unité Cynophile qui inflige des dégâts ET ralentit).
    let details = 'Portée : ' + Math.round(unite.portee) + ' px';

    if (infos.facteurRalentissement) {
        details += ' — Ralentit de ' + Math.round((1 - infos.facteurRalentissement) * 100) + '%';
    }
    if (unite.type === 'policeJudiciaire') {
        details += ' — Marque une cible (+' + Math.round((infos.bonusDegatsMarque - 1) * 100) + '% dégâts subis pendant ' + infos.dureeMarquage + 's)';
    }
    if (unite.type === 'motocycliste') {
        details += ' — Immobilise ' + infos.dureeImmobilisation + 's à l\'impact';
    }
    if (unite.degats > 0) {
        details += ' — Dégâts : ' + Math.round(unite.degats);
    }
    if (infos.rayonExplosion) {
        details += ' (zone ' + infos.rayonExplosion + ' px)';
    }

    document.getElementById('selection-details').textContent = details;
    document.getElementById('selection-barres').innerHTML = construireBarresUnite(unite);

    if (unite.niveau >= 2) {
        boutonAmeliorer.textContent = 'Niveau maximum atteint';
        boutonAmeliorer.disabled = true;
    } else {
        const coutAmelioration = Math.round(infos.cout * COUT_AMELIORATION_FACTEUR);
        boutonAmeliorer.textContent = 'Améliorer (' + coutAmelioration + ' $)';
        boutonAmeliorer.disabled = false;
    }

    const remboursement = Math.round(unite.investissementTotal * REMBOURSEMENT_VENTE_FACTEUR);
    boutonVendre.textContent = 'Vendre (+' + remboursement + ' $)';

    panneau.classList.remove('cache');
}

/** Cache le panneau "Améliorer / Vendre" (aucune unité sélectionnée). */
function masquerPanneauSelection() {
    document.getElementById('panneau-selection').classList.add('cache');
}

/**
 * Améliore l'unité actuellement sélectionnée au niveau 2 : plus de
 * dégâts et plus de portée, en échange d'argent. Une unité ne peut
 * être améliorée qu'une seule fois dans cette version du jeu.
 */
function ameliorerUniteSelectionnee() {
    if (!uniteSelectionnee || uniteSelectionnee.niveau >= 2) return;

    const infos = UNITES[uniteSelectionnee.type];
    const coutAmelioration = Math.round(infos.cout * COUT_AMELIORATION_FACTEUR);

    if (!depenserArgent(coutAmelioration)) {
        afficherMessage('Fonds insuffisants pour améliorer cette unité.');
        return;
    }

    uniteSelectionnee.niveau = 2;
    uniteSelectionnee.degats = Math.round(uniteSelectionnee.degats * BONUS_AMELIORATION_DEGATS);
    uniteSelectionnee.portee = Math.round(uniteSelectionnee.portee * BONUS_AMELIORATION_PORTEE);
    uniteSelectionnee.investissementTotal += coutAmelioration;

    afficherPanneauSelection(uniteSelectionnee); // on rafraîchit les infos affichées
    afficherMessage('Unité améliorée au niveau 2.');
}

/**
 * Vend l'unité actuellement sélectionnée : elle est retirée de la
 * carte et le joueur récupère une partie de son investissement
 * (mais pas tout : "vendue à perte", comme demandé dans le cahier
 * des charges).
 */
function vendreUniteSelectionnee() {
    if (!uniteSelectionnee) return;

    const remboursement = Math.round(uniteSelectionnee.investissementTotal * REMBOURSEMENT_VENTE_FACTEUR);
    ajouterArgent(remboursement);

    // On reconstruit le tableau unitesPlacees SANS l'unité vendue.
    unitesPlacees = unitesPlacees.filter(function (unite) {
        return unite !== uniteSelectionnee;
    });

    afficherMessage('Unité vendue (+' + remboursement + ' $).');
    uniteSelectionnee = null;
    masquerPanneauSelection();
}

/**
 * Affiche un court message d'information au joueur (ex : "Fonds
 * insuffisants"), puis l'efface automatiquement après 3 secondes.
 */
let idDisparitionMessage = null;
function afficherMessage(texte) {
    const elementMessage = document.getElementById('message-jeu');
    elementMessage.textContent = texte;

    // Si un message précédent était sur le point de disparaître, on
    // annule cette disparition pour repartir sur un nouveau délai
    // complet de 3 secondes.
    if (idDisparitionMessage) clearTimeout(idDisparitionMessage);
    idDisparitionMessage = setTimeout(function () {
        elementMessage.textContent = '';
    }, 3000);
}


/* ------------------------------------------------------------
   14. CONFIGURATION ET GÉNÉRATION DES VAGUES D'ENNEMIS
   ------------------------------------------------------------
   Une "vague" est un groupe d'ennemis qui apparaissent les uns
   après les autres, avec un petit délai entre chaque apparition
   (comme dans la plupart des Tower Defense). Plus les vagues
   avancent, plus les ennemis sont nombreux et résistants.
------------------------------------------------------------ */
const NOMBRE_TOTAL_VAGUES = 10; // les "10 niveaux" du quartier : 10 vagues de plus en plus difficiles

/**
 * Calcule la configuration (nombre d'ennemis, points de vie,
 * vitesse...) de la vague numéro "numero" (1, 2, 3...). On utilise
 * une fonction plutôt qu'une liste écrite à la main : les vagues
 * suivantes deviennent automatiquement plus difficiles, sans avoir
 * à tout retaper.
 *
 * Cette fonction tient aussi compte de la difficulté choisie sur
 * l'écran d'accueil (section 21, plus bas) et des Mods actifs
 * (section 22) : le mod "Ennemis renforcés" accélère encore plus les
 * ennemis, et le mod "Fonds municipaux doublés" double leur récompense.
 */
function creerConfigVague(numero) {
    const difficulte = DIFFICULTES[difficulteActuelle];

    let vitesse = (65 + numero * 4) * difficulte.multiplicateurVitesseEnnemi;
    let recompense = (12 + numero * 3) * difficulte.multiplicateurRecompense;

    if (modsActifs.ennemisRenforces) vitesse *= 1.4;
    if (modsActifs.argentDouble) recompense *= 2;

    return {
        nombreEnnemis: 4 + numero * 2,
        pvEnnemi: Math.round((60 + numero * 25) * difficulte.multiplicateurPvEnnemi),
        vitesse: vitesse,
        intervalleApparition: 0.9,          // secondes entre deux apparitions
        recompense: Math.round(recompense)
    };
}

// La liste des ennemis actuellement en vie sur la carte.
let ennemis = [];

let vagueActuelle = 0;          // numéro de la vague en cours (0 = aucune vague encore lancée)
let vagueEnCours = false;       // true pendant qu'une vague est active (apparitions + combat)
let configVagueActuelle = null; // les réglages (pv, vitesse...) de la vague en cours
let ennemisRestantAGenerer = 0; // combien d'ennemis de la vague actuelle n'ont pas encore surgi
let chronoProchaineApparition = 0; // temps restant (en secondes) avant la prochaine apparition

/**
 * Crée un nouvel ennemi au point de départ du chemin (CHEMIN[0])
 * et l'ajoute à la liste des ennemis en vie.
 */
function genererEnnemi(config) {
    ennemis.push({
        x: CHEMIN[0].x,
        y: CHEMIN[0].y,
        indexPointCourant: 1,     // le prochain point du CHEMIN visé par l'ennemi
        pv: config.pvEnnemi,
        pvMax: config.pvEnnemi,
        vitesseBase: config.vitesse,
        recompense: config.recompense,
        aAtteintCommissariat: false,
        marqueRestante: 0,        // secondes restantes sous l'effet "marqué" (Police Judiciaire)
        immobiliseRestante: 0     // secondes restantes totalement immobilisé (Compagnie Motocycliste)
    });
}

/**
 * Démarre la vague suivante quand le joueur clique sur le bouton
 * "Lancer la vague". Ne fait rien si une vague est déjà en cours,
 * ou si la partie est déjà gagnée/perdue.
 */
function lancerVagueSuivante() {
    if (vagueEnCours || etatJeu === 'perdu' || etatJeu === 'gagne') return;

    vagueActuelle++;
    configVagueActuelle = creerConfigVague(vagueActuelle);
    ennemisRestantAGenerer = configVagueActuelle.nombreEnnemis;
    chronoProchaineApparition = 0; // le tout premier ennemi apparaît immédiatement
    vagueEnCours = true;
    etatJeu = 'en_cours';

    mettreAJourAffichageVague();
    document.getElementById('bouton-lancer-vague').disabled = true;
    afficherMessage('Vague ' + vagueActuelle + ' lancée !');
}

/**
 * Fait avancer le minuteur d'apparition des ennemis de la vague en
 * cours, et fait surgir un nouvel ennemi quand il arrive à zéro.
 * Appelée à chaque image (frame) par la boucle de jeu, avec "dt" =
 * le temps écoulé depuis la dernière image (en secondes).
 */
function mettreAJourVague(dt) {
    if (!vagueEnCours || ennemisRestantAGenerer <= 0) return;

    chronoProchaineApparition -= dt;
    if (chronoProchaineApparition <= 0) {
        genererEnnemi(configVagueActuelle);
        ennemisRestantAGenerer--;
        chronoProchaineApparition = configVagueActuelle.intervalleApparition;
    }
}

/**
 * Vérifie si la vague en cours est terminée (plus aucun ennemi à
 * générer ET plus aucun ennemi en vie). Si c'est le cas, trois issues
 * sont possibles :
 *   1. Il reste des vagues à venir -> on repasse en 'attente'.
 *   2. C'était la 10ᵉ et dernière vague, et le mod "Vagues infinies"
 *      est actif -> on repasse en 'attente' quand même, pour que le
 *      joueur puisse continuer indéfiniment.
 *   3. C'était la 10ᵉ vague et le mod n'est PAS actif -> victoire, et
 *      les Mods sont débloqués pour les prochaines parties.
 */
function verifierFinDeVague() {
    if (!vagueEnCours) return;
    if (ennemisRestantAGenerer > 0 || ennemis.length > 0) return;

    vagueEnCours = false;

    const dernierNiveauTermine = vagueActuelle >= NOMBRE_TOTAL_VAGUES;

    if (dernierNiveauTermine && !modsActifs.vaguesInfinies) {
        etatJeu = 'gagne';
        debloquerModsSiNecessaire();
    } else {
        etatJeu = 'attente';
        document.getElementById('bouton-lancer-vague').disabled = false;
        afficherMessage(
            dernierNiveauTermine
                ? 'Vague ' + vagueActuelle + ' repoussée. Vagues infinies : continuez si vous l\'osez !'
                : 'Vague ' + vagueActuelle + ' terminée. Préparez la suivante !'
        );
    }
}


/* ------------------------------------------------------------
   15. DÉPLACEMENT DES ENNEMIS
   ------------------------------------------------------------
   Chaque ennemi avance en ligne droite vers le prochain point du
   tableau CHEMIN (son "indexPointCourant"). Une fois ce point
   atteint, il vise le point suivant, et ainsi de suite jusqu'à
   atteindre le Commissariat.

   La vitesse de déplacement dépend du temps écoulé depuis la
   dernière image (dt) : c'est ce qui permet à l'ennemi d'avancer à
   vitesse constante, que l'ordinateur affiche 30 ou 120 images par
   seconde. C'est le principe du "delta time" (temps delta), une
   technique essentielle dans TOUS les jeux vidéo en temps réel.
------------------------------------------------------------ */
function mettreAJourEnnemis(dt) {
    ennemis.forEach(function (ennemi) {
        // On fait vieillir les effets temporaires (marquage, immobilisation),
        // sans jamais descendre sous 0.
        if (ennemi.marqueRestante > 0) ennemi.marqueRestante = Math.max(0, ennemi.marqueRestante - dt);
        if (ennemi.immobiliseRestante > 0) ennemi.immobiliseRestante = Math.max(0, ennemi.immobiliseRestante - dt);

        // Un ennemi situé dans la portée d'au moins une unité de
        // ralentissement (Herse CRS ou Unité Cynophile) se déplace plus
        // lentement. Si plusieurs zones se chevauchent, on applique le
        // ralentissement le plus fort (le facteur le plus petit).
        const facteursRalentissement = unitesPlacees
            .filter(function (unite) {
                return UNITES[unite.type].facteurRalentissement &&
                    distanceEntre(centreBatiment(unite.batiment), ennemi) <= unite.portee;
            })
            .map(function (unite) {
                return UNITES[unite.type].facteurRalentissement;
            });

        let vitesse;
        if (ennemi.immobiliseRestante > 0) {
            // L'immobilisation (Compagnie Motocycliste) prime sur tout : l'ennemi ne bouge plus du tout.
            vitesse = 0;
        } else if (facteursRalentissement.length > 0) {
            vitesse = ennemi.vitesseBase * Math.min.apply(null, facteursRalentissement);
        } else {
            vitesse = ennemi.vitesseBase;
        }

        const pointCible = CHEMIN[ennemi.indexPointCourant];
        const dx = pointCible.x - ennemi.x;
        const dy = pointCible.y - ennemi.y;
        const distanceRestante = Math.sqrt(dx * dx + dy * dy);
        const pas = vitesse * dt; // distance parcourue pendant cette image

        if (pas >= distanceRestante) {
            // L'ennemi atteint (ou dépasse) le point visé : on le
            // "colle" exactement dessus, puis on passe au point suivant.
            ennemi.x = pointCible.x;
            ennemi.y = pointCible.y;
            ennemi.indexPointCourant++;

            if (ennemi.indexPointCourant >= CHEMIN.length) {
                // Il n'y a plus de point suivant : l'ennemi est arrivé
                // au Commissariat.
                ennemi.aAtteintCommissariat = true;
            }
        } else {
            // Sinon, on avance simplement d'un pas dans la bonne direction.
            // (dx / distanceRestante, dy / distanceRestante) est le
            // "vecteur direction" normalisé (longueur 1), qu'on multiplie
            // par la distance à parcourir sur cette image.
            ennemi.x += (dx / distanceRestante) * pas;
            ennemi.y += (dy / distanceRestante) * pas;
        }
    });

    // On retire de la liste tous les ennemis arrivés au Commissariat,
    // et on inflige les dégâts correspondants à la base.
    ennemis = ennemis.filter(function (ennemi) {
        if (!ennemi.aAtteintCommissariat) return true;

        pvBase = Math.max(0, pvBase - 1);
        mettreAJourAffichageVie();
        if (pvBase <= 0) etatJeu = 'perdu';

        return false; // l'ennemi disparaît de la liste
    });
}


/* ------------------------------------------------------------
   16. COMBAT DES UNITÉS POSÉES
   ------------------------------------------------------------
   À chaque image, chaque unité (sauf la Herse, qui ne tire jamais et
   se contente de ralentir) vérifie si son temps de rechargement est
   écoulé, puis cherche l'ennemi le plus proche dans sa portée. Si
   elle en trouve un, elle agit selon son type : dégâts sur une seule
   cible, dégâts de zone, marquage, ou immobilisation.
------------------------------------------------------------ */

/**
 * Inflige des dégâts à un ennemi, en tenant compte du bonus "cible
 * marquée" par la Police Judiciaire (voir UNITES.policeJudiciaire) :
 * TOUTES les unités infligent plus de dégâts à un ennemi marqué, pas
 * seulement celle qui l'a marqué. Centraliser ce calcul ici évite de
 * répéter la même vérification à chaque type d'unité qui fait des
 * dégâts.
 */
function infligerDegats(ennemi, degats) {
    const multiplicateur = ennemi.marqueRestante > 0 ? UNITES.policeJudiciaire.bonusDegatsMarque : 1;
    ennemi.pv -= degats * multiplicateur;
}

function mettreAJourUnites(dt) {
    unitesPlacees.forEach(function (unite) {
        if (unite.type === 'herse') return; // la Herse ne tire jamais, elle ralentit seulement

        if (unite.cooldownRestant > 0) {
            unite.cooldownRestant -= dt;
            return;
        }

        const centre = centreBatiment(unite.batiment);

        // On cherche, parmi tous les ennemis à portée, celui qui est
        // le plus proche de l'unité (stratégie de ciblage simple).
        let cible = null;
        let distanceMin = Infinity;
        ennemis.forEach(function (ennemi) {
            const d = distanceEntre(centre, ennemi);
            if (d <= unite.portee && d < distanceMin) {
                cible = ennemi;
                distanceMin = d;
            }
        });

        if (!cible) return; // rien à portée, l'unité attend

        const infos = UNITES[unite.type];

        if (infos.rayonExplosion) {
            // Dégâts de zone (GIGN, BAC, Section Aérienne) : TOUS les
            // ennemis proches de la cible touchée encaissent les dégâts.
            ennemis.forEach(function (ennemi) {
                if (distanceEntre(cible, ennemi) <= infos.rayonExplosion) {
                    infligerDegats(ennemi, unite.degats);
                }
            });
        } else if (unite.type === 'policeJudiciaire') {
            // Aucun dégât : on marque la cible pour que les AUTRES
            // unités lui infligent plus de dégâts pendant un moment.
            cible.marqueRestante = infos.dureeMarquage;
        } else {
            // Cas général (RAID, Police Secours, BRI, Unité Cynophile,
            // Compagnie Motocycliste) : dégâts sur une seule cible.
            infligerDegats(cible, unite.degats);
            if (unite.type === 'motocycliste') {
                cible.immobiliseRestante = infos.dureeImmobilisation;
            }
        }

        // On enregistre un petit effet visuel de tir (voir section 17).
        effetsTir.push({
            x1: centre.x, y1: centre.y,
            x2: cible.x, y2: cible.y,
            dureeRestante: 0.15,
            dureeInitiale: 0.15,
            couleur: infos.couleur
        });

        unite.cooldownRestant = unite.tempsEntreTirs;
    });

    // On retire les ennemis tués pendant ce combat, et on récompense
    // le joueur pour chacun d'eux.
    ennemis = ennemis.filter(function (ennemi) {
        if (ennemi.pv > 0) return true;

        ajouterArgent(ennemi.recompense);
        return false;
    });
}


/* ------------------------------------------------------------
   17. EFFETS VISUELS (LES TIRS)
   ------------------------------------------------------------
   Pour que le combat soit lisible, chaque tir affiche brièvement
   un petit trait coloré entre l'unité et sa cible. Chaque effet ne
   dure que 0.15 seconde puis disparaît tout seul.
------------------------------------------------------------ */
let effetsTir = [];

/** Fait vieillir tous les effets de tir, et retire ceux qui sont terminés. */
function mettreAJourEffets(dt) {
    effetsTir.forEach(function (effet) {
        effet.dureeRestante -= dt;
    });
    effetsTir = effetsTir.filter(function (effet) {
        return effet.dureeRestante > 0;
    });
}


/* ------------------------------------------------------------
   18. ÉTAT GÉNÉRAL DE LA PARTIE (VIE DU COMMISSARIAT, VICTOIRE/DÉFAITE)
   ------------------------------------------------------------
   "etatJeu" résume à tout moment la situation de la partie :
     - 'attente'   : entre deux vagues, en attente que le joueur clique sur "Lancer la vague"
     - 'en_cours'  : une vague est active (ennemis en approche)
     - 'gagne'     : toutes les vagues ont été repoussées
     - 'perdu'     : le Commissariat n'a plus de points de vie
------------------------------------------------------------ */
let pvBase = 20;      // points de vie du Commissariat
const PV_BASE_MAX = 20;
let etatJeu = 'attente';

const elementVie = document.getElementById('vie-valeur');
const elementVagueValeur = document.getElementById('vague-valeur');
const elementVagueTotal = document.getElementById('vague-total');

/** Met à jour l'affichage des points de vie du Commissariat dans le HUD. */
function mettreAJourAffichageVie() {
    elementVie.textContent = pvBase;
}

/** Met à jour l'affichage du numéro de vague en cours dans le HUD. */
function mettreAJourAffichageVague() {
    elementVagueValeur.textContent = vagueActuelle;
}


/* ------------------------------------------------------------
   19. DESSIN DYNAMIQUE (UNITÉS, ENNEMIS, EFFETS, ÉCRAN DE FIN)
   ------------------------------------------------------------
   Ces fonctions dessinent tout ce qui BOUGE ou change pendant la
   partie, en plus de la carte statique déjà gérée par
   dessinerCarte() (section 10). dessinerScene() les assemble
   toutes dans le bon ordre, comme dessinerCarte() le faisait pour
   le décor.
------------------------------------------------------------ */

/**
 * Dessine le portrait d'une unité sous forme d'un avatar rond, avec
 * un anneau de la couleur propre à son type (pour rester identifiable
 * d'un coup d'œil même à petite taille). L'image est recadrée en
 * "cover" : on prend un carré au centre-haut de l'image source (là où
 * se trouve le visage sur nos portraits) et on l'étire pour remplir
 * exactement le cercle, sans jamais déformer les proportions.
 */
function dessinerAvatarUnite(img, cx, cy, rayon, couleurAnneau) {
    // Le socle sombre, toujours visible même si l'image n'est pas encore chargée.
    ctx.beginPath();
    ctx.arc(cx, cy, rayon, 0, Math.PI * 2);
    ctx.fillStyle = '#1c1f24';
    ctx.fill();

    if (img.complete && img.naturalWidth > 0) {
        const cote = Math.min(img.naturalWidth, img.naturalHeight);
        const decalageX = (img.naturalWidth - cote) / 2;

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, rayon - 2, 0, Math.PI * 2);
        ctx.clip(); // tout ce qui est dessiné ensuite reste à l'intérieur du cercle
        ctx.drawImage(
            img,
            decalageX, 0, cote, cote,      // carré source (centré horizontalement, aligné en haut)
            cx - rayon, cy - rayon, rayon * 2, rayon * 2 // destination : remplit le cercle
        );
        ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(cx, cy, rayon, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = couleurAnneau;
    ctx.stroke();
}

/** Dessine chaque unité posée sur son bâtiment, avec son portrait en avatar rond. */
function dessinerUnitesPlacees() {
    unitesPlacees.forEach(function (unite) {
        const centre = centreBatiment(unite.batiment);
        const infos = UNITES[unite.type];

        // Si cette unité est sélectionnée, on affiche un cercle en
        // pointillés pour visualiser sa portée de tir.
        if (unite === uniteSelectionnee) {
            ctx.beginPath();
            ctx.arc(centre.x, centre.y, unite.portee, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.lineWidth = 1;
            ctx.setLineDash([6, 6]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        dessinerAvatarUnite(PORTRAITS_UNITES[unite.type], centre.x, centre.y, 20, infos.couleur);

        // Petit badge doré pour indiquer une unité améliorée (niveau 2).
        if (unite.niveau === 2) {
            ctx.beginPath();
            ctx.arc(centre.x + 14, centre.y - 14, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffd166';
            ctx.fill();
        }
    });
}

/** Dessine chaque ennemi (cercle + petite barre de vie au-dessus). */
function dessinerEnnemis() {
    ennemis.forEach(function (ennemi) {
        ctx.beginPath();
        ctx.arc(ennemi.x, ennemi.y, 12, 0, Math.PI * 2);
        ctx.fillStyle = '#7c2d3a';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // La barre de vie : un fond gris, puis un remplissage coloré
        // dont la largeur dépend du pourcentage de vie restant.
        const largeurBarre = 26;
        const ratioVie = Math.max(0, ennemi.pv / ennemi.pvMax);

        ctx.fillStyle = '#2b2f36';
        ctx.fillRect(ennemi.x - largeurBarre / 2, ennemi.y - 22, largeurBarre, 5);

        ctx.fillStyle = ratioVie > 0.3 ? '#4caf50' : '#e63946';
        ctx.fillRect(ennemi.x - largeurBarre / 2, ennemi.y - 22, largeurBarre * ratioVie, 5);

        // Anneau brun/beige autour d'un ennemi "marqué" par la Police
        // Judiciaire (il subit plus de dégâts tant que l'anneau est visible).
        if (ennemi.marqueRestante > 0) {
            ctx.beginPath();
            ctx.arc(ennemi.x, ennemi.y, 16, 0, Math.PI * 2);
            ctx.strokeStyle = UNITES.policeJudiciaire.couleur;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Anneau jaune autour d'un ennemi immobilisé par la Compagnie
        // Motocycliste (il ne peut plus avancer tant que l'anneau est visible).
        if (ennemi.immobiliseRestante > 0) {
            ctx.beginPath();
            ctx.arc(ennemi.x, ennemi.y, 16, 0, Math.PI * 2);
            ctx.strokeStyle = UNITES.motocycliste.couleur;
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    });
}

/** Dessine les petits traits de tir enregistrés dans effetsTir. */
function dessinerEffetsTir() {
    effetsTir.forEach(function (effet) {
        // L'opacité (globalAlpha) diminue avec le temps restant, ce qui
        // donne un effet de "fondu" au trait de tir avant sa disparition.
        ctx.globalAlpha = effet.dureeRestante / effet.dureeInitiale;

        ctx.beginPath();
        ctx.moveTo(effet.x1, effet.y1);
        ctx.lineTo(effet.x2, effet.y2);
        ctx.strokeStyle = effet.couleur;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.globalAlpha = 1; // on remet l'opacité normale pour la suite des dessins
    });
}

// Le grand emblème "gyrophares" affiché sur l'écran de victoire (voir
// fichier-images-personnages-graphisme.md, section 2.1 pour son prompt).
const LOGO_VICTOIRE = new Image();
LOGO_VICTOIRE.src = 'images/logo.png';

/**
 * Affiche un grand message centré (GAME OVER / VICTOIRE) par-dessus
 * toute la scène. Sur la victoire uniquement, le grand emblème du jeu
 * est affiché au-dessus du texte, pour une sortie plus mémorable.
 */
function dessinerEcranFin(texte, couleur) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, LARGEUR_CANVAS, HAUTEUR_CANVAS);

    if (etatJeu === 'gagne') {
        dessinerImageCentree(LOGO_VICTOIRE, LARGEUR_CANVAS / 2, HAUTEUR_CANVAS / 2 - 110, 160);
    }

    ctx.fillStyle = couleur;
    ctx.font = 'bold 48px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(texte, LARGEUR_CANVAS / 2, HAUTEUR_CANVAS / 2);

    // On remet les réglages de texte par défaut pour ne pas perturber
    // d'éventuels futurs textes dessinés ailleurs.
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
}

/**
 * Assemble et dessine l'intégralité de la scène de jeu, image par
 * image : la carte statique, puis les unités, puis les effets de
 * tir, puis les ennemis par-dessus, et enfin l'écran de fin si la
 * partie est gagnée ou perdue.
 */
function dessinerScene() {
    dessinerCarte();
    dessinerUnitesPlacees();
    dessinerEffetsTir();
    dessinerEnnemis();

    if (etatJeu === 'perdu') dessinerEcranFin('GAME OVER', '#e63946');
    if (etatJeu === 'gagne') dessinerEcranFin('VICTOIRE !', '#4d9dff');
}


/* ------------------------------------------------------------
   20. LA BOUCLE DE JEU (GAME LOOP)
   ------------------------------------------------------------
   Jusqu'ici, tout notre code ne s'exécutait qu'une seule fois. Pour
   qu'un jeu "vive" (les ennemis avancent, les unités tirent...), il
   faut répéter en continu deux actions : METTRE À JOUR l'état du
   jeu, puis le DESSINER. C'est le rôle de cette boucle.

   requestAnimationFrame(boucleJeu) demande au navigateur d'appeler
   la fonction boucleJeu() juste avant le prochain rafraîchissement
   de l'écran (en général 60 fois par seconde). À la fin de
   boucleJeu(), on rappelle requestAnimationFrame(boucleJeu) pour
   programmer l'image suivante : c'est ce qui crée la boucle.

   "dt" (delta time) = le temps écoulé depuis l'image précédente,
   en secondes. On l'utilise pour que les déplacements et les tirs
   restent à vitesse constante, peu importe la rapidité de
   l'ordinateur du joueur.
------------------------------------------------------------ */
let dernierTemps = null;

function boucleJeu(tempsActuel) {
    if (dernierTemps === null) dernierTemps = tempsActuel;

    // On limite dt à 0.1s maximum : si le navigateur a mis l'onglet en
    // pause quelques secondes (ex : changement d'onglet), on évite que
    // tout le jeu fasse un immense bond en avant d'un coup au retour.
    const dt = Math.min((tempsActuel - dernierTemps) / 1000, 0.1);
    dernierTemps = tempsActuel;

    if (etatJeu === 'en_cours') {
        mettreAJourVague(dt);
        mettreAJourEnnemis(dt);
        mettreAJourUnites(dt);
        mettreAJourEffets(dt);
        verifierFinDeVague();
    }

    dessinerScene();

    requestAnimationFrame(boucleJeu);
}


/* ------------------------------------------------------------
   21. LA DIFFICULTÉ (choisie sur l'écran d'accueil)
   ------------------------------------------------------------
   Avant même de commencer à jouer, le joueur choisit un niveau de
   difficulté sur l'écran d'accueil (voir index.html, #ecran-accueil).
   Ce choix ajuste l'argent de départ ainsi que la résistance, la
   vitesse et la récompense des ennemis, via des "multiplicateurs"
   (des nombres par lesquels on multiplie une valeur de base : 1 =
   inchangé, 1.5 = +50%, 0.7 = -30%...).

   Comme pour UNITES et MODS plus haut, tout est regroupé dans un
   seul objet DIFFICULTES : c'est notre unique source de vérité pour
   le nom, la description et les réglages de chaque difficulté.
------------------------------------------------------------ */
const DIFFICULTES = {
    facile: {
        nom: 'Agent stagiaire',
        description: 'Ennemis plus lents et moins résistants. Fonds de départ généreux. Idéal pour découvrir le jeu.',
        multiplicateurPvEnnemi: 0.7,
        multiplicateurVitesseEnnemi: 0.85,
        multiplicateurRecompense: 1.15,
        multiplicateurArgentDepart: 1.3
    },
    normal: {
        nom: 'Officier de police',
        description: "L'expérience Alerte Police Secours classique et équilibrée.",
        multiplicateurPvEnnemi: 1,
        multiplicateurVitesseEnnemi: 1,
        multiplicateurRecompense: 1,
        multiplicateurArgentDepart: 1
    },
    difficile: {
        nom: 'Chef de la Brigade',
        description: 'Ennemis nettement plus rapides et résistants. Fonds de départ réduits. Réservé aux meilleurs agents.',
        multiplicateurPvEnnemi: 1.6,
        multiplicateurVitesseEnnemi: 1.25,
        multiplicateurRecompense: 0.9,
        multiplicateurArgentDepart: 0.75
    }
};

// La difficulté actuellement sélectionnée (une des clés de DIFFICULTES
// ci-dessus). "normal" par défaut, tant que le joueur n'a rien choisi.
let difficulteActuelle = 'normal';

/**
 * Construit l'écran d'accueil (une carte cliquable par difficulté) à
 * partir de l'objet DIFFICULTES. Chaque carte affiche son nom, sa
 * description, et de petites jauges visuelles (résistance, vitesse,
 * fonds de départ) pour comparer les difficultés d'un coup d'œil.
 *
 * Comme pour initialiserPanneauMods(), on construit ici du HTML à
 * partir de nos propres données de configuration (jamais d'une
 * saisie utilisateur) : voir la remarque sur .innerHTML un peu plus
 * bas dans ce fichier pour le détail de cette précaution.
 */
function initialiserEcranAccueil() {
    const conteneur = document.getElementById('liste-difficultes');

    conteneur.innerHTML = Object.keys(DIFFICULTES).map(function (cle) {
        const d = DIFFICULTES[cle];
        return '<button class="carte-difficulte" data-difficulte="' + cle + '">' +
            '<span class="carte-difficulte-nom">' + d.nom + '</span>' +
            '<span class="carte-difficulte-description">' + d.description + '</span>' +
            construireJauge('Résistance ennemis', d.multiplicateurPvEnnemi / 1.6) +
            construireJauge('Vitesse ennemis', d.multiplicateurVitesseEnnemi / 1.25) +
            construireJauge('Fonds de départ', d.multiplicateurArgentDepart / 1.3) +
            '</button>';
    }).join('');

    conteneur.querySelectorAll('.carte-difficulte').forEach(function (carte) {
        carte.addEventListener('click', function () {
            demarrerPartieAvecDifficulte(carte.dataset.difficulte);
        });
    });
}

/**
 * Construit le petit bloc HTML "libellé + jauge remplie à X%" utilisé
 * dans chaque carte de difficulté. "ratio" doit être un nombre entre
 * 0 et 1 (0% à 100% de remplissage).
 */
function construireJauge(libelle, ratio) {
    const pourcentage = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
    return '<span class="carte-difficulte-jauge">' + libelle +
        '<span class="jauge-fond"><span class="jauge-remplissage" style="width:' + pourcentage + '%"></span></span>' +
        '</span>';
}

/**
 * Appelée quand le joueur clique sur une carte de difficulté : on
 * mémorise son choix, on masque l'écran d'accueil, et on (re)démarre
 * une partie propre avec reinitialiserPartie() (voir section 24), qui
 * tient compte de "difficulteActuelle" pour calculer l'argent de
 * départ et la force des ennemis.
 */
function demarrerPartieAvecDifficulte(cle) {
    difficulteActuelle = cle;
    document.getElementById('ecran-accueil').classList.add('cache');
    reinitialiserPartie();
    afficherMessage('Difficulté sélectionnée : ' + DIFFICULTES[cle].nom + '.');
}


/* ------------------------------------------------------------
   22. LES MODS (débloqués après avoir terminé les 10 niveaux)
   ------------------------------------------------------------
   Un "mod" (pour "modificateur") est une variante de règles que le
   joueur peut activer avant de rejouer, pour changer l'expérience
   de jeu. Ici, ils ne sont accessibles qu'APRÈS une première
   victoire (les 10 vagues repoussées sans le mod "Vagues infinies").

   On utilise "localStorage", une mémoire du navigateur qui garde
   ses valeurs même après avoir fermé l'onglet ou éteint
   l'ordinateur (contrairement aux variables JavaScript classiques,
   effacées à chaque rechargement de la page). C'est ce qui permet
   de ne pas avoir à re-terminer les 10 niveaux à chaque visite.
------------------------------------------------------------ */

// Les clés utilisées pour ranger nos informations dans localStorage.
// On préfixe toujours nos clés (ici "alertePoliceSecours_") pour
// éviter d'entrer en conflit avec d'autres données du navigateur.
const CLE_MODS_DEBLOQUES = 'alertePoliceSecours_modsDebloques';
const CLE_MODS_ACTIFS = 'alertePoliceSecours_modsActifs';

// Le catalogue des mods disponibles, sur le même principe que UNITES :
// une seule source de vérité pour le nom et la description de chacun.
const MODS = {
    argentDouble: {
        nom: 'Fonds municipaux doublés',
        description: "L'argent de départ et les récompenses des ennemis sont doublés."
    },
    renfortDepart: {
        nom: 'Renfort de départ',
        description: '+300 $ de fonds municipaux supplémentaires dès le début de la partie.'
    },
    ennemisRenforces: {
        nom: 'Ennemis renforcés',
        description: 'Les ennemis se déplacent 40% plus vite. Un vrai défi pour les meilleurs agents.'
    },
    vaguesInfinies: {
        nom: 'Vagues infinies',
        description: "Après la 10ᵉ vague, de nouvelles vagues continuent d'arriver sans fin, encore et encore plus difficiles. Combien de temps tiendrez-vous ?"
    }
};

// true si le joueur a déjà terminé les 10 niveaux au moins une fois
// (dans cette partie ou lors d'une visite précédente).
let modsDebloques = localStorage.getItem(CLE_MODS_DEBLOQUES) === 'true';

// L'état actuel (activé/désactivé) de chaque mod. On relit d'abord ce
// qui est sauvegardé dans localStorage, puis on s'assure que chaque
// mod du catalogue MODS a bien une valeur (au cas où on ajouterait un
// nouveau mod plus tard, après une sauvegarde plus ancienne).
let modsActifs = JSON.parse(localStorage.getItem(CLE_MODS_ACTIFS) || '{}');
Object.keys(MODS).forEach(function (cle) {
    if (typeof modsActifs[cle] !== 'boolean') modsActifs[cle] = false;
});

/**
 * Calcule l'argent de départ d'une partie, en tenant compte de la
 * difficulté choisie sur l'écran d'accueil, puis des mods "Fonds
 * municipaux doublés" et "Renfort de départ" s'ils sont actifs.
 */
function calculerArgentDepart() {
    let depart = Math.round(300 * DIFFICULTES[difficulteActuelle].multiplicateurArgentDepart);
    if (modsActifs.argentDouble) depart *= 2;
    if (modsActifs.renfortDepart) depart += 300;
    return depart;
}

/**
 * Construit le panneau Mods (une ligne par mod, avec sa case à
 * cocher) à partir de l'objet MODS. Comme pour initialiserBoutique(),
 * on ne veut écrire chaque nom/description qu'à un seul endroit.
 *
 * Remarque pédagogique : on construit ici du texte HTML directement
 * (innerHTML) à partir de nos propres données. C'est pratique et sans
 * danger UNIQUEMENT parce que ce texte vient de notre catalogue MODS,
 * jamais d'une saisie tapée par un utilisateur. Il ne faut JAMAIS
 * faire ça avec du texte venant d'un formulaire ou d'Internet, car un
 * utilisateur malveillant pourrait y glisser du code (faille dite
 * "XSS") : dans ce cas, on utilise .textContent à la place.
 */
function initialiserPanneauMods() {
    const conteneur = document.getElementById('liste-mods');

    conteneur.innerHTML = Object.keys(MODS).map(function (cle) {
        const infos = MODS[cle];
        const coche = modsActifs[cle] ? ' checked' : '';
        return '<label class="ligne-mod">' +
            '<input type="checkbox" data-mod="' + cle + '"' + coche + '>' +
            '<span><strong>' + infos.nom + '</strong> — ' + infos.description + '</span>' +
            '</label>';
    }).join('');

    // On rebranche un écouteur sur chaque nouvelle case à cocher créée
    // ci-dessus, pour mémoriser le choix du joueur dans localStorage.
    conteneur.querySelectorAll('input[type="checkbox"]').forEach(function (case_) {
        case_.addEventListener('change', function () {
            modsActifs[case_.dataset.mod] = case_.checked;
            localStorage.setItem(CLE_MODS_ACTIFS, JSON.stringify(modsActifs));
        });
    });
}

/** Révèle le panneau Mods (retire la classe "cache" qui le masquait). */
function afficherPanneauMods() {
    document.getElementById('panneau-mods').classList.remove('cache');
}

/**
 * Appelée à chaque victoire (voir verifierFinDeVague, section 14).
 * La toute première fois, elle débloque définitivement les Mods,
 * mémorise ce déblocage dans localStorage, et prévient le joueur.
 * Les fois suivantes, elle ne fait rien (les Mods restent débloqués).
 */
function debloquerModsSiNecessaire() {
    if (modsDebloques) return;

    modsDebloques = true;
    localStorage.setItem(CLE_MODS_DEBLOQUES, 'true');
    afficherPanneauMods();
    afficherMessage('Bravo, agent ! Les 10 niveaux sont terminés : les Mods sont débloqués.');
}


/* ------------------------------------------------------------
   23. REJOUER (RÉINITIALISER UNE PARTIE)
   ------------------------------------------------------------
   Remet tout l'état du jeu à zéro (argent, vie du Commissariat,
   vagues, ennemis, unités posées...) pour démarrer une toute
   nouvelle partie, en tenant compte des mods actuellement cochés
   dans le panneau Mods.
------------------------------------------------------------ */
function reinitialiserPartie() {
    argent = calculerArgentDepart();
    mettreAJourAffichageArgent();

    pvBase = PV_BASE_MAX;
    mettreAJourAffichageVie();

    vagueActuelle = 0;
    vagueEnCours = false;
    configVagueActuelle = null;
    ennemisRestantAGenerer = 0;
    chronoProchaineApparition = 0;
    mettreAJourAffichageVague();
    elementVagueTotal.textContent = modsActifs.vaguesInfinies ? '∞' : NOMBRE_TOTAL_VAGUES;

    ennemis = [];
    unitesPlacees = [];
    effetsTir = [];

    typeSelectionnePourAchat = null;
    uniteSelectionnee = null;
    masquerPanneauSelection();

    etatJeu = 'attente';
    document.getElementById('bouton-lancer-vague').disabled = false;

    const auMoinsUnModActif = Object.keys(modsActifs).some(function (cle) {
        return modsActifs[cle];
    });
    afficherMessage(
        'Nouvelle partie (' + DIFFICULTES[difficulteActuelle].nom + ')' +
        (auMoinsUnModActif ? ' avec mods actifs.' : '.')
    );
}


/* ------------------------------------------------------------
   24. LANCEMENT INITIAL
   ------------------------------------------------------------
   On branche les derniers écouteurs d'événements (clic sur le
   Canvas, boutons "Lancer la vague" / "Améliorer" / "Vendre" /
   "Rejouer" / "Changer la difficulté"), on prépare l'écran d'accueil,
   la boutique et le panneau Mods, on initialise l'affichage du HUD
   avec les valeurs de départ, puis on démarre la boucle de jeu pour
   de bon. L'écran d'accueil (visible par défaut, voir index.html)
   empêche le joueur d'agir tant qu'il n'a pas choisi une difficulté.
------------------------------------------------------------ */
canvas.addEventListener('click', gererClicCanvas);
document.getElementById('bouton-lancer-vague').addEventListener('click', lancerVagueSuivante);
document.getElementById('bouton-ameliorer').addEventListener('click', ameliorerUniteSelectionnee);
document.getElementById('bouton-vendre').addEventListener('click', vendreUniteSelectionnee);
document.getElementById('bouton-rejouer').addEventListener('click', reinitialiserPartie);
document.getElementById('bouton-changer-difficulte').addEventListener('click', function () {
    document.getElementById('ecran-accueil').classList.remove('cache');
});

initialiserEcranAccueil();
initialiserBoutique();
initialiserPanneauMods();
if (modsDebloques) afficherPanneauMods();

argent = calculerArgentDepart(); // tient compte de la difficulté et des mods déjà choisis lors d'une précédente visite
mettreAJourAffichageArgent();
mettreAJourAffichageVie();
mettreAJourAffichageVague();
elementVagueTotal.textContent = modsActifs.vaguesInfinies ? '∞' : NOMBRE_TOTAL_VAGUES;

requestAnimationFrame(boucleJeu);
