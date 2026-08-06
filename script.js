/*
    ============================================================
    FICHIER : script.js
    RÔLE    : C'est le "cerveau" du jeu. Tout ce qui bouge, se
              calcule ou se dessine est piloté depuis ce fichier.

    CONTENU DU JEU COMPLET :
    - La carte : un quartier urbain vu de dessus, avec des rues qui
      se croisent, des toits de bâtiments, et le Commissariat
      Central (la base à défendre) à l'arrivée du chemin.
    - Le système d'argent (gagner/dépenser).
    - Les vagues d'ennemis qui se déplacent le long du chemin.
    - Les unités posables sur les toits (Tireur de précision,
      Unité lourde, Herse routière), avec achat, amélioration et
      vente.
    - Les points de vie du Commissariat, la victoire et la défaite.

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
const COULEUR_TOIT_BASE = '#7a5230';     // Couleur principale des toits de bâtiments (tuiles/brique)
const COULEUR_TOIT_BORD = '#4d3420';     // Couleur du contour des toits (ombre portée)
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
   Parcourt le tableau BATIMENTS et dessine chaque toit sous forme
   d'un rectangle avec une petite bordure sombre (effet d'ombre
   portée), pour qu'on distingue bien chaque bâtiment vu de dessus.

   Cette fonction ajoute aussi un indice visuel : si le joueur a
   sélectionné un type d'unité dans la boutique (variable
   "typeSelectionnePourAchat", définie plus bas dans le fichier) et
   qu'un toit est encore libre (aucune unité dessus), on l'entoure
   d'un contour doré en pointillés pour indiquer "vous pouvez
   construire ici".
------------------------------------------------------------ */
function dessinerBatiments() {
    // forEach parcourt chaque élément du tableau BATIMENTS un par un.
    // "batiment" représente ici l'objet { x, y, largeur, hauteur } en cours.
    BATIMENTS.forEach(function (batiment) {
        // Le toit lui-même (rectangle plein)
        ctx.fillStyle = COULEUR_TOIT_BASE;
        ctx.fillRect(batiment.x, batiment.y, batiment.largeur, batiment.hauteur);

        // Le contour du toit (donne un effet de relief/ombre)
        ctx.strokeStyle = COULEUR_TOIT_BORD;
        ctx.lineWidth = 3;
        ctx.strokeRect(batiment.x, batiment.y, batiment.largeur, batiment.hauteur);

        // Une petite ligne centrale pour évoquer le faîte du toit
        // (la ligne qui sépare les deux pans d'un toit en pente)
        ctx.beginPath();
        ctx.moveTo(batiment.x, batiment.y + batiment.hauteur / 2);
        ctx.lineTo(batiment.x + batiment.largeur, batiment.y + batiment.hauteur / 2);
        ctx.strokeStyle = COULEUR_TOIT_BORD;
        ctx.lineWidth = 1;
        ctx.stroke();

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
     4. Le point de départ (par-dessus tout, pour rester visible)
     5. Le Commissariat (par-dessus tout, pour rester visible)

   Si on inversait l'ordre, par exemple en dessinant le sol en
   dernier, il recouvrirait tout le reste !
------------------------------------------------------------ */
function dessinerCarte() {
    dessinerFond();
    dessinerRues();
    dessinerBatiments();
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
   - rayonExplosion    : (Unité lourde uniquement) rayon dans lequel
                         les dégâts touchent TOUS les ennemis proches
   - facteurRalentissement : (Herse uniquement) multiplicateur de
                         vitesse appliqué aux ennemis dans sa portée
                         (0.45 = ils ne gardent que 45% de leur vitesse)
------------------------------------------------------------ */
const UNITES = {
    tireur: {
        nom: 'Tireur de précision',
        cout: 120,
        degats: 45,
        portee: 170,
        tempsEntreTirs: 1.1,
        couleur: '#e63946'
    },
    lourd: {
        nom: 'Unité lourde',
        cout: 160,
        degats: 18,
        portee: 130,
        tempsEntreTirs: 0.7,
        rayonExplosion: 55,
        couleur: '#f4a259'
    },
    herse: {
        nom: 'Herse routière',
        cout: 70,
        degats: 0,
        portee: 90,
        tempsEntreTirs: 0,
        facteurRalentissement: 0.45,
        couleur: '#8d99ae'
    }
};

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

/**
 * Remplit les boutons de la boutique (HTML) avec le nom et le prix
 * de chaque type d'unité, en lisant directement l'objet UNITES.
 * Ainsi, si on change un prix dans UNITES, la boutique se met à
 * jour toute seule, sans avoir à modifier le fichier HTML.
 */
function initialiserBoutique() {
    document.querySelectorAll('.bouton-unite').forEach(function (bouton) {
        const infos = UNITES[bouton.dataset.type];
        bouton.querySelector('.bouton-unite-nom').textContent = infos.nom;
        bouton.querySelector('.bouton-unite-cout').textContent = infos.cout + ' $';

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

    let details = 'Portée : ' + Math.round(unite.portee) + ' px';
    if (unite.type === 'herse') {
        details += ' — Ralentit les ennemis de ' + Math.round((1 - infos.facteurRalentissement) * 100) + '%';
    } else {
        details += ' — Dégâts : ' + Math.round(unite.degats);
    }
    document.getElementById('selection-details').textContent = details;

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
const NOMBRE_TOTAL_VAGUES = 6;

/**
 * Calcule la configuration (nombre d'ennemis, points de vie,
 * vitesse...) de la vague numéro "numero" (1, 2, 3...). On utilise
 * une fonction plutôt qu'une liste écrite à la main : les vagues
 * suivantes deviennent automatiquement plus difficiles, sans avoir
 * à tout retaper.
 */
function creerConfigVague(numero) {
    return {
        nombreEnnemis: 4 + numero * 2,
        pvEnnemi: 60 + numero * 25,
        vitesse: 65 + numero * 4,          // pixels par seconde
        intervalleApparition: 0.9,          // secondes entre deux apparitions
        recompense: 12 + numero * 3         // argent gagné par ennemi éliminé
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
        aAtteintCommissariat: false
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
 * générer ET plus aucun ennemi en vie). Si c'est le cas, soit on
 * prépare la vague suivante, soit on déclare la victoire si
 * c'était la dernière vague.
 */
function verifierFinDeVague() {
    if (!vagueEnCours) return;
    if (ennemisRestantAGenerer > 0 || ennemis.length > 0) return;

    vagueEnCours = false;

    if (vagueActuelle >= NOMBRE_TOTAL_VAGUES) {
        etatJeu = 'gagne';
    } else {
        etatJeu = 'attente';
        document.getElementById('bouton-lancer-vague').disabled = false;
        afficherMessage('Vague ' + vagueActuelle + ' terminée. Préparez la suivante !');
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
        // Un ennemi situé dans la portée d'au moins une Herse routière
        // se déplace plus lentement (voir UNITES.herse.facteurRalentissement).
        const estRalenti = unitesPlacees.some(function (unite) {
            return unite.type === 'herse' &&
                distanceEntre(centreBatiment(unite.batiment), ennemi) <= unite.portee;
        });
        const vitesse = ennemi.vitesseBase * (estRalenti ? UNITES.herse.facteurRalentissement : 1);

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
   À chaque image, chaque unité (sauf la Herse, qui ne tire jamais)
   vérifie si son temps de rechargement est écoulé, puis cherche
   l'ennemi le plus proche dans sa portée. Si elle en trouve un,
   elle tire : dégâts directs pour le Tireur de précision, dégâts
   de zone pour l'Unité lourde.
------------------------------------------------------------ */
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

        if (unite.type === 'tireur') {
            // Dégâts sur une seule cible.
            cible.pv -= unite.degats;
        } else if (unite.type === 'lourd') {
            // Dégâts de zone : TOUS les ennemis proches de la cible
            // touchée encaissent les dégâts, pas seulement elle.
            ennemis.forEach(function (ennemi) {
                if (distanceEntre(cible, ennemi) <= UNITES.lourd.rayonExplosion) {
                    ennemi.pv -= unite.degats;
                }
            });
        }

        // On enregistre un petit effet visuel de tir (voir section 17).
        effetsTir.push({
            x1: centre.x, y1: centre.y,
            x2: cible.x, y2: cible.y,
            dureeRestante: 0.15,
            dureeInitiale: 0.15,
            couleur: UNITES[unite.type].couleur
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

/** Dessine chaque unité posée sur son bâtiment, avec une forme selon son type. */
function dessinerUnitesPlacees() {
    unitesPlacees.forEach(function (unite) {
        const centre = centreBatiment(unite.batiment);

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

        // Le socle sombre commun à toutes les unités.
        ctx.beginPath();
        ctx.arc(centre.x, centre.y, 20, 0, Math.PI * 2);
        ctx.fillStyle = '#1c1f24';
        ctx.fill();

        ctx.fillStyle = UNITES[unite.type].couleur;

        if (unite.type === 'tireur') {
            // Un triangle façon "viseur de précision".
            ctx.beginPath();
            ctx.moveTo(centre.x, centre.y - 12);
            ctx.lineTo(centre.x - 10, centre.y + 8);
            ctx.lineTo(centre.x + 10, centre.y + 8);
            ctx.closePath();
            ctx.fill();
        } else if (unite.type === 'lourd') {
            // Un carré massif pour l'unité lourde à dégâts de zone.
            ctx.fillRect(centre.x - 12, centre.y - 12, 24, 24);
        } else if (unite.type === 'herse') {
            // Une série de petites barres verticales, façon herse au sol.
            for (let i = -12; i <= 12; i += 6) {
                ctx.fillRect(centre.x + i - 1, centre.y - 12, 2, 24);
            }
        }

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

/** Affiche un grand message centré (GAME OVER / VICTOIRE) par-dessus toute la scène. */
function dessinerEcranFin(texte, couleur) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, LARGEUR_CANVAS, HAUTEUR_CANVAS);

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
   21. LANCEMENT INITIAL
   ------------------------------------------------------------
   On branche les derniers écouteurs d'événements (clic sur le
   Canvas, boutons "Lancer la vague" / "Améliorer" / "Vendre"), on
   initialise l'affichage du HUD avec les valeurs de départ, puis on
   démarre la boucle de jeu pour de bon.
------------------------------------------------------------ */
canvas.addEventListener('click', gererClicCanvas);
document.getElementById('bouton-lancer-vague').addEventListener('click', lancerVagueSuivante);
document.getElementById('bouton-ameliorer').addEventListener('click', ameliorerUniteSelectionnee);
document.getElementById('bouton-vendre').addEventListener('click', vendreUniteSelectionnee);

initialiserBoutique();
mettreAJourAffichageArgent();
mettreAJourAffichageVie();
mettreAJourAffichageVague();
elementVagueTotal.textContent = NOMBRE_TOTAL_VAGUES;

requestAnimationFrame(boucleJeu);
