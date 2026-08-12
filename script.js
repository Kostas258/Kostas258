
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

// État transversal : animations, rythme, sauvegarde robuste et audio procédural.
let tempsAnimation = 0;
let multiplicateurVitesseJeu = 1;
let preparationVagueRestante = 0;
let particules = [];
let textesFlottants = [];
let secousseRestante = 0;
let flashBaseRestant = 0;

function lireStockage(cle, valeurParDefaut) {
    try {
        const valeur = window.localStorage.getItem(cle);
        return valeur === null ? valeurParDefaut : valeur;
    } catch (erreur) {
        return valeurParDefaut;
    }
}

function ecrireStockage(cle, valeur) {
    try { window.localStorage.setItem(cle, valeur); } catch (erreur) { /* mode privé / fichier local */ }
}

let contexteAudio = null;
let gainAudioPrincipal = null;
let gainAmbiance = null;
let gainMusiqueMenu = null;
let gainMusiqueJeu = null;
let minuterieMusique = null;
let modeMusique = 'menu';
let audioMuet = lireStockage('alertePoliceSecours_audioMuet', 'false') === 'true';
let volumeAudio = Number(lireStockage('alertePoliceSecours_volume', '0.45'));
if (!Number.isFinite(volumeAudio)) volumeAudio = 0.45;
volumeAudio = Math.min(1, Math.max(0, volumeAudio));
let dernierSonTir = -Infinity;

function initialiserAudio() {
    if (contexteAudio) {
        if (contexteAudio.state === 'suspended') contexteAudio.resume().catch(function () {});
        return;
    }
    const AudioContextDisponible = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextDisponible) return;

    contexteAudio = new AudioContextDisponible();
    gainAudioPrincipal = contexteAudio.createGain();
    gainAudioPrincipal.gain.value = audioMuet ? 0 : volumeAudio;
    gainAudioPrincipal.connect(contexteAudio.destination);

    gainAmbiance = contexteAudio.createGain();
    gainAmbiance.gain.value = 0.07;
    gainAmbiance.connect(gainAudioPrincipal);

    gainMusiqueMenu = contexteAudio.createGain();
    gainMusiqueJeu = contexteAudio.createGain();
    gainMusiqueMenu.connect(gainAudioPrincipal);
    gainMusiqueJeu.connect(gainAudioPrincipal);

    // Souffle urbain très discret, entièrement synthétisé dans le navigateur.
    const longueur = Math.max(1, Math.floor(contexteAudio.sampleRate * 2));
    const tampon = contexteAudio.createBuffer(1, longueur, contexteAudio.sampleRate);
    const donnees = tampon.getChannelData(0);
    for (let i = 0; i < longueur; i++) donnees[i] = (Math.random() * 2 - 1) * 0.12;
    const bruit = contexteAudio.createBufferSource();
    const filtre = contexteAudio.createBiquadFilter();
    filtre.type = 'lowpass';
    filtre.frequency.value = 420;
    bruit.buffer = tampon;
    bruit.loop = true;
    bruit.connect(filtre).connect(gainAmbiance);
    bruit.start();

    // Bourdonnement musical grave, sans fichier externe ni asset protégé.
    [48, 72].forEach(function (frequence, index) {
        const oscillateur = contexteAudio.createOscillator();
        const gain = contexteAudio.createGain();
        oscillateur.type = index === 0 ? 'sine' : 'triangle';
        oscillateur.frequency.value = frequence;
        gain.gain.value = index === 0 ? 0.035 : 0.012;
        oscillateur.connect(gain).connect(gainAmbiance);
        oscillateur.start();
    });
    demarrerBouclesMusicales();
    appliquerModeMusique(true);
    contexteAudio.resume().catch(function () {});
}

function creerNoteMusicale(frequence, debut, duree, volume, destination, forme) {
    const oscillateur = contexteAudio.createOscillator();
    const gain = contexteAudio.createGain();
    oscillateur.type = forme || 'triangle';
    oscillateur.frequency.setValueAtTime(frequence, debut);
    gain.gain.setValueAtTime(0.0001, debut);
    gain.gain.exponentialRampToValueAtTime(volume, debut + .035);
    gain.gain.exponentialRampToValueAtTime(0.0001, debut + duree);
    oscillateur.connect(gain).connect(destination);
    oscillateur.start(debut);
    oscillateur.stop(debut + duree + .03);
}

function planifierBouclesMusicales() {
    if (!contexteAudio || !gainMusiqueMenu || !gainMusiqueJeu) return;
    const debut = contexteAudio.currentTime + .06;
    const menu = [110,146.83,164.81,146.83,123.47,146.83,196,164.81];
    const jeu = [110,110,146.83,164.81,110,196,174.61,146.83,123.47,123.47,164.81,196,110,220,196,164.81];
    menu.forEach(function(note,index){ creerNoteMusicale(note, debut + index * .51, .44, .022, gainMusiqueMenu, index % 2 ? 'sine' : 'triangle'); });
    jeu.forEach(function(note,index){ creerNoteMusicale(note, debut + index * .255, .19, .016, gainMusiqueJeu, index % 4 === 0 ? 'sawtooth' : 'triangle'); });
}

function demarrerBouclesMusicales() {
    if (minuterieMusique) return;
    planifierBouclesMusicales();
    minuterieMusique = window.setInterval(planifierBouclesMusicales, 4080);
}

function appliquerModeMusique(immediat) {
    if (!contexteAudio || !gainMusiqueMenu || !gainMusiqueJeu) return;
    const maintenant = contexteAudio.currentTime;
    const duree = immediat ? .01 : .45;
    gainMusiqueMenu.gain.cancelScheduledValues(maintenant);
    gainMusiqueJeu.gain.cancelScheduledValues(maintenant);
    gainMusiqueMenu.gain.setValueAtTime(gainMusiqueMenu.gain.value, maintenant);
    gainMusiqueJeu.gain.setValueAtTime(gainMusiqueJeu.gain.value, maintenant);
    gainMusiqueMenu.gain.linearRampToValueAtTime(modeMusique === 'menu' ? .72 : 0, maintenant + duree);
    gainMusiqueJeu.gain.linearRampToValueAtTime(modeMusique === 'jeu' ? .62 : 0, maintenant + duree);
}

function definirModeMusique(mode) {
    modeMusique = mode;
    appliquerModeMusique(false);
}

function appliquerVolumeAudio() {
    if (!gainAudioPrincipal || !contexteAudio) return;
    gainAudioPrincipal.gain.cancelScheduledValues(contexteAudio.currentTime);
    gainAudioPrincipal.gain.linearRampToValueAtTime(audioMuet ? 0 : volumeAudio, contexteAudio.currentTime + 0.04);
}

function jouerSon(type) {
    if (!contexteAudio || !gainAudioPrincipal || audioMuet || volumeAudio <= 0) return;
    const maintenant = contexteAudio.currentTime;
    const estAttaque = ['tir','rafale','precision','lourd','marquage','interception','canin','helicoptere'].includes(type);
    if (estAttaque && maintenant - dernierSonTir < 0.045) return;
    if (estAttaque) dernierSonTir = maintenant;

    const profils = {
        tir:          { debut: 210, fin: 92, duree: .055, volume: .035, forme: 'square' },
        rafale:       { debut: 260, fin: 105, duree: .045, volume: .038, forme: 'square' },
        precision:    { debut: 720, fin: 125, duree: .11, volume: .05, forme: 'triangle' },
        lourd:        { debut: 135, fin: 38, duree: .16, volume: .065, forme: 'sawtooth' },
        marquage:     { debut: 880, fin: 1320, duree: .18, volume: .03, forme: 'sine' },
        interception: { debut: 310, fin: 62, duree: .12, volume: .052, forme: 'square' },
        canin:        { debut: 190, fin: 330, duree: .08, volume: .035, forme: 'triangle' },
        helicoptere:  { debut: 95, fin: 42, duree: .24, volume: .06, forme: 'sawtooth' },
        impact:       { debut: 105, fin: 48, duree: .09, volume: .045, forme: 'triangle' },
        construction: { debut: 330, fin: 660, duree: .15, volume: .055, forme: 'sine' },
        upgrade:      { debut: 440, fin: 990, duree: .28, volume: .065, forme: 'triangle' },
        vente:        { debut: 520, fin: 310, duree: .16, volume: .045, forme: 'sine' },
        vague:        { debut: 130, fin: 390, duree: .42, volume: .075, forme: 'sawtooth' },
        alerte:       { debut: 680, fin: 440, duree: .24, volume: .08, forme: 'square' },
        victoire:     { debut: 392, fin: 784, duree: .75, volume: .085, forme: 'triangle' },
        defaite:      { debut: 180, fin: 55, duree: .9, volume: .085, forme: 'sawtooth' }
    };
    const p = profils[type] || profils.impact;
    const oscillateur = contexteAudio.createOscillator();
    const gain = contexteAudio.createGain();
    oscillateur.type = p.forme;
    oscillateur.frequency.setValueAtTime(p.debut, maintenant);
    oscillateur.frequency.exponentialRampToValueAtTime(Math.max(20, p.fin), maintenant + p.duree);
    gain.gain.setValueAtTime(p.volume, maintenant);
    gain.gain.exponentialRampToValueAtTime(0.0001, maintenant + p.duree);
    oscillateur.connect(gain).connect(gainAudioPrincipal);
    oscillateur.start(maintenant);
    oscillateur.stop(maintenant + p.duree + .02);
}


