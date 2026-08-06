/*
    ============================================================
    FICHIER : script.js
    RÔLE    : C'est le "cerveau" du jeu. Tout ce qui bouge, se
              calcule ou se dessine est piloté depuis ce fichier.

    ÉTAPE ACTUELLE DU PROJET :
    On se contente ici d'initialiser le Canvas et de dessiner la
    carte de base (le fond + le chemin sinueux que suivront les
    ennemis plus tard). Il n'y a encore ni ennemis, ni tourelles,
    ni logique de jeu : uniquement du dessin statique.
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
const COULEUR_FOND = '#0a0f1c';        // Couleur du "sol" de la map (bleu nuit spatial)
const COULEUR_GRILLE = '#141c30';      // Couleur des lignes de la grille discrète en fond
const COULEUR_CHEMIN = '#2b3660';      // Couleur du chemin (la "route" suivie par les ennemis)
const COULEUR_BORD_CHEMIN = '#4ee1ff'; // Couleur lumineuse qui borde le chemin (effet néon sci-fi)
const COULEUR_POINT_DEPART = '#ff5d5d';// Couleur du marqueur "point d'apparition" des ennemis
const COULEUR_BASE = '#4ee1ff';        // Couleur du marqueur "base" à défendre

const LARGEUR_CHEMIN = 56;             // Largeur (en pixels) de la route dessinée
const TAILLE_CASE_GRILLE = 40;         // Taille d'une case de la grille de fond (en pixels)


/* ------------------------------------------------------------
   3. DÉFINITION DU CHEMIN (LE PARCOURS DES ENNEMIS)
   ------------------------------------------------------------
   Le chemin est stocké comme une simple LISTE DE POINTS
   (des coordonnées x/y). Chaque point est un "virage" du chemin.

   Pourquoi une liste de points plutôt qu'un dessin figé ?
   Parce que plus tard, les ennemis (pas encore codés) se
   déplaceront eux aussi de point en point, en suivant exactement
   ce même tracé. Définir le chemin comme des données réutilisables
   (et pas juste un dessin) est essentiel pour la suite du jeu :
   la carte ET les futurs ennemis partageront cette unique source
   de vérité.

   Le chemin part d'un point d'apparition (en haut à gauche)
   et serpente jusqu'à une base centrale.
------------------------------------------------------------ */
const CHEMIN = [
    { x: 0,   y: 100 },  // Point de départ : les ennemis apparaîtront ici, sur le bord gauche
    { x: 200, y: 100 },
    { x: 200, y: 260 },
    { x: 480, y: 260 },
    { x: 480, y: 80  },
    { x: 760, y: 80  },
    { x: 760, y: 400 },
    { x: 380, y: 400 },
    { x: 380, y: 540 },
    { x: LARGEUR_CANVAS / 2, y: HAUTEUR_CANVAS / 2 } // Point final : la base, au centre de la carte
];


/* ------------------------------------------------------------
   4. FONCTION : dessinerFond()
   ------------------------------------------------------------
   Dessine le décor de base de la carte : une couleur de fond
   pleine, puis une grille discrète par-dessus pour donner un
   effet "terrain quadrillé" façon écran de contrôle sci-fi.
------------------------------------------------------------ */
function dessinerFond() {
    // fillStyle définit la couleur utilisée par les prochains
    // "remplissages" (fillRect, fill...).
    ctx.fillStyle = COULEUR_FOND;

    // fillRect(x, y, largeur, hauteur) dessine un rectangle plein.
    // Ici on remplit TOUT le canvas avec la couleur de fond.
    ctx.fillRect(0, 0, LARGEUR_CANVAS, HAUTEUR_CANVAS);

    // On dessine ensuite une grille de fines lignes pour donner
    // du relief au sol, sans attirer trop l'attention (couleur proche du fond).
    ctx.strokeStyle = COULEUR_GRILLE; // couleur des traits (pas du remplissage)
    ctx.lineWidth = 1;                // épaisseur des traits en pixels

    // Lignes verticales : on avance de case en case le long de l'axe X
    for (let x = 0; x <= LARGEUR_CANVAS; x += TAILLE_CASE_GRILLE) {
        ctx.beginPath();          // commence un nouveau tracé
        ctx.moveTo(x, 0);         // déplace le "crayon" en haut de la ligne, sans dessiner
        ctx.lineTo(x, HAUTEUR_CANVAS); // trace une ligne jusqu'en bas
        ctx.stroke();             // dessine effectivement le trait tracé
    }

    // Lignes horizontales : même principe, mais le long de l'axe Y
    for (let y = 0; y <= HAUTEUR_CANVAS; y += TAILLE_CASE_GRILLE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(LARGEUR_CANVAS, y);
        ctx.stroke();
    }
}


