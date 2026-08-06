/*
    ============================================================
    FICHIER : script.js
    RÔLE    : C'est le "cerveau" du jeu. Tout ce qui bouge, se
              calcule ou se dessine est piloté depuis ce fichier.

    ÉTAPE ACTUELLE DU PROJET :
    On se contente ici d'initialiser le Canvas et de dessiner une
    première carte simple : un quartier urbain vu de dessus, avec
    des rues qui se croisent, des toits de bâtiments, et le
    Commissariat Central (la base à défendre) à l'arrivée du chemin.

    Il n'y a encore ni ennemis, ni argent, ni unités posables :
    uniquement du dessin statique, pour poser le décor.
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
   11. LANCEMENT INITIAL
   ------------------------------------------------------------
   Pour l'instant, le jeu n'a pas encore de "boucle d'animation"
   (pas besoin, puisque rien ne bouge). On appelle donc la fonction
   de dessin une seule fois, dès que le script se charge, afin
   d'afficher la carte de base à l'écran.
------------------------------------------------------------ */
dessinerCarte();