/* ------------------------------------------------------------
   2. CONSTANTES DE CONFIGURATION VISUELLE
   ------------------------------------------------------------
   Regrouper les couleurs et tailles ici permet de modifier
   facilement l'apparence du jeu plus tard, sans devoir fouiller
   dans tout le code : un seul endroit à changer.
------------------------------------------------------------ */
const COULEUR_SOL = '#111a24';           // Couleur du "sol" général du quartier (trottoirs/terrain)
const COULEUR_RUE = '#26323e';           // Couleur de l'asphalte des rues
const COULEUR_BORD_RUE = '#607487';      // Couleur du bord de rue (petit trottoir clair)
const COULEUR_MARQUAGE = '#dceaf2';      // Couleur des lignes blanches peintes sur la route
const COULEUR_TOIT_BASE = '#344554';     // Couleur de repli tant que l'image du toit n'est pas chargée
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
    { x: 690, y: 0 }, { x: 690, y: 112 },
    { x: 0, y: 112 }, { x: 190, y: 112 }, { x: 190, y: 258 },
    { x: 378, y: 258 }, { x: 378, y: 112 }, { x: 560, y: 112 },
    { x: 560, y: 360 }, { x: 760, y: 360 }, { x: 760, y: 520 },
    { x: 520, y: 520 }, { x: 520, y: 610 }, { x: 690, y: 610 }
];

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
    {x:12,y:6,largeur:142,hauteur:68},{x:212,y:4,largeur:142,hauteur:70},
    {x:414,y:154,largeur:112,hauteur:66},{x:10,y:302,largeur:140,hauteur:92},
    {x:208,y:306,largeur:132,hauteur:96},{x:600,y:154,largeur:136,hauteur:108},
    {x:800,y:288,largeur:132,hauteur:104},{x:170,y:452,largeur:142,hauteur:110},
    {x:800,y:456,largeur:132,hauteur:100},{x:338,y:556,largeur:140,hauteur:70},
    {x:492,y:4,largeur:142,hauteur:70},{x:798,y:4,largeur:134,hauteur:70}
];

const CASES_PLACEMENT = [
    {x:22,y:18,largeur:42,hauteur:42,zone:'#e8a9bd'},{x:100,y:18,largeur:42,hauteur:42,zone:'#e8a9bd'},
    {x:222,y:16,largeur:42,hauteur:42,zone:'#d6c69c'},{x:300,y:16,largeur:42,hauteur:42,zone:'#d6c69c'},
    {x:420,y:166,largeur:42,hauteur:42,zone:'#a5d8e7'},{x:476,y:166,largeur:42,hauteur:42,zone:'#a5d8e7'},
    {x:20,y:326,largeur:42,hauteur:42,zone:'#b7e9de'},{x:96,y:326,largeur:42,hauteur:42,zone:'#b7e9de'},
    {x:218,y:326,largeur:42,hauteur:42,zone:'#a8d9a7'},{x:286,y:326,largeur:42,hauteur:42,zone:'#a8d9a7'},
    {x:610,y:184,largeur:42,hauteur:42,zone:'#d8b5e2'},{x:682,y:184,largeur:42,hauteur:42,zone:'#d8b5e2'},
    {x:810,y:310,largeur:42,hauteur:42,zone:'#f0d59a'},{x:876,y:310,largeur:42,hauteur:42,zone:'#f0d59a'},
    {x:182,y:478,largeur:42,hauteur:42,zone:'#d2b39e'},{x:252,y:478,largeur:42,hauteur:42,zone:'#d2b39e'},
    {x:810,y:480,largeur:42,hauteur:42,zone:'#b7d1ed'},{x:876,y:480,largeur:42,hauteur:42,zone:'#b7d1ed'},
    {x:348,y:568,largeur:42,hauteur:42,zone:'#c4c6ca'},{x:418,y:568,largeur:42,hauteur:42,zone:'#c4c6ca'},
    {x:502,y:16,largeur:42,hauteur:42,zone:'#8fd5e8'},{x:580,y:16,largeur:42,hauteur:42,zone:'#8fd5e8'},
    {x:808,y:16,largeur:42,hauteur:42,zone:'#efd477'},{x:876,y:16,largeur:42,hauteur:42,zone:'#efd477'}
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
    {type:'lampadaire',x:178,y:82},{type:'feuTricolore',x:190,y:220},
    {type:'barrierePolice',x:90,y:610},{type:'voiturePolice',x:850,y:615},
    {type:'passagePieton',x:630,y:520}
];


/* ------------------------------------------------------------
   5. FONCTION : dessinerFond()
   ------------------------------------------------------------
   Dessine le sol du quartier (couleur de fond pleine). C'est la
   toute première couche : tout le reste sera dessiné par-dessus.
------------------------------------------------------------ */
function dessinerFond() {
    const degrade = ctx.createLinearGradient(0, 0, LARGEUR_CANVAS, HAUTEUR_CANVAS);
    degrade.addColorStop(0, '#142536'); degrade.addColorStop(.55, '#0d1b28'); degrade.addColorStop(1, '#07111a');
    ctx.fillStyle = degrade; ctx.fillRect(0, 0, LARGEUR_CANVAS, HAUTEUR_CANVAS);
    ctx.strokeStyle = 'rgba(112, 157, 184, .045)'; ctx.lineWidth = 1;
    for (let x = 0; x < LARGEUR_CANVAS; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HAUTEUR_CANVAS); ctx.stroke(); }
    for (let y = 0; y < HAUTEUR_CANVAS; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(LARGEUR_CANVAS, y); ctx.stroke(); }
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

    // Reflets humides et flèches directionnelles donnent du relief à la chaussée.
    tracerLigneChemin(1, 'rgba(104, 216, 255, .26)', [8, 28]);
    ctx.save();
    ctx.fillStyle = 'rgba(220, 241, 250, .58)';
    [{x:320,y:112,a:Math.PI},{x:560,y:250,a:Math.PI/2},{x:660,y:360,a:0},{x:630,y:520,a:Math.PI}].forEach(function (fleche) {
        ctx.translate(fleche.x, fleche.y); ctx.rotate(fleche.a);
        ctx.beginPath(); ctx.moveTo(10,0); ctx.lineTo(-5,-7); ctx.lineTo(-2,0); ctx.lineTo(-5,7); ctx.closePath(); ctx.fill();
        ctx.rotate(-fleche.a); ctx.translate(-fleche.x, -fleche.y);
    });
    ctx.restore();
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
        const image = IMMEUBLES_REALISTES[index % IMMEUBLES_REALISTES.length];

        ctx.fillStyle = 'rgba(0, 4, 10, .48)';
        ctx.fillRect(batiment.x + 6, batiment.y + 8, batiment.largeur, batiment.hauteur);

        if (image.complete && image.naturalWidth > 0) {
            ctx.drawImage(image, batiment.x, batiment.y, batiment.largeur, batiment.hauteur);
        } else {
            // Solution de repli tant que l'image n'est pas encore chargée.
            ctx.fillStyle = COULEUR_TOIT_BASE;
            ctx.fillRect(batiment.x, batiment.y, batiment.largeur, batiment.hauteur);
        }

        const toitDegrade = ctx.createLinearGradient(batiment.x, batiment.y, batiment.x, batiment.y + batiment.hauteur);
        toitDegrade.addColorStop(0, 'rgba(125, 193, 218, .16)');
        toitDegrade.addColorStop(1, 'rgba(3, 12, 22, .42)');
        ctx.fillStyle = toitDegrade;
        ctx.fillRect(batiment.x, batiment.y, batiment.largeur, batiment.hauteur);
        ctx.strokeStyle = 'rgba(156, 212, 235, .58)';
        ctx.lineWidth = 2;
        ctx.strokeRect(batiment.x + .5, batiment.y + .5, batiment.largeur - 1, batiment.hauteur - 1);
        ctx.strokeStyle = 'rgba(12, 25, 36, .72)';
        ctx.lineWidth = 1;
        ctx.strokeRect(batiment.x + 5.5, batiment.y + 5.5, batiment.largeur - 11, batiment.hauteur - 11);

        // Équipements de toiture et fenêtres éclairées, générés de façon stable par index.
        if (batiment.largeur > 120) {
            ctx.fillStyle = '#263440';
            ctx.fillRect(batiment.x + 10, batiment.y + batiment.hauteur - 17, 26, 10);
            ctx.strokeStyle = '#607483';
            ctx.strokeRect(batiment.x + 10, batiment.y + batiment.hauteur - 17, 26, 10);
        }

        // Indice visuel "emplacement constructible" (voir explication ci-dessus)
    });
}