/* ------------------------------------------------------------
   5. FONCTION : dessinerChemin()
   ------------------------------------------------------------
   Dessine la "route" sinueuse suivie par les ennemis, en reliant
   tous les points du tableau CHEMIN les uns après les autres.

   Astuce technique : au lieu de dessiner plein de rectangles pour
   chaque segment, on trace UNE SEULE ligne épaisse qui passe par
   tous les points. En donnant à cette ligne une grande épaisseur
   (LARGEUR_CHEMIN) et des extrémités/jonctions arrondies, on obtient
   visuellement une route continue et fluide, même dans les virages.
------------------------------------------------------------ */
function dessinerChemin() {
    if (CHEMIN.length === 0) return; // sécurité : rien à dessiner si le chemin est vide

    // --- Étape A : dessiner la bordure lumineuse (légèrement plus large) ---
    // On dessine d'abord un trait un peu plus épais et lumineux en dessous,
    // puis on redessinera la route par-dessus avec une couleur plus terne.
    // Résultat : un fin liseré coloré est visible sur les bords -> effet néon.
    tracerLigneChemin(LARGEUR_CHEMIN + 6, COULEUR_BORD_CHEMIN);

    // --- Étape B : dessiner la route elle-même, par-dessus la bordure ---
    tracerLigneChemin(LARGEUR_CHEMIN, COULEUR_CHEMIN);
}

/**
 * Fonction utilitaire qui trace une ligne continue passant par tous les
 * points de CHEMIN, avec l'épaisseur et la couleur demandées.
 * Elle est appelée deux fois par dessinerChemin() (voir ci-dessus),
 * ce qui évite de dupliquer le code de traçage.
 */
function tracerLigneChemin(epaisseur, couleur) {
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
    // pour que les virages du chemin ne forment pas de pointes agressives.
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.stroke(); // dessine le tracé défini ci-dessus
}


/* ------------------------------------------------------------
   6. FONCTION : dessinerPointDepart()
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
    ctx.arc(depart.x, depart.y, 22, 0, Math.PI * 2);
    ctx.fillStyle = COULEUR_POINT_DEPART;
    ctx.fill();

    // Un petit contour blanc pour bien détacher le marqueur du fond
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
}


/* ------------------------------------------------------------
   7. FONCTION : dessinerBase()
   ------------------------------------------------------------
   Marque visuellement l'emplacement de la base à défendre
   (le tout dernier point du tableau CHEMIN), avec un style
   différent du point de départ pour bien les distinguer.
------------------------------------------------------------ */
function dessinerBase() {
    const base = CHEMIN[CHEMIN.length - 1]; // le dernier point du chemin = la base

    // Un carré représente le bâtiment de la base
    const taille = 50;
    ctx.fillStyle = COULEUR_BASE;
    ctx.fillRect(base.x - taille / 2, base.y - taille / 2, taille, taille);

    // Contour lumineux autour du carré
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(base.x - taille / 2, base.y - taille / 2, taille, taille);
}


/* ------------------------------------------------------------
   8. FONCTION PRINCIPALE : dessinerCarte()
   ------------------------------------------------------------
   Cette fonction orchestre le dessin complet de la carte, dans
   le BON ORDRE (très important avec un Canvas !). Chaque appel
   de fonction dessine par-dessus ce qui a déjà été tracé, comme
   des calques empilés :

     1. Le fond (tout en bas de la pile)
     2. Le chemin (par-dessus le fond)
     3. Le point de départ (par-dessus le chemin)
     4. La base (par-dessus le chemin)

   Si on inversait l'ordre, par exemple en dessinant le fond en
   dernier, il recouvrirait tout le reste !
------------------------------------------------------------ */
function dessinerCarte() {
    dessinerFond();
    dessinerChemin();
    dessinerPointDepart();
    dessinerBase();
}


/* ------------------------------------------------------------
   9. LANCEMENT INITIAL
   ------------------------------------------------------------
   Pour l'instant, le jeu n'a pas encore de "boucle d'animation"
   (pas besoin, puisque rien ne bouge). On appelle donc la fonction
   de dessin une seule fois, dès que le script se charge, afin
   d'afficher la carte de base à l'écran.
------------------------------------------------------------ */
dessinerCarte();