function dessinerCasesPlacement() {
    CASES_PLACEMENT.forEach(function (caseToit, index) {
        const occupee = Boolean(uniteSurBatiment(caseToit));
        const centre = centreBatiment(caseToit);
        const active = Boolean(typeSelectionnePourAchat) && !occupee;
        ctx.save();
        ctx.fillStyle = occupee ? 'rgba(5, 13, 22, .52)' : (active ? 'rgba(255, 209, 102, .64)' : 'rgba(22, 118, 186, .54)');
        ctx.strokeStyle = active ? '#ffd166' : (occupee ? '#5d7890' : '#c8edff');
        ctx.lineWidth = active ? 3 : 2;
        ctx.shadowColor = active ? '#ffd166' : 'rgba(70, 185, 255, .55)';
        ctx.shadowBlur = active ? 10 : 4;
        ctx.fillRect(caseToit.x, caseToit.y, caseToit.largeur, caseToit.hauteur);
        ctx.strokeRect(caseToit.x + 1, caseToit.y + 1, caseToit.largeur - 2, caseToit.hauteur - 2);
        if (!occupee) {
            ctx.fillStyle = active ? '#ffd166' : 'rgba(185, 226, 255, .62)';
            ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
            ctx.fillText(String(index + 1).padStart(2, '0'), centre.x, centre.y + 3);
        }
        ctx.restore();
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
        ctx.save(); ctx.translate(objet.x, objet.y);
        if (objet.type === 'lampadaire') {
            const halo = ctx.createRadialGradient(0, 0, 2, 0, 0, 34); halo.addColorStop(0, 'rgba(255,224,150,.3)'); halo.addColorStop(1, 'rgba(255,224,150,0)');
            ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#91a8b8'; ctx.fillRect(-2, -7, 4, 14); ctx.fillStyle = '#ffe09a'; ctx.fillRect(-5, -9, 10, 4);
        } else if (objet.type === 'feuTricolore') {
            ctx.fillStyle = '#738b9c'; ctx.fillRect(-2, -12, 4, 24); ctx.fillStyle = '#111b22'; ctx.fillRect(-7, -14, 14, 22); ['#ef5261','#e7b94a','#52ce7b'].forEach(function(c,i){ctx.fillStyle=c;ctx.beginPath();ctx.arc(0,-10+i*7,2,0,Math.PI*2);ctx.fill();});
        } else if (objet.type === 'barrierePolice') {
            ctx.fillStyle = '#d8e7ef'; ctx.fillRect(-22, -4, 44, 8); ctx.fillStyle = '#238bd0'; for(let x=-20;x<20;x+=12) ctx.fillRect(x,-4,6,8);
        } else if (objet.type === 'voiturePolice') {
            ctx.fillStyle = '#dcebf2'; ctx.fillRect(-20,-10,40,20); ctx.fillStyle = '#17334a'; ctx.fillRect(-10,-8,20,16); ctx.fillStyle = '#238bd0'; ctx.fillRect(-4,-12,8,4);
        } else {
            ctx.fillStyle = 'rgba(225,239,247,.72)'; for(let x=-22;x<=22;x+=11) ctx.fillRect(x,-14,5,28);
        }
        ctx.restore();
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
    const degradeBase = ctx.createLinearGradient(x, y, x + largeur, y + hauteur);
    degradeBase.addColorStop(0, '#397ee8');
    degradeBase.addColorStop(1, '#102d61');
    ctx.fillStyle = degradeBase;
    ctx.fillRect(x, y, largeur, hauteur);

    // Contour blanc épais pour bien le distinguer des toits ordinaires
    ctx.lineWidth = 4;
    ctx.strokeStyle = COULEUR_COMMISSARIAT_BORD;
    ctx.strokeRect(x, y, largeur, hauteur);

    // Petit "gyrophare" décoratif sur le toit : deux petits carrés
    // rouge et bleu côte à côte, comme sur un véhicule de police.
    const tailleGyrophare = 14;
    const yGyrophare = y - tailleGyrophare - 4;

    const pulsation = .55 + Math.sin(tempsAnimation * 7) * .4;
    ctx.globalAlpha = Math.max(.15, pulsation);
    ctx.fillStyle = COULEUR_GYROPHARE_BLEU;
    ctx.fillRect(base.x - tailleGyrophare, yGyrophare, tailleGyrophare, tailleGyrophare);

    ctx.fillStyle = COULEUR_GYROPHARE_ROUGE;
    ctx.fillRect(base.x, yGyrophare, tailleGyrophare, tailleGyrophare);
    ctx.globalAlpha = 1;

    [
        { x: base.x - 7, couleur: 'rgba(50, 145, 255, .34)', phase: 0 },
        { x: base.x + 7, couleur: 'rgba(255, 55, 78, .30)', phase: Math.PI }
    ].forEach(function (feu) {
        const rayon = 42 + 16 * Math.max(0, Math.sin(tempsAnimation * 7 + feu.phase));
        const halo = ctx.createRadialGradient(feu.x, yGyrophare, 2, feu.x, yGyrophare, rayon);
        halo.addColorStop(0, feu.couleur); halo.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(feu.x, yGyrophare, rayon, 0, Math.PI * 2); ctx.fill();
    });

    ctx.fillStyle = '#eef8ff';
    ctx.font = 'bold 10px "Arial Narrow", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('COMMISSARIAT', base.x, base.y + 4);
    ctx.textAlign = 'start';
}

function dessinerAtmosphere() {
    const brume = ctx.createRadialGradient(480, 310, 100, 480, 310, 620);
    brume.addColorStop(0, 'rgba(35, 104, 145, .018)'); brume.addColorStop(1, 'rgba(0, 4, 11, .28)');
    ctx.fillStyle = brume; ctx.fillRect(0, 0, LARGEUR_CANVAS, HAUTEUR_CANVAS);
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
    dessinerAtmosphere();
    dessinerCasesPlacement();
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

// Le score est un compteur purement informatif (il n'influence aucune
// règle du jeu) : il augmente quand un ennemi est éliminé et quand une
// vague est repoussée. Contrairement à l'argent, il ne baisse jamais.
let score = 0;
const elementScore = document.getElementById('score-valeur');

function mettreAJourAffichageScore() {
    elementScore.textContent = score.toLocaleString('fr-FR');
}

function ajouterScore(montant) {
    score += Math.round(montant);
    mettreAJourAffichageScore();
}

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
    actualiserEtatBoutique();
}

function actualiserEtatBoutique() {
    document.querySelectorAll('.bouton-unite').forEach(function (bouton) {
        const infos = UNITES[bouton.dataset.type];
        bouton.classList.toggle('inabordable', !!infos && argent < infos.cout);
        bouton.setAttribute('aria-pressed', String(typeSelectionnePourAchat === bouton.dataset.type));
        bouton.classList.toggle('selectionnee', typeSelectionnePourAchat === bouton.dataset.type);
    });
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
const COMPETENCES_UNITES = {
    policeSecours:{role:'Polyvalent',attaque:'Rafale contrôlée',cible:'Premier ennemi',skill:'Appui immédiat',recharge:'0,5 s',forces:'Cadence et faible coût',faiblesses:'Faibles dégâts de zone',effet:'Rafale bleue accélérée au niveau III'},
    tireur:{role:'Longue portée',attaque:'Tir perforant',cible:'Menace la plus avancée',skill:'Visée critique',recharge:'1,1 s',forces:'Portée et critiques',faiblesses:'Cadence lente',effet:'Trace rouge et impact précis'},
    lourd:{role:'Assaut lourd',attaque:'Charge explosive',cible:'Groupe dense',skill:'Déflagration tactique',recharge:'0,7 s',forces:'Dégâts de zone',faiblesses:'Coût élevé',effet:'Onde orange et secousse'},
    herse:{role:'Contrôle',attaque:'Zone de barrage',cible:'Tous dans la zone',skill:'Herse renforcée',recharge:'Passive',forces:'Ralentissement continu',faiblesses:'Aucun dégât direct',effet:'Anneau bleu et étincelles'},
    bac:{role:'Intervention rapide',attaque:'Rafale rapprochée',cible:'Groupe proche',skill:'Encerclement',recharge:'0,35 s',forces:'Cadence et petite zone',faiblesses:'Portée réduite',effet:'Impacts cyan multiples'},
    bri:{role:'Élimination',attaque:'Tir de précision',cible:'Cible la plus dangereuse',skill:'Neutralisation critique',recharge:'1,7 s',forces:'Très gros dégâts',faiblesses:'Prix et cadence',effet:'Flash violet et critique'},
    policeJudiciaire:{role:'Soutien',attaque:'Désignation',cible:'Cible non marquée',skill:'Marquage prioritaire',recharge:'1,2 s',forces:'Amplifie tous les dégâts',faiblesses:'Aucun dégât direct',effet:'Balise dorée pulsante'},
    cynophile:{role:'Détection',attaque:'Interception canine',cible:'Ennemi rapide',skill:'Pistage',recharge:'0,5 s',forces:'Détection et ralentissement',faiblesses:'Courte portée',effet:'Traînée verte et morsure'},
    motocycliste:{role:'Interception',attaque:'Percussion ciblée',cible:'Premier ennemi',skill:'Blocage routier',recharge:'1,4 s',forces:'Immobilisation',faiblesses:'Dégâts modestes',effet:'Trace jaune et cercle bloqué'},
    aerienne:{role:'Soutien global',attaque:'Frappe aérienne',cible:'Plus grand groupe',skill:'Survol d’urgence',recharge:'6 s',forces:'Portée globale et grande zone',faiblesses:'Très chère et lente',effet:'Passage hélicoptère et explosion bleue'}
};


const IMAGES_AMELIORATIONS = {
    policeSecours: ['images/evolution_policeSecours_1.webp', 'images/evolution_policeSecours_2.webp', 'images/evolution_policeSecours_3.webp'],
    tireur: ['images/evolution_tireur_1.webp', 'images/evolution_tireur_2.webp', 'images/evolution_tireur_3.webp'],
    lourd: ['images/evolution_lourd_1.webp', 'images/evolution_lourd_2.webp', 'images/evolution_lourd_3.webp'],
    herse: ['images/evolution_herse_1.webp', 'images/evolution_herse_2.webp', 'images/evolution_herse_3.webp'],
    bac: ['images/evolution_bac_1.webp', 'images/evolution_bac_2.webp', 'images/evolution_bac_3.webp'],
    bri: ['images/evolution_bri_1.webp', 'images/evolution_bri_2.webp', 'images/evolution_bri_3.webp'],
    policeJudiciaire: ['images/evolution_policeJudiciaire_1.webp', 'images/evolution_policeJudiciaire_2.webp', 'images/evolution_policeJudiciaire_3.webp'],
    cynophile: ['images/evolution_cynophile_1.webp', 'images/evolution_cynophile_2.webp', 'images/evolution_cynophile_3.webp'],
    motocycliste: ['images/evolution_motocycliste_1.webp', 'images/evolution_motocycliste_2.webp', 'images/evolution_motocycliste_3.webp'],
    aerienne: ['images/evolution_aerienne_1.webp', 'images/evolution_aerienne_2.webp', 'images/evolution_aerienne_3.webp']
};
const PORTRAITS_AMELIORATIONS = {};
Object.keys(IMAGES_AMELIORATIONS).forEach(function(type){
    PORTRAITS_AMELIORATIONS[type] = IMAGES_AMELIORATIONS[type].map(function(uri){ const image = new Image(); image.src = uri; return image; });
});

const PORTRAITS_UNITES = {};
Object.keys(UNITES).forEach(function (cle) {
    const image = new Image();
    image.src = UNITES[cle].portrait;
    PORTRAITS_UNITES[cle] = image;
});

// Nouveaux visuels originaux, compressés et embarqués mécaniquement en fin
// de production afin que le HTML reste entièrement autonome hors connexion.
const NOUVEAUX_ASSETS_URIS = {
    towers: {
        patrouille: 'images/plateforme_patrouille.webp', intervention: 'images/plateforme_intervention.webp',
        controle: 'images/plateforme_controle.webp', aerienne: 'images/plateforme_aerienne.webp'
    },
    enemies: {
        standard: 'images/ennemi_standard.webp', rapide: 'images/ennemi_rapide.webp',
        blinde: 'images/ennemi_blinde.webp', chef: 'images/ennemi_chef.webp',
        saboteur: 'images/ennemi_saboteur.webp', eclaireur: 'images/ennemi_eclaireur.webp'
    },
};
function chargerCollectionImages(collection) {
    if (Array.isArray(collection)) return collection.map(function (src) { const img = new Image(); img.src = src; return img; });
    const resultat = {};
    Object.keys(collection).forEach(function (cle) { const img = new Image(); img.src = collection[cle]; resultat[cle] = img; });
    return resultat;
}
const IMMEUBLES_V4_URIS = ['images/toit_technique_1.webp', 'images/toit_technique_2.webp', 'images/toit_technique_3.webp', 'images/toit_technique_4.webp'];
const IMMEUBLES_REALISTES = chargerCollectionImages(IMMEUBLES_V4_URIS);
const PLATEFORMES_TOURS = chargerCollectionImages(NOUVEAUX_ASSETS_URIS.towers);
const SPRITES_ENNEMIS = chargerCollectionImages(NOUVEAUX_ASSETS_URIS.enemies);

function plateformePourUnite(type) {
    if (type === 'aerienne') return PLATEFORMES_TOURS.aerienne;
    if (type === 'herse' || type === 'motocycliste' || type === 'cynophile') return PLATEFORMES_TOURS.controle;
    if (type === 'tireur' || type === 'lourd' || type === 'bri' || type === 'bac') return PLATEFORMES_TOURS.intervention;
    return PLATEFORMES_TOURS.patrouille;
}

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

/**
 * Construit les boutons de la boutique (une carte par type d'unité) à
 * partir de l'objet UNITES, exactement comme initialiserPanneauMods()
 * et initialiserEcranAccueil() le font pour MODS et DIFFICULTES : le
 * nom et le prix ne sont écrits qu'à un seul endroit du projet (dans
 * UNITES), et la boutique s'adapte automatiquement si on ajoute ou
 * retire un type d'unité, sans jamais avoir à toucher au HTML.
 */
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
            actualiserEtatBoutique();
            afficherMessage('Choisissez une case libre pour déployer : ' + infos.nom + '.');
        });
    });
    actualiserEtatBoutique();
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
    const x = (evenement.clientX - zone.left) * (LARGEUR_CANVAS / zone.width);
    const y = (evenement.clientY - zone.top) * (HAUTEUR_CANVAS / zone.height);

    // On cherche la case précise touchée : chaque toit en offre deux.
    const batiment = CASES_PLACEMENT.find(function (b) {
        return x >= b.x && x <= b.x + b.largeur && y >= b.y && y <= b.y + b.hauteur;
    });

    if (!batiment) {
        // Clic dans le vide : on annule l'achat ou la sélection en cours.
        typeSelectionnePourAchat = null;
        uniteSelectionnee = null;
        masquerPanneauSelection();
        actualiserEtatBoutique();
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
                    investissementTotal: infos.cout,
                    facteurRalentissement: infos.facteurRalentissement || null,
                    dureeMarquage: infos.dureeMarquage || 0,
                    bonusDegatsMarque: infos.bonusDegatsMarque || 1,
                    dureeImmobilisation: infos.dureeImmobilisation || 0,
                    rayonExplosion: infos.rayonExplosion || 0,
                    animationTir: 0,
                    animationUpgrade: 0
                });
                creerExplosionVisuelle(centreBatiment(batiment).x, centreBatiment(batiment).y, infos.couleur, 12, 34);
                jouerSon('construction');
                afficherMessage(infos.nom + ' construit(e) avec succès.');
            } else {
                afficherMessage('Fonds insuffisants pour construire ' + infos.nom + '.');
            }
        }
        typeSelectionnePourAchat = null;
        actualiserEtatBoutique();
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

    if (unite.facteurRalentissement) {
        details += ' — Ralentit de ' + Math.round((1 - unite.facteurRalentissement) * 100) + '%';
    }
    if (unite.type === 'policeJudiciaire') {
        details += ' — Marque une cible (+' + Math.round((unite.bonusDegatsMarque - 1) * 100) + '% dégâts subis pendant ' + unite.dureeMarquage.toFixed(1) + 's)';
    }
    if (unite.type === 'motocycliste') {
        details += ' — Immobilise ' + unite.dureeImmobilisation.toFixed(1) + 's à l\'impact';
    }
    if (unite.degats > 0) {
        details += ' — Dégâts : ' + Math.round(unite.degats);
    }
    if (unite.rayonExplosion) {
        details += ' (zone ' + Math.round(unite.rayonExplosion) + ' px)';
    }

    document.getElementById('selection-details').textContent = details;
    const competence = COMPETENCES_UNITES[unite.type];
    document.getElementById('selection-competence').innerHTML =
        '<strong class="fiche-skill">' + competence.skill + '</strong> — ' + competence.attaque +
        '<div class="fiche-stats"><span class="fiche-stat">Rôle : ' + competence.role + '</span><span class="fiche-stat">Cible : ' + competence.cible + '</span>' +
        '<span class="fiche-stat">Recharge : ' + competence.recharge + '</span><span class="fiche-stat">Effet : ' + competence.effet + '</span></div>' +
        '<small>Forces : ' + competence.forces + ' • Faiblesses : ' + competence.faiblesses + '</small>';
    document.getElementById('selection-barres').innerHTML = construireBarresUnite(unite);

    if (unite.niveau >= 3) {
        boutonAmeliorer.textContent = 'Niveau III maximum';
        boutonAmeliorer.disabled = true;
    } else {
        const coutAmelioration = Math.round(infos.cout * COUT_AMELIORATION_FACTEUR * (unite.niveau === 2 ? 1.5 : 1));
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
 * Améliore l'unité sélectionnée jusqu'au niveau III : plus de dégâts,
 * de portée et de cadence, avec un second coût plus élevé au niveau III.
 */
function ameliorerUniteSelectionnee() {
    if (!uniteSelectionnee || uniteSelectionnee.niveau >= 3) return;

    const infos = UNITES[uniteSelectionnee.type];
    const coutAmelioration = Math.round(infos.cout * COUT_AMELIORATION_FACTEUR * (uniteSelectionnee.niveau === 2 ? 1.5 : 1));

    if (!depenserArgent(coutAmelioration)) {
        afficherMessage('Fonds insuffisants pour améliorer cette unité.');
        return;
    }

    uniteSelectionnee.niveau += 1;
    uniteSelectionnee.degats = Math.round(uniteSelectionnee.degats * BONUS_AMELIORATION_DEGATS);
    uniteSelectionnee.portee = Math.round(uniteSelectionnee.portee * BONUS_AMELIORATION_PORTEE);
    uniteSelectionnee.tempsEntreTirs = Math.max(.18, uniteSelectionnee.tempsEntreTirs * .86);
    if (uniteSelectionnee.facteurRalentissement) {
        uniteSelectionnee.facteurRalentissement = Math.max(.25, uniteSelectionnee.facteurRalentissement * .82);
    }
    if (uniteSelectionnee.type === 'policeJudiciaire') {
        uniteSelectionnee.dureeMarquage += 1.5;
        uniteSelectionnee.bonusDegatsMarque += .25;
    }
    if (uniteSelectionnee.type === 'motocycliste') uniteSelectionnee.dureeImmobilisation += .6;
    if (uniteSelectionnee.rayonExplosion) uniteSelectionnee.rayonExplosion *= 1.15;
    uniteSelectionnee.investissementTotal += coutAmelioration;
    uniteSelectionnee.animationUpgrade = 1;

    const centre = centreBatiment(uniteSelectionnee.batiment);
    creerExplosionVisuelle(centre.x, centre.y, '#ffd166', 22, 52);
    jouerSon('upgrade');

    afficherPanneauSelection(uniteSelectionnee); // on rafraîchit les infos affichées
    afficherMessage('Unité améliorée au niveau ' + uniteSelectionnee.niveau + '.');
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
    const centre = centreBatiment(uniteSelectionnee.batiment);
    ajouterArgent(remboursement);

    // On reconstruit le tableau unitesPlacees SANS l'unité vendue.
    unitesPlacees = unitesPlacees.filter(function (unite) {
        return unite !== uniteSelectionnee;
    });

    afficherMessage('Unité vendue (+' + remboursement + ' $).');
    creerExplosionVisuelle(centre.x, centre.y, '#8ed6ff', 10, 28);
    jouerSon('vente');
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

let idAnnonceVague = null;
function afficherAnnonceVague(titre, sousTitre, duree) {
    const annonce = document.getElementById('annonce-vague');
    document.getElementById('annonce-vague-titre').textContent = titre;
    document.getElementById('annonce-vague-sous-titre').textContent = sousTitre || '';
    annonce.classList.remove('cache');
    if (idAnnonceVague) clearTimeout(idAnnonceVague);
    idAnnonceVague = setTimeout(function () { annonce.classList.add('cache'); }, duree || 1400);
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
        intervalleApparition: Math.max(0.48, 0.92 - numero * 0.025),
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
let compteurEnnemisGeneres = 0;

/**
 * Crée un nouvel ennemi au point de départ du chemin (CHEMIN[0])
 * et l'ajoute à la liste des ennemis en vie.
 */
function genererEnnemi(config) {
    compteurEnnemisGeneres++;
    let archetype = 'standard';
    if (vagueActuelle >= 6 && compteurEnnemisGeneres % 11 === 0) archetype = 'chef';
    else if (vagueActuelle >= 7 && compteurEnnemisGeneres % 9 === 0) archetype = 'saboteur';
    else if (vagueActuelle >= 4 && compteurEnnemisGeneres % 8 === 0) archetype = 'eclaireur';
    else if (vagueActuelle >= 3 && compteurEnnemisGeneres % 7 === 0) archetype = 'blinde';
    else if (vagueActuelle >= 2 && compteurEnnemisGeneres % 5 === 0) archetype = 'rapide';

    const profils = {
        standard: { pv: 1, vitesse: 1, recompense: 1, rayon: 11, couleur: '#a5404e', degatsBase: 1 },
        rapide:   { pv: .68, vitesse: 1.34, recompense: .9, rayon: 9, couleur: '#db8a3b', degatsBase: 1 },
        blinde:   { pv: 1.7, vitesse: .76, recompense: 1.45, rayon: 14, couleur: '#596a78', degatsBase: 2 },
        chef:     { pv: 2.15, vitesse: .92, recompense: 1.8, rayon: 15, couleur: '#783b8f', degatsBase: 2 },
        saboteur: { pv: 1.18, vitesse: 1.08, recompense: 1.3, rayon: 11, couleur: '#8a6aa8', degatsBase: 2 },
        eclaireur:{ pv: .52, vitesse: 1.62, recompense: 1.05, rayon: 10, couleur: '#f4a261', degatsBase: 1 }
    };
    const profil = profils[archetype];
    ennemis.push({
        x: CHEMIN[0].x,
        y: CHEMIN[0].y,
        indexPointCourant: 1,     // le prochain point du CHEMIN visé par l'ennemi
        pv: Math.round(config.pvEnnemi * profil.pv),
        pvMax: Math.round(config.pvEnnemi * profil.pv),
        vitesseBase: config.vitesse * profil.vitesse,
        recompense: Math.round(config.recompense * profil.recompense),
        archetype: archetype,
        rayon: profil.rayon,
        couleur: profil.couleur,
        degatsBase: profil.degatsBase,
        aAtteintCommissariat: false,
        marqueRestante: 0,        // secondes restantes sous l'effet "marqué" (Police Judiciaire)
        bonusMarquage: 1,
        immobiliseRestante: 0,    // secondes restantes totalement immobilisé (Compagnie Motocycliste)
        impactRestant: 0
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
    preparationVagueRestante = 1.55;
    vagueEnCours = true;
    etatJeu = 'en_cours';

    mettreAJourAffichageVague();
    document.getElementById('bouton-lancer-vague').disabled = true;
    afficherMessage('Vague ' + vagueActuelle + ' lancée !');
    afficherAnnonceVague('VAGUE ' + vagueActuelle, vagueActuelle === NOMBRE_TOTAL_VAGUES ? 'ALERTE MAXIMALE' : 'DÉPLOIEMENT IMMINENT', 1500);
    jouerSon('vague');
}

/**
 * Fait avancer le minuteur d'apparition des ennemis de la vague en
 * cours, et fait surgir un nouvel ennemi quand il arrive à zéro.
 * Appelée à chaque image (frame) par la boucle de jeu, avec "dt" =
 * le temps écoulé depuis la dernière image (en secondes).
 */
function mettreAJourVague(dt) {
    if (!vagueEnCours || ennemisRestantAGenerer <= 0) return;

    if (preparationVagueRestante > 0) {
        preparationVagueRestante = Math.max(0, preparationVagueRestante - dt);
        return;
    }

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
    ennemisRestantAGenerer = 0;
    chronoProchaineApparition = 0;
    preparationVagueRestante = 0;
    configVagueActuelle = null;
    ajouterScore(vagueActuelle * 250);

    const dernierNiveauTermine = vagueActuelle >= NOMBRE_TOTAL_VAGUES;

    if (dernierNiveauTermine && !modsActifs.vaguesInfinies) {
        etatJeu = 'gagne';
        debloquerModsSiNecessaire();
        afficherAnnonceVague('MISSION RÉUSSIE', 'LE QUARTIER EST SÉCURISÉ', 3200);
        creerExplosionVisuelle(LARGEUR_CANVAS / 2, HAUTEUR_CANVAS / 2, '#55d8ff', 70, 260);
        jouerSon('victoire');
    } else {
        etatJeu = 'attente';
        const boutonVague = document.getElementById('bouton-lancer-vague');
        boutonVague.disabled = false;
        afficherMessage(
            dernierNiveauTermine
                ? 'Vague ' + vagueActuelle + ' repoussée. Vagues infinies : continuez si vous l\'osez !'
                : 'Vague ' + vagueActuelle + ' terminée. Préparez la suivante !'
        );
        afficherAnnonceVague('SECTEUR SÉCURISÉ', 'RENFORCEZ VOS POSITIONS', 1200);
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
        if (ennemi.impactRestant > 0) ennemi.impactRestant = Math.max(0, ennemi.impactRestant - dt);

        // Un ennemi situé dans la portée d'au moins une unité de
        // ralentissement (Herse CRS ou Unité Cynophile) se déplace plus
        // lentement. Si plusieurs zones se chevauchent, on applique le
        // ralentissement le plus fort (le facteur le plus petit).
        const facteursRalentissement = unitesPlacees
            .filter(function (unite) {
                return unite.facteurRalentissement &&
                    distanceEntre(centreBatiment(unite.batiment), ennemi) <= unite.portee;
            })
            .map(function (unite) {
                return unite.facteurRalentissement;
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

        pvBase = Math.max(0, pvBase - (ennemi.degatsBase || 1));
        mettreAJourAffichageVie();
        flashBaseRestant = .42;
        secousseRestante = Math.max(secousseRestante, .22);
        jouerSon('alerte');
        if (pvBase <= 0 && etatJeu !== 'perdu') {
            etatJeu = 'perdu';
            afficherAnnonceVague('MISSION ÉCHOUÉE', 'LE COMMISSARIAT EST SUBMERGÉ', 3200);
            jouerSon('defaite');
        }

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
function infligerDegats(ennemi, degats, sourceType) {
    const multiplicateur = ennemi.marqueRestante > 0 ? (ennemi.bonusMarquage || UNITES.policeJudiciaire.bonusDegatsMarque) : 1;
    const chanceCritique = {tireur:.2,bri:.3,bac:.13,policeSecours:.08,lourd:.1,aerienne:.12}[sourceType] || .05;
    const critique = sourceType && sourceType !== 'cynophile' && Math.random() < chanceCritique;
    const degatsFinaux = degats * multiplicateur * (critique ? 1.75 : 1);
    ennemi.pv -= degatsFinaux;
    ennemi.impactRestant = .12;
    creerTexteFlottant(ennemi.x, ennemi.y - 18, (critique ? 'CRIT ' : '-') + Math.round(degatsFinaux), critique ? '#ff8a66' : (multiplicateur > 1 ? '#ffd166' : '#eaf4ff'));
}

function progressionEnnemi(ennemi) {
    const precedent = CHEMIN[Math.max(0, ennemi.indexPointCourant - 1)];
    const suivant = CHEMIN[Math.min(CHEMIN.length - 1, ennemi.indexPointCourant)];
    const longueur = Math.max(1, distanceEntre(precedent, suivant));
    return ennemi.indexPointCourant + distanceEntre(precedent, ennemi) / longueur;
}

function mettreAJourUnites(dt) {
    unitesPlacees.forEach(function (unite) {
        unite.animationTir = Math.max(0, (unite.animationTir || 0) - dt);
        unite.animationUpgrade = Math.max(0, (unite.animationUpgrade || 0) - dt);
        if (unite.type === 'herse') return; // la Herse ne tire jamais, elle ralentit seulement

        if (unite.cooldownRestant > 0) {
            unite.cooldownRestant -= dt;
            return;
        }

        const centre = centreBatiment(unite.batiment);

        // La priorité de ciblage respecte la fiche de chaque unité : progression,
        // vitesse, résistance ou densité du groupe selon sa spécialité.
        let cible = null;
        let meilleurScore = -Infinity;
        ennemis.forEach(function (ennemi) {
            if (ennemi.pv <= 0) return;
            const d = distanceEntre(centre, ennemi);
            const progression = progressionEnnemi(ennemi);
            let score = progression;
            if (unite.type === 'cynophile') {
                score = ennemi.vitesseBase * 4 + progression;
            } else if (unite.type === 'bri') {
                score = ennemi.pvMax * .035 + progression;
            } else if (unite.type === 'lourd' || unite.type === 'bac' || unite.type === 'aerienne') {
                const rayonGroupe = Math.max(48, unite.rayonExplosion || 62);
                const voisins = ennemis.reduce(function (total, autre) {
                    return total + (autre.pv > 0 && distanceEntre(ennemi, autre) <= rayonGroupe ? 1 : 0);
                }, 0);
                score = voisins * 100 + progression;
            }
            if (unite.type === 'policeJudiciaire' && ennemi.marqueRestante > .7) score -= 100;
            if (d <= unite.portee && score > meilleurScore) {
                cible = ennemi;
                meilleurScore = score;
            }
        });

        if (!cible) return; // rien à portée, l'unité attend

        const infos = UNITES[unite.type];

        if (infos.rayonExplosion) {
            // Dégâts de zone (GIGN, BAC, Section Aérienne) : TOUS les
            // ennemis proches de la cible touchée encaissent les dégâts.
            ennemis.forEach(function (ennemi) {
                if (ennemi.pv > 0 && distanceEntre(cible, ennemi) <= unite.rayonExplosion) {
                    infligerDegats(ennemi, unite.degats, unite.type);
                }
            });
            creerExplosionVisuelle(cible.x, cible.y, infos.couleur, unite.type === 'aerienne' ? 28 : 12, unite.rayonExplosion);
            if (unite.type === 'aerienne') secousseRestante = Math.max(secousseRestante, .32);
        } else if (unite.type === 'policeJudiciaire') {
            // Aucun dégât : on marque la cible pour que les AUTRES
            // unités lui infligent plus de dégâts pendant un moment.
            cible.marqueRestante = unite.dureeMarquage;
            cible.bonusMarquage = unite.bonusDegatsMarque;
            creerExplosionVisuelle(cible.x, cible.y, infos.couleur, 8, 24);
        } else {
            // Cas général (RAID, Police Secours, BRI, Unité Cynophile,
            // Compagnie Motocycliste) : dégâts sur une seule cible.
            infligerDegats(cible, unite.degats, unite.type);
            if (unite.type === 'motocycliste') {
                cible.immobiliseRestante = unite.dureeImmobilisation;
            }
            creerExplosionVisuelle(cible.x, cible.y, infos.couleur, 4, 18);
        }

        // On enregistre un petit effet visuel de tir (voir section 17).
        effetsTir.push({
            x1: centre.x, y1: centre.y,
            x2: cible.x, y2: cible.y,
            dureeRestante: 0.15,
            dureeInitiale: 0.15,
            couleur: infos.couleur,
            type: unite.type === 'aerienne' ? 'helicoptere' : (unite.type === 'policeJudiciaire' ? 'marquage' : (unite.type === 'motocycliste' ? 'immobilisation' : 'projectile'))
        });

        unite.cooldownRestant = unite.tempsEntreTirs;
        unite.animationTir = .22;
        const sonsAttaque = {policeSecours:'tir',tireur:'precision',lourd:'lourd',bac:'rafale',bri:'precision',policeJudiciaire:'marquage',cynophile:'canin',motocycliste:'interception',aerienne:'helicoptere'};
        jouerSon(sonsAttaque[unite.type] || 'tir');
    });

    // On retire les ennemis tués pendant ce combat, et on récompense
    // le joueur pour chacun d'eux.
    ennemis = ennemis.filter(function (ennemi) {
        if (ennemi.pv > 0) return true;

        ajouterArgent(ennemi.recompense);
        ajouterScore(ennemi.recompense * 10);
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

function creerExplosionVisuelle(x, y, couleur, quantite, rayon) {
    const nombre = Math.max(1, quantite || 8);
    for (let i = 0; i < nombre; i++) {
        const angle = (Math.PI * 2 * i / nombre) + Math.random() * .35;
        const vitesse = 24 + Math.random() * (rayon || 30) * 1.6;
        particules.push({
            x: x, y: y,
            vx: Math.cos(angle) * vitesse,
            vy: Math.sin(angle) * vitesse,
            vie: .28 + Math.random() * .38,
            vieMax: .66,
            taille: 1.5 + Math.random() * 3.5,
            couleur: couleur
        });
    }
}

function creerTexteFlottant(x, y, texte, couleur) {
    textesFlottants.push({ x: x, y: y, texte: texte, couleur: couleur, vie: .72, vieMax: .72 });
}

/** Fait vieillir tous les effets de tir, et retire ceux qui sont terminés. */
function mettreAJourEffets(dt) {
    effetsTir.forEach(function (effet) {
        effet.dureeRestante -= dt;
    });
    effetsTir = effetsTir.filter(function (effet) {
        return effet.dureeRestante > 0;
    });

    particules.forEach(function (p) {
        p.vie -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= Math.pow(.08, dt);
        p.vy *= Math.pow(.08, dt);
    });
    particules = particules.filter(function (p) { return p.vie > 0; });

    textesFlottants.forEach(function (t) { t.vie -= dt; t.y -= 24 * dt; });
    textesFlottants = textesFlottants.filter(function (t) { return t.vie > 0; });
    secousseRestante = Math.max(0, secousseRestante - dt);
    flashBaseRestant = Math.max(0, flashBaseRestant - dt);
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

// Le "bonus objectif" (barre du bas) reste actif tant que le Commissariat
// n'a subi AUCUNE perte de points de vie depuis le début de la partie.
// Il repasse à "true" à chaque nouvelle partie (voir reinitialiserPartie).
let objectifSansPerte = true;

const elementVieBarre = document.getElementById('vie-barre-basse');
const elementViePourcentage = document.getElementById('vie-pourcentage-valeur');
const elementVagueValeur = document.getElementById('vague-valeur');
const elementVagueTotal = document.getElementById('vague-total');

/** Met à jour l'affichage des points de vie du Commissariat dans le HUD. */
function mettreAJourAffichageVie() {
    const ratio = Math.max(0, Math.min(1, pvBase / PV_BASE_MAX));
    elementVieBarre.style.width = (ratio * 100) + '%';
    elementVieBarre.style.background = ratio <= .3 ? '#ff465d' : '#3ddc84';
    elementViePourcentage.textContent = Math.round(ratio * 100) + '%';

    if (pvBase < PV_BASE_MAX) objectifSansPerte = false;
    mettreAJourBonusObjectif();
}

/** Met à jour le badge "Bonus objectif" (barre tactique du bas). */
function mettreAJourBonusObjectif() {
    const badge = document.getElementById('bonus-objectif');
    if (!badge) return;
    badge.classList.toggle('bonus-echoue', !objectifSansPerte);
    badge.querySelector('.bonus-objectif-etat').textContent = objectifSansPerte ? 'En cours' : 'Manqué';
}

/** Met à jour l'affichage du numéro de vague en cours dans le HUD. */
function mettreAJourAffichageVague() {
    elementVagueValeur.textContent = vagueActuelle;
}

function mettreAJourHUDOperationnel() {
    const statut = document.getElementById('statut-operation');
    const detail = document.getElementById('statut-detail');
    const totalMenaces = ennemis.length + ennemisRestantAGenerer;
    document.getElementById('ennemis-restants-valeur').textContent = totalMenaces;

    if (etatJeu === 'gagne') {
        statut.textContent = 'SÉCURISÉ'; detail.textContent = 'Toutes les vagues ont été repoussées.';
    } else if (etatJeu === 'perdu') {
        statut.textContent = 'ÉCHEC'; detail.textContent = 'Le Commissariat doit être repris.';
    } else if (preparationVagueRestante > 0) {
        statut.textContent = 'DÉPLOIEMENT'; detail.textContent = 'Premiers contacts dans ' + Math.max(1, Math.ceil(preparationVagueRestante)) + ' s.';
    } else if (vagueEnCours) {
        statut.textContent = 'CONTACT'; detail.textContent = 'Vague ' + vagueActuelle + ' — priorité aux cibles proches du Commissariat.';
    } else {
        statut.textContent = 'EN ATTENTE'; detail.textContent = 'Renforcez les toits puis lancez la prochaine vague.';
    }
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

function dessinerHelicoptere(cx, cy, unite) {
    const flottement = Math.sin(tempsAnimation * 2.8 + cx) * 3;
    const y = cy + flottement;
    ctx.save();
    ctx.translate(cx, y);
    ctx.fillStyle = 'rgba(0,0,0,.32)';
    ctx.beginPath(); ctx.ellipse(5, 13, 28, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#182a3b';
    ctx.beginPath(); ctx.ellipse(0, 0, 23, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a8fc9';
    ctx.beginPath(); ctx.ellipse(9, -2, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#9edfff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(-36, -3); ctx.lineTo(-41, 3); ctx.stroke();
    ctx.strokeStyle = 'rgba(210,240,255,.72)';
    ctx.lineWidth = 2;
    const rotor = tempsAnimation * 14;
    ctx.beginPath(); ctx.moveTo(Math.cos(rotor) * 34, Math.sin(rotor) * 5 - 12); ctx.lineTo(-Math.cos(rotor) * 34, -Math.sin(rotor) * 5 - 12); ctx.stroke();
    ctx.fillStyle = Math.sin(tempsAnimation * 8) > 0 ? '#54b7ff' : '#ff465d';
    ctx.fillRect(-2, -7, 5, 3);
    ctx.restore();

    if (unite.animationTir > 0) {
        ctx.strokeStyle = 'rgba(255,215,100,.75)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, 28 + (1 - unite.animationTir / .22) * 20, 0, Math.PI * 2); ctx.stroke();
    }
}

/** Dessine chaque unité posée sur son bâtiment, avec son portrait en avatar rond. */
function dessinerUnitesPlacees() {
    unitesPlacees.forEach(function (unite, index) {
        const centre = centreBatiment(unite.batiment);
        const infos = UNITES[unite.type];
        const yAnime = centre.y + Math.sin(tempsAnimation * 2.2 + index * 1.7) * 1.4;
        const plateforme = plateformePourUnite(unite.type);

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

        if (plateforme && plateforme.complete && plateforme.naturalWidth > 0) {
            ctx.save();
            ctx.globalAlpha = .96;
            dessinerImageCentree(plateforme, centre.x, centre.y + 2, unite.type === 'aerienne' ? 62 : 58);
            ctx.restore();
        }

        if (unite.type === 'aerienne') {
            dessinerHelicoptere(centre.x, yAnime, unite);
        } else {
            const recul = unite.animationTir > 0 ? 2.5 : 0;
            const portraitNiveau = PORTRAITS_AMELIORATIONS[unite.type] && PORTRAITS_AMELIORATIONS[unite.type][unite.niveau - 1];
            dessinerAvatarUnite(portraitNiveau || PORTRAITS_UNITES[unite.type], centre.x - recul, yAnime - 1, 15, infos.couleur);
            ctx.fillStyle = 'rgba(2, 9, 16, .82)';
            ctx.fillRect(centre.x - 18, yAnime + 14, 36, 11);
            ctx.fillStyle = '#eaf4ff';
            ctx.font = 'bold 8px "Arial Narrow", Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(infos.nom.replace('Agent ', '').replace('Police ', 'P. ').slice(0, 10).toUpperCase(), centre.x, yAnime + 22);
            ctx.textAlign = 'start';
        }

        if (unite.type === 'herse' || unite.type === 'cynophile') {
            ctx.strokeStyle = infos.couleur + '80';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(centre.x, centre.y, 27 + Math.sin(tempsAnimation * 3) * 3, 0, Math.PI * 2); ctx.stroke();
        }

        // Badge de grade : II en doré, III en rouge lumineux.
        if (unite.niveau >= 2) {
            ctx.beginPath();
            ctx.arc(centre.x + 16, yAnime - 16, unite.niveau === 3 ? 9 : 7, 0, Math.PI * 2);
            ctx.fillStyle = unite.niveau === 3 ? '#e63946' : '#ffd166';
            ctx.fill();
            ctx.fillStyle = unite.niveau === 3 ? '#ffffff' : '#07111f'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center'; ctx.fillText(unite.niveau === 3 ? 'III' : 'II', centre.x + 16, yAnime - 13); ctx.textAlign = 'start';
        }
        if (unite.animationUpgrade > 0) {
            const progression = 1 - unite.animationUpgrade;
            ctx.strokeStyle = 'rgba(255,209,102,' + unite.animationUpgrade + ')';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(centre.x, centre.y, 26 + progression * 42, 0, Math.PI * 2); ctx.stroke();
        }
    });
}

/** Dessine chaque ennemi (cercle + petite barre de vie au-dessus). */
function dessinerEnnemis() {
    ennemis.forEach(function (ennemi) {
        const cible = CHEMIN[Math.min(CHEMIN.length - 1, ennemi.indexPointCourant)];
        const angle = Math.atan2(cible.y - ennemi.y, cible.x - ennemi.x);
        const rayon = ennemi.rayon || 11;
        const marche = Math.sin(tempsAnimation * (ennemi.vitesseBase / 11) + ennemi.x * .04);
        const sprite = SPRITES_ENNEMIS[ennemi.archetype] || SPRITES_ENNEMIS.standard;
        ctx.save();
        ctx.translate(ennemi.x, ennemi.y);
        ctx.rotate(angle + Math.PI / 2);
        ctx.fillStyle = 'rgba(0,0,0,.34)';
        ctx.beginPath(); ctx.ellipse(3, 8, rayon, rayon * .55, 0, 0, Math.PI * 2); ctx.fill();
        if (sprite && sprite.complete && sprite.naturalWidth > 0) {
            const taille = rayon * (ennemi.archetype === 'eclaireur' ? 3.2 : 3.5);
            ctx.globalAlpha = ennemi.impactRestant > 0 ? .56 : 1;
            ctx.drawImage(sprite, -taille / 2, -taille / 2 + marche * .7, taille, taille);
            if (ennemi.impactRestant > 0) {
                ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = 'rgba(255,255,255,.66)';
                ctx.beginPath(); ctx.arc(0, 0, rayon * 1.1, 0, Math.PI * 2); ctx.fill();
            }
        } else {
            ctx.strokeStyle = ennemi.impactRestant > 0 ? '#ffffff' : ennemi.couleur;
            ctx.fillStyle = ennemi.impactRestant > 0 ? '#f7fbff' : ennemi.couleur;
            ctx.lineWidth = ennemi.archetype === 'blinde' ? 5 : 3;
            ctx.beginPath(); ctx.moveTo(-4, 10); ctx.lineTo(-5 + marche * 2, 18); ctx.moveTo(4, 10); ctx.lineTo(5 - marche * 2, 18); ctx.stroke();
            ctx.fillRect(-rayon * .48, -2, rayon * .96, 14);
            ctx.beginPath(); ctx.arc(0, -7, rayon * .5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();

        // La barre de vie : un fond gris, puis un remplissage coloré
        // dont la largeur dépend du pourcentage de vie restant.
        const largeurBarre = 30 + (rayon - 10) * 2;
        const ratioVie = Math.max(0, ennemi.pv / ennemi.pvMax);

        ctx.fillStyle = '#2b2f36';
        ctx.fillRect(ennemi.x - largeurBarre / 2, ennemi.y - rayon - 13, largeurBarre, 5);

        ctx.fillStyle = ratioVie > 0.3 ? '#4caf50' : '#e63946';
        ctx.fillRect(ennemi.x - largeurBarre / 2, ennemi.y - rayon - 13, largeurBarre * ratioVie, 5);

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

        const facteurs = unitesPlacees.filter(function (u) { return u.facteurRalentissement && distanceEntre(centreBatiment(u.batiment), ennemi) <= u.portee; });
        if (facteurs.length && ennemi.immobiliseRestante <= 0) {
            ctx.fillStyle = 'rgba(90, 205, 255, .72)';
            for (let i = 0; i < 3; i++) {
                const a = tempsAnimation * 2 + i * Math.PI * 2 / 3;
                ctx.beginPath(); ctx.arc(ennemi.x + Math.cos(a) * 16, ennemi.y + Math.sin(a) * 7, 2, 0, Math.PI * 2); ctx.fill();
            }
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
        ctx.strokeStyle = effet.type === 'marquage' ? '#ffd166' : effet.couleur;
        ctx.lineWidth = effet.type === 'helicoptere' ? 4 : 2;
        ctx.setLineDash(effet.type === 'marquage' ? [4, 4] : []);
        ctx.stroke();
        ctx.setLineDash([]);

        const progression = 1 - effet.dureeRestante / effet.dureeInitiale;
        const px = effet.x1 + (effet.x2 - effet.x1) * progression;
        const py = effet.y1 + (effet.y2 - effet.y1) * progression;
        ctx.fillStyle = '#fff7c5';
        ctx.beginPath(); ctx.arc(px, py, effet.type === 'helicoptere' ? 5 : 3, 0, Math.PI * 2); ctx.fill();

        if (effet.type === 'helicoptere' || effet.type === 'immobilisation') {
            ctx.strokeStyle = effet.type === 'helicoptere' ? 'rgba(255,70,93,.8)' : 'rgba(255,209,102,.9)';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(effet.x2, effet.y2, 12 + progression * 20, 0, Math.PI * 2); ctx.stroke();
        }

        ctx.globalAlpha = 1; // on remet l'opacité normale pour la suite des dessins
    });

    particules.forEach(function (p) {
        ctx.globalAlpha = Math.max(0, p.vie / p.vieMax);
        ctx.fillStyle = p.couleur;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.taille, 0, Math.PI * 2); ctx.fill();
    });
    textesFlottants.forEach(function (t) {
        ctx.globalAlpha = Math.max(0, t.vie / t.vieMax);
        ctx.fillStyle = t.couleur;
        ctx.font = 'bold 12px "Arial Narrow", Arial, sans-serif';
        ctx.textAlign = 'center'; ctx.fillText(t.texte, t.x, t.y);
    });
    ctx.textAlign = 'start';
    ctx.globalAlpha = 1;
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
    const pulsation = .72 + Math.sin(tempsAnimation * 2.6) * .06;
    ctx.fillStyle = 'rgba(0, 5, 12, ' + pulsation + ')';
    ctx.fillRect(0, 0, LARGEUR_CANVAS, HAUTEUR_CANVAS);

    if (etatJeu === 'gagne') {
        dessinerImageCentree(LOGO_VICTOIRE, LARGEUR_CANVAS / 2, HAUTEUR_CANVAS / 2 - 110, 160);
    }

    ctx.fillStyle = 'rgba(5, 18, 30, .92)';
    ctx.fillRect(LARGEUR_CANVAS / 2 - 260, HAUTEUR_CANVAS / 2 - 48, 520, 126);
    ctx.strokeStyle = couleur; ctx.lineWidth = 3;
    ctx.strokeRect(LARGEUR_CANVAS / 2 - 260, HAUTEUR_CANVAS / 2 - 48, 520, 126);
    ctx.fillStyle = couleur;
    ctx.font = 'bold 48px "Arial Narrow", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(texte, LARGEUR_CANVAS / 2, HAUTEUR_CANVAS / 2);
    ctx.fillStyle = '#dbeeff';
    ctx.font = 'bold 14px "Arial Narrow", Arial, sans-serif';
    ctx.fillText(etatJeu === 'gagne' ? 'SECTEUR SÉCURISÉ • MODS DÉBLOQUÉS' : 'RÉORGANISEZ VOS UNITÉS ET RELANCEZ L’OPÉRATION', LARGEUR_CANVAS / 2, HAUTEUR_CANVAS / 2 + 42);

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
    ctx.save();
    if (secousseRestante > 0) {
        const intensite = secousseRestante * 13;
        ctx.translate(Math.sin(tempsAnimation * 73) * intensite, Math.cos(tempsAnimation * 59) * intensite);
    }
    dessinerCarte();
    dessinerUnitesPlacees();
    dessinerEffetsTir();
    dessinerEnnemis();

    if (flashBaseRestant > 0) {
        ctx.fillStyle = 'rgba(255, 50, 76, ' + Math.min(.28, flashBaseRestant) + ')';
        ctx.fillRect(0, 0, LARGEUR_CANVAS, HAUTEUR_CANVAS);
    }

    if (etatJeu === 'perdu') dessinerEcranFin('GAME OVER', '#e63946');
    if (etatJeu === 'gagne') dessinerEcranFin('VICTOIRE !', '#4d9dff');
    ctx.restore();
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
    const dtReel = Math.min((tempsActuel - dernierTemps) / 1000, 0.1);
    const dt = dtReel * multiplicateurVitesseJeu;
    dernierTemps = tempsActuel;
    tempsAnimation += dtReel;

    if (etatJeu === 'en_cours') {
        mettreAJourVague(dt);
        mettreAJourEnnemis(dt);
        mettreAJourUnites(dt);
        verifierFinDeVague();
    }
    mettreAJourEffets(dt);
    mettreAJourHUDOperationnel();

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
// Passe à "true" dès qu'une première partie a démarré : permet au
// bouton "Jouer" du menu Studio de savoir s'il doit ouvrir l'écran de
// difficulté (tout premier lancement) ou simplement refermer le menu
// (cas où le menu a été rouvert en cours de partie via le bouton "Aide").
let partieDejaDemarree = false;

function demarrerPartieAvecDifficulte(cle) {
    initialiserAudio(); // déclenché par le clic : conforme aux restrictions d'autoplay des navigateurs
    difficulteActuelle = cle;
    partieDejaDemarree = true;
    document.getElementById('ecran-accueil').classList.add('cache');
    reinitialiserPartie();
    definirModeMusique('jeu');
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
let modsDebloques = lireStockage(CLE_MODS_DEBLOQUES, 'false') === 'true';

// L'état actuel (activé/désactivé) de chaque mod. On relit d'abord ce
// qui est sauvegardé dans localStorage, puis on s'assure que chaque
// mod du catalogue MODS a bien une valeur (au cas où on ajouterait un
// nouveau mod plus tard, après une sauvegarde plus ancienne).
let modsActifs = {};
try { modsActifs = JSON.parse(lireStockage(CLE_MODS_ACTIFS, '{}')); } catch (erreur) { modsActifs = {}; }
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
            ecrireStockage(CLE_MODS_ACTIFS, JSON.stringify(modsActifs));
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
    ecrireStockage(CLE_MODS_DEBLOQUES, 'true');
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

    score = 0;
    mettreAJourAffichageScore();

    objectifSansPerte = true;
    pvBase = PV_BASE_MAX;
    mettreAJourAffichageVie();

    vagueActuelle = 0;
    vagueEnCours = false;
    configVagueActuelle = null;
    ennemisRestantAGenerer = 0;
    chronoProchaineApparition = 0;
    preparationVagueRestante = 0;
    compteurEnnemisGeneres = 0;
    mettreAJourAffichageVague();
    elementVagueTotal.textContent = modsActifs.vaguesInfinies ? '∞' : NOMBRE_TOTAL_VAGUES;

    ennemis = [];
    unitesPlacees = [];
    effetsTir = [];
    particules = [];
    textesFlottants = [];
    secousseRestante = 0;
    flashBaseRestant = 0;

    typeSelectionnePourAchat = null;
    uniteSelectionnee = null;
    masquerPanneauSelection();
    actualiserEtatBoutique();
    document.getElementById('annonce-vague').classList.add('cache');

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

const boutonAudio = document.getElementById('bouton-audio');
const curseurVolume = document.getElementById('volume-audio');
const boutonVitesse = document.getElementById('bouton-vitesse');

function actualiserControlesAudio() {
    boutonAudio.textContent = audioMuet || volumeAudio === 0 ? '🔇' : '🔊';
    boutonAudio.setAttribute('aria-pressed', String(audioMuet));
    boutonAudio.title = audioMuet ? 'Réactiver le son' : 'Couper le son';
    curseurVolume.value = Math.round(volumeAudio * 100);
}

boutonAudio.addEventListener('click', function () {
    initialiserAudio();
    audioMuet = !audioMuet;
    ecrireStockage('alertePoliceSecours_audioMuet', String(audioMuet));
    appliquerVolumeAudio();
    actualiserControlesAudio();
    if (!audioMuet) jouerSon('construction');
});

curseurVolume.addEventListener('input', function () {
    initialiserAudio();
    volumeAudio = Number(curseurVolume.value) / 100;
    audioMuet = false;
    ecrireStockage('alertePoliceSecours_volume', String(volumeAudio));
    ecrireStockage('alertePoliceSecours_audioMuet', 'false');
    appliquerVolumeAudio();
    actualiserControlesAudio();
});


const menuOverlay = document.getElementById('menu-overlay');
const menuHome = document.getElementById('menu-home');
const menuOptionsPanel = document.getElementById('menu-options-panel');
const menuCreditsPanel = document.getElementById('menu-credits-panel');
const menuReglesPanel = document.getElementById('menu-regles-panel');
const menuPersonnagesPanel = document.getElementById('menu-personnages-panel');
const menuAmeliorationsPanel = document.getElementById('menu-ameliorations-panel');
const menuVolume = document.getElementById('menu-volume');
const menuMute = document.getElementById('menu-mute');

function afficherSectionMenu(section) {
    menuHome.hidden = section !== 'accueil';
    menuOptionsPanel.hidden = section !== 'options';
    menuCreditsPanel.hidden = section !== 'credits';
    menuReglesPanel.hidden = section !== 'regles';
    menuPersonnagesPanel.hidden = section !== 'personnages';
    menuAmeliorationsPanel.hidden = section !== 'ameliorations';
    document.querySelector('.menu-panel').classList.toggle('menu-panel-large', section === 'regles' || section === 'personnages' || section === 'ameliorations');
}

function synchroniserOptionsMenu() {
    menuVolume.value = curseurVolume.value;
    menuMute.textContent = !audioMuet && volumeAudio > 0 ? 'Couper le son' : 'Activer le son';
}

function showMenu() {
    afficherSectionMenu('accueil');
    synchroniserOptionsMenu();
    definirModeMusique('menu');
    document.getElementById('ecran-accueil').classList.add('cache');
    menuOverlay.classList.remove('menu-cache');
    document.getElementById('menu-jouer').focus();
}

function hideMenu() {
    menuOverlay.classList.add('menu-cache');
}

document.getElementById('menu-jouer').addEventListener('click', function () {
    initialiserAudio();
    hideMenu();
    // Si une partie est déjà en cours, le menu a été rouvert via le
    // bouton "Aide" du HUD : on se contente de le refermer, sans
    // repasser par l'écran de choix de la difficulté.
    if (partieDejaDemarree) return;
    document.getElementById('ecran-accueil').classList.remove('cache');
});

// Bouton "Aide" du HUD en jeu : rouvre le menu Studio directement sur
// la section Règles, sans interrompre la partie en cours (l'état du
// jeu n'est pas modifié, seul le menu passe au premier plan).
const boutonAide = document.getElementById('bouton-aide');
if (boutonAide) {
    boutonAide.addEventListener('click', function () {
        showMenu();
        afficherSectionMenu('regles');
    });
}

document.getElementById('menu-regles').addEventListener('click', function () { afficherSectionMenu('regles'); });
document.getElementById('menu-personnages').addEventListener('click', function () { afficherSectionMenu('personnages'); });
document.getElementById('menu-ameliorations').addEventListener('click', function () { afficherSectionMenu('ameliorations'); });

document.getElementById('menu-options').addEventListener('click', function () {
    synchroniserOptionsMenu();
    afficherSectionMenu('options');
});

document.getElementById('menu-credits').addEventListener('click', function () {
    afficherSectionMenu('credits');
});

document.querySelectorAll('.menu-retour').forEach(function (bouton) {
    bouton.addEventListener('click', function () { afficherSectionMenu('accueil'); });
});

menuVolume.addEventListener('input', function () {
    curseurVolume.value = menuVolume.value;
    curseurVolume.dispatchEvent(new Event('input', { bubbles: true }));
    synchroniserOptionsMenu();
});

menuMute.addEventListener('click', function () {
    boutonAudio.click();
    synchroniserOptionsMenu();
});

menuOverlay.addEventListener('pointerdown', function activerMusiqueMenu() {
    initialiserAudio();
    definirModeMusique('menu');
}, { once:true });

menuOverlay.addEventListener('keydown', function (evenement) {
    if (evenement.key === 'Escape' && menuHome.hidden) afficherSectionMenu('accueil');
});

boutonVitesse.addEventListener('click', function () {
    multiplicateurVitesseJeu = multiplicateurVitesseJeu === 1 ? 2 : 1;
    boutonVitesse.textContent = '×' + multiplicateurVitesseJeu;
    boutonVitesse.setAttribute('aria-pressed', String(multiplicateurVitesseJeu === 2));
    boutonVitesse.title = multiplicateurVitesseJeu === 2 ? 'Revenir à la vitesse normale' : 'Accélérer le jeu';
});

document.addEventListener('keydown', function (evenement) {
    if (evenement.key.toLowerCase() === 'm') boutonAudio.click();
    if (evenement.key === ' ' && (!menuOverlay.classList.contains('menu-cache') || !document.getElementById('ecran-accueil').classList.contains('cache'))) return;
    if (evenement.key === ' ' && !vagueEnCours && etatJeu !== 'gagne' && etatJeu !== 'perdu') {
        evenement.preventDefault();
        lancerVagueSuivante();
    }
});


function pourcentageStatistique(valeur, maximum) { return Math.max(8, Math.min(100, Math.round(valeur / maximum * 100))); }

function initialiserMenuStudio() {
    const grillePersonnages = document.getElementById('menu-personnages-grille');
    const grilleAmeliorations = document.getElementById('menu-ameliorations-grille');
    Object.keys(UNITES).forEach(function(type) {
        const infos = UNITES[type];
        const meta = COMPETENCES_UNITES[type];
        const carte = document.createElement('article');
        carte.className = 'menu-personnage-card';
        const image = document.createElement('img'); image.src = IMAGES_AMELIORATIONS[type][0]; image.alt = infos.nom + ', niveau I';
        const corps = document.createElement('div');
        const titre = document.createElement('h3'); titre.textContent = infos.nom;
        const role = document.createElement('p'); role.textContent = meta.role + ' • ' + meta.skill;
        const attaque = document.createElement('p'); attaque.textContent = meta.attaque + ' — cible : ' + meta.cible;
        corps.append(titre, role, attaque);
        [['Dégâts',pourcentageStatistique(infos.degats || 1,180)],['Portée',pourcentageStatistique(infos.portee,520)],['Cadence',pourcentageStatistique(1 / Math.max(.18,infos.tempsEntreTirs || 1),4)]].forEach(function(stat){
            const ligne = document.createElement('span'); ligne.className = 'menu-stat'; ligne.innerHTML = '<b>' + stat[0] + '</b><i style="--stat:' + stat[1] + '%"></i>'; corps.appendChild(ligne);
        });
        carte.append(image, corps); grillePersonnages.appendChild(carte);

        const evolution = document.createElement('article'); evolution.className = 'menu-amelioration-card';
        const nom = document.createElement('h3'); nom.textContent = infos.nom;
        const niveaux = document.createElement('div'); niveaux.className = 'menu-evolutions';
        IMAGES_AMELIORATIONS[type].forEach(function(uri,index){
            const figure = document.createElement('figure'); figure.className = 'menu-evolution';
            const visuel = document.createElement('img'); visuel.src = uri; visuel.alt = infos.nom + ', niveau ' + (index + 1); visuel.loading = 'lazy';
            const legende = document.createElement('figcaption'); legende.textContent = 'N' + (index + 1);
            figure.append(visuel, legende); niveaux.appendChild(figure);
        });
        const details = document.createElement('small'); details.textContent = 'Chaque niveau : dégâts +50 %, portée +20 %, cadence améliorée. Niveau III : ' + meta.effet + '.';
        evolution.append(nom, niveaux, details); grilleAmeliorations.appendChild(evolution);
    });
}

function initialiserRosterV3() {
    const grille = document.getElementById('roster-grille');
    Object.keys(UNITES).forEach(function(type) {
        const carte = document.createElement('article'); carte.className = 'roster-carte';
        const image = document.createElement('img'); image.src = IMAGES_AMELIORATIONS[type][0]; image.alt = UNITES[type].nom;
        const nom = document.createElement('strong'); nom.textContent = UNITES[type].nom;
        const meta = COMPETENCES_UNITES[type];
        const role = document.createElement('span'); role.className = 'roster-role'; role.textContent = meta.role;
        const skill = document.createElement('p'); skill.className = 'roster-skill'; skill.textContent = meta.skill + ' — ' + meta.attaque;
        const niveaux = document.createElement('div'); niveaux.className = 'roster-niveaux'; niveaux.innerHTML = '<span>I</span><span>II</span><span class="niveau-iii">III</span>';
        carte.append(image, nom, role, skill, niveaux); grille.appendChild(carte);
    });
    const ecran = document.getElementById('ecran-roster');
    document.getElementById('bouton-roster').addEventListener('click', function(){ ecran.classList.add('ouvert'); ecran.setAttribute('aria-hidden','false'); });
    document.getElementById('bouton-fermer-roster').addEventListener('click', function(){ ecran.classList.remove('ouvert'); ecran.setAttribute('aria-hidden','true'); });
    ecran.addEventListener('click', function(e){ if(e.target === ecran) document.getElementById('bouton-fermer-roster').click(); });
}

initialiserMenuStudio();
initialiserRosterV3();
initialiserEcranAccueil();
initialiserBoutique();
initialiserPanneauMods();
if (modsDebloques) afficherPanneauMods();
actualiserControlesAudio();

argent = calculerArgentDepart(); // tient compte de la difficulté et des mods déjà choisis lors d'une précédente visite
mettreAJourAffichageArgent();
mettreAJourAffichageVie();
mettreAJourAffichageVague();
elementVagueTotal.textContent = modsActifs.vaguesInfinies ? '∞' : NOMBRE_TOTAL_VAGUES;

requestAnimationFrame(boucleJeu);

