# Prompts de génération d'images — Alerte Police Secours

Ce fichier regroupe tous les prompts prêts à copier-coller dans ChatGPT
(ou tout autre générateur d'images IA) pour créer les visuels du jeu :
personnages, logos/écussons, et mobilier urbain.

## ⚠️ Pourquoi pas les personnages Marvel directement

Le jeu s'inspire de Stark Tower Defense dans ses **mécaniques**, mais les
personnages Marvel (Cyclope, Thor, etc.) sont des créations protégées par le
droit d'auteur et des marques déposées : reprendre leur apparence, leurs
pouvoirs signature ou leur nom — même "reskinnés" en policiers — resterait
une œuvre dérivée non autorisée, exactement comme pour les graphismes du
fichier Flash Marvel analysé précédemment.

À la place, ce fichier propose des **personnages 100% originaux**, avec un
mapping réaliste vers de vraies unités de police/gendarmerie françaises,
choisi pour coller à ce que fait chaque unité dans le jeu :

| Unité en jeu           | Service réel associé | Pourquoi                                                   |
|-------------------------|-----------------------|--------------------------------------------------------------|
| Tireur de précision     | **RAID**              | Unité d'élite de la Police Nationale, tir de précision, discrétion |
| Unité lourde             | **GIGN**               | Unité d'élite de la Gendarmerie, assaut, effraction, puissance de feu |
| Herse routière           | **CRS**                | Gère réellement barrages routiers et contrôle de foule       |
| Unité polyvalente (nouveau) | **Police Secours**  | Premier service à intervenir sur le terrain (appels du 17), donne son nom au jeu |
| (Commissariat)           | **Commissaire**        | Chef d'établissement, figure d'autorité du QG                |

Aucun de ces personnages ne doit ressembler à un héros Marvel existant : les
prompts ci-dessous décrivent des silhouettes, équipements et couleurs
propres à chaque service français réel, pas des super-pouvoirs.

---

## Direction artistique commune (à garder en tête pour tous les prompts)

Pour que toutes les images générées aient l'air de sortir du même jeu,
utilise systématiquement ce cadrage de style, en l'ajoutant si besoin à la
fin de chaque prompt individuel :

> Style illustration vectorielle plate ("flat design"), contours nets et
> légèrement épais, couleurs vives et saturées, éclairage doux sans
> photoréalisme, esthétique jeu vidéo mobile moderne. Pas de texte, pas de
> watermark, pas de logo Marvel/DC ni d'aucune marque existante.

**Palette de couleurs du jeu** (à mentionner pour rester cohérent) :
- Bleu police / gyrophare : `#245ec9` et `#4d9dff`
- Rouge alerte / gyrophare (RAID) : `#e63946`
- Orange (GIGN) : `#f4a259`
- Bleu-gris (CRS) : `#8d99ae`
- Doré (argent, accents) : `#ffd166`
- Gris asphalte : `#3c444c`
- Marron toits de bâtiments : `#7a5230`
- Fond nuit urbaine : `#06090d` / `#101822`
- Turquoise (BAC) : `#2ec4b6`
- Violet (BRI) : `#6a4c93`
- Brun/beige (Police Judiciaire) : `#b08968`
- Vert forêt (Unité Cynophile) : `#4c7a3d`
- Jaune sécurité routière (Compagnie Motocycliste) : `#f7b32b`
- Bleu ciel (Section Aérienne) : `#5da9e9`

---

## 1. Les personnages

Pour chaque personnage, deux prompts sont fournis :
- **Portrait** (buste, vu de face) → pour un futur écran de sélection ou la boutique
- **Sprite vue de dessus** (top-down) → pour un futur remplacement des formes géométriques actuelles sur la carte

### 1.1 Le Commissaire — chef du Commissariat Central

**Rôle en jeu** : figure d'autorité, pourrait illustrer l'écran d'accueil,
l'écran de victoire, ou un futur dialogue/tutoriel.

**Portrait :**
> Portrait en buste d'un commissaire de police français d'âge mûr, cheveux
> gris courts, visage déterminé et bienveillant, en uniforme bleu marine
> avec épaulettes argentées et cravate, casquette de commissaire posée sur
> le bureau ou légèrement inclinée sur la tête. Arrière-plan flouté évoquant
> un bureau de commissariat (drapeau français, dossiers). Style illustration
> vectorielle plate, contours nets, couleurs vives, palette bleu `#245ec9`
> et doré `#ffd166`. Fond neutre ou légèrement dégradé, sans texte ni logo
> officiel réel.

**Sprite vue de dessus :**
> Personnage vu strictement de dessus (vue zénithale, style plan de jeu
> vidéo Tower Defense 2D), petit personnage stylisé en uniforme bleu marine
> de commissaire, casquette visible par-dessus la tête, posture debout
> immobile. Silhouette simple et lisible sur fond transparent, ombre portée
> légère au sol, style vectoriel plat, mêmes couleurs que le reste du jeu.

---

### 1.2 Agent RAID — "Tireur de précision"

**Rôle en jeu** : dégâts élevés sur une seule cible, tir lent, longue portée.

**Portrait :**
> Portrait en buste d'un policier français de l'unité RAID, tenue tactique
> noire, gilet pare-balles avec inscription générique "POLICE" (pas de vrai
> logo officiel), cagoule ou lunettes de visée sur le front, posture
> concentrée et professionnelle. Pas d'arme visible au premier plan (juste
> le haut du corps). Style illustration vectorielle plate, contours nets,
> palette dominante noir/gris foncé avec accents rouge `#e63946` (couleur
> assignée à cette unité dans le jeu). Fond neutre dégradé sombre.

**Sprite vue de dessus :**
> Personnage vu strictement de dessus (vue zénithale, jeu vidéo Tower
> Defense 2D), petit policier tactique en tenue noire avec accents rouges,
> silhouette simple, casque visible depuis le dessus, posture immobile en
> position de tir agenouillée. Fond transparent, ombre portée légère, style
> vectoriel plat cohérent avec le reste des unités du jeu.

---

### 1.3 Agent GIGN — "Unité lourde"

**Rôle en jeu** : dégâts de zone (explosion), cadence de tir plus rapide,
portée plus courte.

**Portrait :**
> Portrait en buste d'un gendarme français de l'unité GIGN, équipement
> lourd, gilet tactique renforcé bleu marine foncé avec inscription
> générique "GENDARMERIE" stylisée (pas de vrai logo officiel), casque
> balistique, carrure imposante, expression déterminée. Style illustration
> vectorielle plate, contours nets, couleurs vives, palette bleu marine
> foncé avec accents orange `#f4a259` (couleur assignée à cette unité dans
> le jeu). Fond neutre dégradé sombre.

**Sprite vue de dessus :**
> Personnage vu strictement de dessus (vue zénithale, jeu vidéo Tower
> Defense 2D), petit gendarme en équipement lourd bleu marine avec accents
> orange, carrure large et trapue vue du dessus, casque balistique visible,
> posture immobile en position de tir debout. Fond transparent, ombre
> portée légère, style vectoriel plat cohérent avec le reste du jeu.

---

### 1.4 Agent CRS — "Herse routière"

**Rôle en jeu** : aucun dégât, ralentit les ennemis dans sa zone (barrage
routier / contrôle de foule).

**Portrait :**
> Portrait en buste d'un CRS français en tenue de maintien de l'ordre,
> casque avec visière relevée, gilet tactique bleu-gris avec inscription
> générique "CRS" stylisée (pas de vrai logo officiel), tenant un
> chevalet/barrière de signalisation routière visible en arrière-plan flou.
> Style illustration vectorielle plate, contours nets, couleurs vives,
> palette bleu-gris `#8d99ae` (couleur assignée à cette unité dans le jeu)
> avec accents jaune/noir façon signalisation routière. Fond neutre.

**Sprite vue de dessus :**
> Personnage vu strictement de dessus (vue zénithale, jeu vidéo Tower
> Defense 2D), petit CRS en tenue bleu-gris posté à côté d'une barrière de
> signalisation rayée jaune et noire, vue du dessus, posture immobile. Fond
> transparent, ombre portée légère, style vectoriel plat cohérent avec le
> reste du jeu.

---

### 1.5 Agent Police Secours — nouvelle unité polyvalente

**Rôle en jeu** : c'est le service qui donne son nom au jeu — logique
qu'il ait son propre personnage ! C'est une unité jouable de base
polyvalente, peu coûteuse, dégâts modestes mais cadence de tir rapide et
fiable (le "premier arrivé sur les lieux"). Peut servir d'unité de départ
recommandée aux nouveaux joueurs, complémentaire du Tireur RAID (lent et
puissant), de l'Unité lourde GIGN (zone) et de la Herse CRS (aucun dégât).
Couleur suggérée pour cette unité : bleu vif `#4d9dff` (la couleur "police"
principale du jeu).

**Portrait :**
> Portrait en buste d'un agent de police-secours français en patrouille,
> uniforme bleu marine classique avec bandes réfléchissantes bleu clair et
> jaune fluo sur les épaules, gilet pare-balles léger, talkie-walkie
> accroché à l'épaule, expression alerte et bienveillante. Style
> illustration vectorielle plate, contours nets, couleurs vives, palette
> bleu `#4d9dff` avec accents jaune fluorescent. Fond neutre dégradé,
> ambiance patrouille de nuit, sans texte ni logo officiel réel.

**Sprite vue de dessus :**
> Personnage vu strictement de dessus (vue zénithale, jeu vidéo Tower
> Defense 2D), petit agent de police en uniforme bleu marine avec bandes
> réfléchissantes jaune fluo, casquette de patrouille visible depuis le
> haut, posture immobile en position de veille. Fond transparent, ombre
> portée légère, style vectoriel plat cohérent avec le reste des unités du
> jeu.

---

### 1.6 Agent BAC — concept "Brigade Anti-Criminalité"

**Rôle en jeu (unité jouable)** : agents en civil, intervention
rapide et discrète. Piste de jeu : tir rapide à faible portée qui touche
plusieurs petites cibles proches (patrouille agile). Couleur suggérée :
turquoise `#2ec4b6`.

**Portrait :**
> Portrait en buste d'un policier français de la BAC en tenue civile
> (blouson sombre décontracté, pas d'uniforme visible), brassard "POLICE"
> discret au bras, oreillette, posture vigilante et alerte, regard qui
> scrute la rue. Style illustration vectorielle plate, contours nets,
> couleurs vives, palette sombre avec accents turquoise `#2ec4b6`. Fond
> neutre dégradé, ambiance urbaine nocturne, sans texte ni logo officiel réel.

**Sprite vue de dessus :**
> Personnage vu strictement de dessus (vue zénithale, jeu vidéo Tower
> Defense 2D), petit policier en blouson civil sombre avec un discret
> brassard turquoise, silhouette simple, posture immobile légèrement
> penchée en avant (aux aguets). Fond transparent, ombre portée légère,
> style vectoriel plat cohérent avec le reste des unités du jeu.

---

### 1.7 Agent BRI — concept "Brigade de Recherche et d'Intervention"

**Rôle en jeu (unité jouable)** : unité d'élite historique
("l'Anti-gang"). Piste de jeu : tir occasionnel très puissant façon "coup
critique", une frappe chirurgicale plutôt qu'un tir régulier. Couleur
suggérée : violet profond `#6a4c93`.

**Portrait :**
> Portrait en buste d'un policier français de la BRI, tenue tactique noire
> ajustée, gilet fin renforcé avec liseré violet, cagoule fine ou lunettes
> tactiques, posture intense et concentrée, expression déterminée. Style
> illustration vectorielle plate, contours nets, palette noir/gris foncé
> avec accents violet `#6a4c93`. Fond neutre dégradé sombre, sans texte ni
> logo officiel réel.

**Sprite vue de dessus :**
> Personnage vu strictement de dessus (vue zénithale, jeu vidéo Tower
> Defense 2D), petit policier tactique en tenue noire avec liseré violet,
> posture immobile en appui, silhouette fine et précise. Fond transparent,
> ombre portée légère, style vectoriel plat cohérent avec le reste du jeu.

---

### 1.8 Agent Police Judiciaire — concept "l'Enquêteur"

**Rôle en jeu (unité jouable)** : ne fait pas de dégâts, mais
"marque" un ennemi pour que toutes les autres unités lui infligent plus de
dégâts (synergie d'équipe). Couleur suggérée : brun/beige `#b08968`.

**Portrait :**
> Portrait en buste d'un enquêteur de la Police Judiciaire française,
> trench-coat beige/brun classique sur chemise simple, badge de police à la
> ceinture, carnet de notes visible, regard analytique et posture calme et
> réfléchie. Style illustration vectorielle plate, contours nets, couleurs
> chaudes, palette brun/beige `#b08968`. Fond neutre dégradé, ambiance
> urbaine, sans texte ni logo officiel réel.

**Sprite vue de dessus :**
> Personnage vu strictement de dessus (vue zénithale, jeu vidéo Tower
> Defense 2D), petit enquêteur en trench-coat brun/beige, silhouette
> simple, posture immobile légèrement penchée comme s'il observait une
> scène. Fond transparent, ombre portée légère, style vectoriel plat
> cohérent avec le reste du jeu.

---

### 1.9 Maître-chien — concept "Unité Cynophile"

**Rôle en jeu (unité jouable)** : petits dégâts continus (morsure)
et léger ralentissement, complémentaire de la Herse CRS. Couleur suggérée :
vert forêt `#4c7a3d`.

**Portrait :**
> Portrait d'un maître-chien de la police française en tenue tactique verte
> foncée, accompagné de son chien policier générique (silhouette de berger
> non spécifique à une race protégée), laisse courte tenue fermement, les
> deux regardant dans la même direction avec attention. Style illustration
> vectorielle plate, contours nets, couleurs vives, palette vert forêt
> `#4c7a3d`. Fond neutre dégradé, sans texte ni logo officiel réel.

**Sprite vue de dessus :**
> Duo vu strictement de dessus (vue zénithale, jeu vidéo Tower Defense 2D) :
> petit maître-chien en tenue verte foncée à côté de son chien policier
> stylisé, silhouettes simples et lisibles, posture immobile côte à côte.
> Fond transparent, ombre portée légère, style vectoriel plat cohérent avec
> le reste du jeu.

---

### 1.10 Agent Compagnie Motocycliste — concept "l'Intercepteur"

**Rôle en jeu (unité jouable)** : intercepte et immobilise
brièvement un seul ennemi rapide (contre-mesure anti-"speedster"). Couleur
suggérée : jaune sécurité routière `#f7b32b`.

**Portrait :**
> Portrait en buste d'un motard de la police française, blouson de moto
> renforcé bleu marine avec bandes réfléchissantes jaune vif, casque de
> moto tenu sous le bras ou porté avec visière relevée, posture assurée.
> Motocyclette stylisée floutée en arrière-plan. Style illustration
> vectorielle plate, contours nets, couleurs vives, palette bleu marine
> avec accents jaune `#f7b32b`. Fond neutre dégradé, sans texte ni logo
> officiel réel.

**Sprite vue de dessus :**
> Personnage vu strictement de dessus (vue zénithale, jeu vidéo Tower
> Defense 2D), petit motard en blouson bleu marine avec bandes jaunes,
> casque visible depuis le dessus, positionné à côté d'une moto stylisée
> vue de dessus. Fond transparent, ombre portée légère, style vectoriel
> plat cohérent avec le reste du jeu.

---

### 1.11 Section Aérienne — concept "l'Hélicoptère"

**Rôle en jeu (unité jouable)** : unité spéciale à très large
zone d'action mais très long temps de rechargement (frappe ponctuelle façon
"ultime"). Contrairement aux autres unités, sa représentation sur la carte
serait l'hélicoptère lui-même plutôt qu'un personnage debout. Couleur
suggérée : bleu ciel `#5da9e9`.

**Portrait (le pilote, pour l'écran de sélection) :**
> Portrait en buste d'un pilote de la Section Aérienne de la police
> française, combinaison de vol bleu marine avec liseré bleu ciel, casque
> de vol avec visière et micro intégré, posture professionnelle. Hélicoptère
> stylisé flouté en arrière-plan. Style illustration vectorielle plate,
> contours nets, couleurs vives, palette bleu ciel `#5da9e9`. Fond neutre
> dégradé, sans texte ni logo officiel réel.

**Sprite vue de dessus (l'hélicoptère, pour la carte) :**
> Un hélicoptère de police stylisé vu strictement de dessus (vue zénithale,
> jeu vidéo Tower Defense 2D), fuselage bleu marine avec liseré bleu ciel
> `#5da9e9`, rotor principal représenté par une fine silhouette circulaire
> semi-transparente (effet de mouvement), pas de logo officiel réel. Fond
> transparent, ombre portée douce au sol, style vectoriel plat cohérent
> avec le reste du jeu.

---

### 1.12 (Optionnel) Le meneur de la bande — antagoniste générique

**Rôle en jeu** : pourrait illustrer un futur "boss" de fin de niveau ou
l'écran de défaite. Personnage 100% inventé, sans référence à un vilain
Marvel existant.

**Portrait :**
> Portrait en buste d'un chef de bande urbain fictif et générique, veste à
> capuche sombre, silhouette menaçante mais stylisée (pas réaliste ni
> violente), visage partiellement dans l'ombre sous la capuche. Style
> illustration vectorielle plate, contours nets, palette de gris foncés et
> rouge `#e63946` en accent. Fond neutre dégradé sombre, ambiance urbaine
> nocturne. Aucune arme, aucune référence à un personnage existant.

---

## 2. Les logos et écussons

### 2.1 Logo principal du jeu "Alerte Police Secours"

> Logo de jeu vidéo pour "Alerte Police Secours", composition circulaire ou
> en écusson façon badge de police stylisé, avec une étoile à cinq branches
> centrale et un éclat de gyrophare bleu/rouge stylisé derrière. Style
> illustration vectorielle plate, contours nets et épais, palette bleu
> `#245ec9`, rouge `#e63946` et doré `#ffd166`. Fond transparent, sans texte
> intégré (le titre sera ajouté séparément en HTML/CSS), aucune ressemblance
> avec un écusson de police officiel réel.

### 2.2 Écusson unité RAID (Tireur de précision)

> Écusson/insigne stylisé façon patch tactique, forme d'écu ou hexagonale,
> représentant une cible de visée stylisée au centre, couleurs noir et
> rouge `#e63946`, bordure dorée fine. Style vectoriel plat, contours nets,
> fond transparent, sans texte, sans logo officiel réel.

### 2.3 Écusson unité GIGN (Unité lourde)

> Écusson/insigne stylisé façon patch tactique, forme d'écu, représentant un
> éclat/explosion stylisée au centre, couleurs bleu marine foncé et orange
> `#f4a259`, bordure dorée fine. Style vectoriel plat, contours nets, fond
> transparent, sans texte, sans logo officiel réel.

### 2.4 Écusson unité CRS (Herse routière)

> Écusson/insigne stylisé façon patch tactique, forme d'écu, représentant
> une barrière routière rayée stylisée au centre, couleurs bleu-gris
> `#8d99ae` et jaune signalisation, bordure dorée fine. Style vectoriel
> plat, contours nets, fond transparent, sans texte, sans logo officiel réel.

### 2.5 Écusson unité Police Secours

> Écusson/insigne stylisé façon patch de patrouille, forme d'écu,
> représentant un gyrophare stylisé au centre entouré de deux ailes
> discrètes, couleurs bleu vif `#4d9dff` et jaune fluo, bordure blanche
> fine. Style vectoriel plat, contours nets, fond transparent, sans texte,
> sans logo officiel réel.

### 2.6 Écusson générique "Commissariat Central"

> Écusson circulaire façon badge officiel stylisé, représentant un petit
> bâtiment de commissariat stylisé surmonté d'une étoile à cinq branches,
> couleurs bleu `#245ec9` et doré `#ffd166`, bordure épaisse. Style
> vectoriel plat, contours nets, fond transparent, sans texte, sans logo
> officiel réel.

### 2.7 Écusson concept BAC

> Écusson/insigne stylisé façon patch discret, forme d'écu, représentant
> une loupe stylisée au centre, couleurs sombres et turquoise `#2ec4b6`,
> bordure fine grise. Style vectoriel plat, contours nets, fond transparent,
> sans texte, sans logo officiel réel.

### 2.8 Écusson concept BRI

> Écusson/insigne stylisé façon patch tactique, forme d'écu pointu,
> représentant une étoile à cinq branches stylisée au centre, couleurs noir
> et violet `#6a4c93`, bordure argentée fine. Style vectoriel plat, contours
> nets, fond transparent, sans texte, sans logo officiel réel.

### 2.9 Écusson concept Police Judiciaire

> Écusson/insigne stylisé façon patch classique, forme d'écu, représentant
> une balance de la justice stylisée au centre, couleurs brun/beige
> `#b08968` et doré, bordure fine sombre. Style vectoriel plat, contours
> nets, fond transparent, sans texte, sans logo officiel réel.

### 2.10 Écusson concept Unité Cynophile

> Écusson/insigne stylisé façon patch rond, représentant une empreinte de
> patte stylisée au centre, couleurs vert forêt `#4c7a3d` et beige, bordure
> fine dorée. Style vectoriel plat, contours nets, fond transparent, sans
> texte, sans logo officiel réel.

### 2.11 Écusson concept Compagnie Motocycliste

> Écusson/insigne stylisé façon patch ailé, forme d'écu, représentant une
> roue stylisée avec deux petites ailes au centre, couleurs bleu marine et
> jaune `#f7b32b`, bordure fine blanche. Style vectoriel plat, contours
> nets, fond transparent, sans texte, sans logo officiel réel.

### 2.12 Écusson concept Section Aérienne

> Écusson/insigne stylisé façon patch d'aviation, forme ovale, représentant
> un rotor d'hélicoptère stylisé vu de dessus au centre, couleurs bleu
> marine et bleu ciel `#5da9e9`, bordure fine argentée. Style vectoriel
> plat, contours nets, fond transparent, sans texte, sans logo officiel réel.

---

## 3. La carte complète du quartier

**Prompt :**
> Vue aérienne stricte (zénithale, à la verticale, "bird's eye view") d'un
> quartier urbain nocturne stylisé pour un jeu vidéo Tower Defense 2D. Une
> route sinueuse en asphalte gris foncé, avec un marquage central en
> pointillés blancs, traverse le quartier en plusieurs virages à angle
> droit : elle part d'un bord de l'image et mène jusqu'à un commissariat de
> police central, un bâtiment bleu distinct des autres avec un petit
> gyrophare rouge/bleu stylisé sur son toit. Une rue secondaire perpendiculaire
> croise la route principale, formant un carrefour. Autour des rues, plusieurs
> toits de bâtiments résidentiels/commerciaux vus de dessus (toits marron/brique
> avec un faîtage central), espacés les uns des autres pour laisser des zones
> vides. Ambiance nocturne bleu foncé, légère lueur de lampadaires. Style
> illustration vectorielle plate ("flat design"), contours nets, couleurs
> vives et saturées, palette bleu police `#245ec9`/`#4d9dff`, rouge alerte
> `#e63946`, doré `#ffd166`, asphalte gris `#3c444c`, toits marron `#7a5230`,
> fond nuit `#06090d`/`#101822`. Format paysage (proportion 3:2), pas de
> texte, pas de personnages, pas de logo existant.

**⚠️ Note technique sur l'intégration :** notre carte actuelle est dessinée
"à la main" en JavaScript avec des coordonnées précises (chaque virage de
route, chaque bâtiment a un x/y exact dans `script.js`), car le jeu a besoin
de connaître ces coordonnées pour faire avancer les ennemis et détecter les
clics. Une image générée par IA ne collera JAMAIS pixel pour pixel à ces
coordonnées exactes. Deux façons de l'utiliser quand même :
1. **En texture d'ambiance** : on l'affiche en fond très assombri/flouté
   derrière la carte dessinée par le jeu (juste pour le décor, sans lien
   avec le gameplay) — solution la plus simple.
2. **En remplacement complet** : on génère l'image, puis on ajuste les
   coordonnées dans `script.js` pour qu'elles collent au mieux au chemin et
   aux bâtiments visibles sur CETTE image précise — plus long, mais plus
   fidèle. Il faudra alors me redonner l'image pour que je relève les
   coordonnées.

## 4. Bâtiments et éléments de route (en tuiles réutilisables)

C'est ici la vraie réponse à "comment reconstruire une carte façon Stark
Tower Defense" : plutôt qu'une seule grande image figée (voir section 3 et
sa mise en garde), on génère des **petites tuiles réutilisables** — quelques
toits de bâtiments et quelques morceaux de route — qu'on peut ensuite
répéter, faire pivoter et assembler pour reconstituer EXACTEMENT le tracé
du jeu (le tableau `CHEMIN` et le tableau `BATIMENTS` dans `script.js`).
C'est beaucoup plus simple à intégrer que l'image de carte complète, et
c'est ainsi que fonctionnent la plupart des vrais jeux Tower Defense en 2D
(y compris Stark Tower Defense).

Toujours la même règle que dans le reste du fichier : vue **strictement de
dessus** (zénithale), style vectoriel plat cohérent avec la direction
artistique commune donnée plus haut, **fond transparent obligatoire** (pour
pouvoir superposer les tuiles librement), et sans ombre portée qui
dépasserait des bords de l'image (sinon les tuiles laissent une couture
visible en se répétant).

### 4.1 Toit — petit immeuble résidentiel
> Toit d'un petit immeuble résidentiel vu strictement de dessus, forme
> rectangulaire simple, couleur tuiles/membrane marron `#7a5230` avec un
> léger dégradé, une ligne de faîtage centrale fine, contour sombre
> `#4d3420`. Style vectoriel plat, contours nets, fond transparent, format
> carré, pas de texte, pas d'ombre portée qui dépasse des bords de l'image.

### 4.2 Toit — immeuble moyen avec détails techniques
> Toit d'un immeuble de taille moyenne vu strictement de dessus, forme
> rectangulaire, couleur marron `#7a5230`, avec quelques détails vus du
> dessus : une unité de climatisation grise, une petite cheminée, une
> trappe d'accès technique. Style vectoriel plat, contours nets, fond
> transparent, format rectangulaire, pas de texte, pas d'ombre portée qui
> dépasse des bords de l'image.

### 4.3 Toit — grand immeuble / tour d'angle
> Toit d'un grand immeuble vu strictement de dessus, forme rectangulaire
> allongée, couleur marron foncé `#4d3420` avec fine bordure `#7a5230`,
> plusieurs niveaux de toit suggérés par de fines lignes parallèles. Style
> vectoriel plat, contours nets, fond transparent, format rectangulaire
> allongé, pas de texte, pas d'ombre portée qui dépasse des bords de l'image.

### 4.4 Toit — bâtiment commercial / entrepôt plat
> Toit plat d'un bâtiment commercial ou entrepôt vu strictement de dessus,
> forme rectangulaire large, couleur gris-brun uni, quelques grilles de
> ventilation industrielle rectangulaires grises. Style vectoriel plat,
> contours nets, fond transparent, format rectangulaire large, pas de
> texte, pas d'ombre portée qui dépasse des bords de l'image.

### 4.5 Route — segment rectiligne
> Segment de route rectiligne vu strictement de dessus, asphalte gris foncé
> `#3c444c` avec un marquage central en pointillés blancs, fines bordures
> de trottoir gris clair `#54606a` sur les deux longs côtés. Conçu pour
> être répété bout à bout et former une route plus longue (les deux
> extrémités courtes doivent être identiques, sans détail qui empêcherait
> la répétition). Style vectoriel plat, contours nets, fond transparent,
> format rectangulaire allongé, pas de texte.

### 4.6 Route — virage à angle droit
> Virage de route à angle droit (90°) vu strictement de dessus, asphalte
> gris foncé `#3c444c` avec marquage pointillé blanc qui suit la courbe du
> virage, bordures de trottoir gris clair sur les côtés extérieurs du
> virage. Les deux extrémités doivent avoir la même largeur qu'un segment
> rectiligne, pour pouvoir s'emboîter avec lui. Style vectoriel plat,
> contours nets, fond transparent, format carré, pas de texte.

### 4.7 Route — carrefour en croix
> Carrefour en croix (intersection de deux routes) vu strictement de
> dessus, asphalte gris foncé `#3c444c`, marquage pointillé blanc dans les
> deux directions qui s'interrompt proprement au centre du carrefour. Les 4
> côtés doivent avoir la même largeur qu'un segment rectiligne, pour
> pouvoir s'emboîter avec lui. Style vectoriel plat, contours nets, fond
> transparent, format carré, pas de texte.

### 4.8 Route — extrémité (bout de route ouvert)
> Extrémité arrondie d'une route vue strictement de dessus, asphalte gris
> foncé `#3c444c`, bordure de trottoir gris clair qui s'arrondit à
> l'extrémité, sans marquage au sol à cet endroit précis. Utilisée pour le
> point d'apparition des ennemis, en bord de carte. Style vectoriel plat,
> contours nets, fond transparent, format carré, pas de texte.

## 5. Mobilier urbain (décor de carte)

Tous les prompts de cette section doivent être vus **strictement de dessus**
(vue zénithale), pour s'intégrer à la carte 2D du jeu (même logique que les
toits de bâtiments déjà dessinés en Canvas). Ajoute systématiquement à la
fin : *"vue de dessus stricte (zénithale), style vectoriel plat, fond
transparent, ombre portée légère, cohérent avec un jeu Tower Defense 2D"*.

### 5.1 Lampadaire urbain
> Un lampadaire de rue vu strictement de dessus : petit cercle lumineux
> (le halo de lumière) au centre d'une base circulaire grise plus petite.
> Vue de dessus stricte, style vectoriel plat, fond transparent, ombre
> portée légère.

### 5.2 Banc public
> Un banc public vu strictement de dessus, lattes de bois horizontales
> marron clair sur structure métallique noire. Vue de dessus stricte, style
> vectoriel plat, fond transparent, ombre portée légère.

### 5.3 Abribus
> Un abribus (arrêt de bus) vu strictement de dessus, structure rectangulaire
> avec toit vitré bleu clair semi-transparent et bancs à l'intérieur. Vue de
> dessus stricte, style vectoriel plat, fond transparent, ombre portée légère.

### 5.4 Poubelle publique
> Une poubelle publique ronde vue strictement de dessus, couvercle gris avec
> ouverture centrale. Vue de dessus stricte, style vectoriel plat, fond
> transparent, ombre portée légère.

### 5.5 Feu tricolore (carrefour)
> Un feu de circulation vu strictement de dessus au niveau d'un carrefour :
> petit poteau avec trois cercles (rouge, jaune, vert) empilés vus depuis le
> haut. Vue de dessus stricte, style vectoriel plat, fond transparent, ombre
> portée légère.

### 5.6 Bouche d'incendie
> Une bouche d'incendie rouge vue strictement de dessus, forme cylindrique
> avec petites poignées latérales visibles depuis le haut. Vue de dessus
> stricte, style vectoriel plat, fond transparent, ombre portée légère.

### 5.7 Barrière de police / ruban de sécurité
> Une barrière de police pliante rayée jaune et noir, vue strictement de
> dessus, accompagnée d'un ruban de signalisation "attention" tendu au sol.
> Vue de dessus stricte, style vectoriel plat, fond transparent, ombre
> portée légère.

### 5.8 Véhicule de police garé
> Une voiture de police banalisée bleu et blanc avec bande décorative
> bleu/jaune stylisée (pas de vrai logo officiel), vue strictement de
> dessus, gyrophare visible sur le toit. Vue de dessus stricte, style
> vectoriel plat, fond transparent, ombre portée légère.

### 5.9 Jardinière / arbre en pot
> Un arbre urbain en jardinière carrée vue strictement de dessus, feuillage
> circulaire vert vu depuis le haut, bac en béton gris. Vue de dessus
> stricte, style vectoriel plat, fond transparent, ombre portée légère.

### 5.10 Passage piéton
> Un passage piéton (bandes blanches) sur asphalte gris foncé, vu
> strictement de dessus, orienté horizontalement pour s'aligner sur une rue.
> Vue de dessus stricte, style vectoriel plat, fond transparent.

---

## 6. Combien de personnages dans Stark Tower Defense (le jeu Marvel) ?

D'après mes recherches sur le jeu original :

- **5 héros jouables** (placés comme tourelles) : Iron Man, Spider-Man,
  Thor, Cyclope et Ms. Marvel — chacun améliorable 3 fois (dégâts, cadence,
  portée).
- **3 ennemis/boss** : Dr Doom (Docteur Fatalis), M.O.D.O.K. et Moleman
  (Taupinard).
- **Soit 8 personnages au total.**

Avec les 6 nouveaux concepts ajoutés dans ce fichier (BAC, BRI, Police
Judiciaire, Unité Cynophile, Compagnie Motocycliste, Section Aérienne), le
roster complet d'Alerte Police Secours atteint désormais :

- **10 personnages "héros"** : RAID, GIGN, CRS, Police Secours, BAC, BRI,
  Police Judiciaire, Unité Cynophile, Compagnie Motocycliste, Section
  Aérienne (+ le Commissaire en figure d'autorité hors-combat)
- **1 antagoniste générique** (meneur de la bande)
- **Soit un roster plus large que celui de Stark Tower Defense** (8 au total).

✅ **Mise à jour** : les 10 unités sont maintenant toutes réellement codées
et jouables dans `script.js` (voir l'objet `UNITES`), chacune avec son coût,
ses dégâts, sa portée et sa mécanique propre — y compris les capacités
spéciales imaginées pour Police Judiciaire (marquage d'une cible : toutes
les unités lui infligent +50% de dégâts pendant 3s) et Compagnie
Motocycliste (immobilisation totale d'un ennemi à l'impact).

✅ **Mise à jour 2** : les images ont été générées et intégrées ! Chaque
unité affiche désormais son vrai portrait (en avatar rond sur la carte, en
vignette dans la boutique), avec trois jauges **Vitesse / Portée / Dégâts**
façon fiche de personnage — le principe des barres de statistiques d'un
jeu de tower defense, appliqué à notre propre roster, sans reprendre le
design d'un jeu existant. Les toits de bâtiments, le mobilier urbain et le
logo utilisent aussi leurs vraies images désormais.

## 7. Bâtiments et menu façon "jeu cartoon vif" (style original)

Section ajoutée à la demande de l'utilisateur, qui souhaitait un rendu de
bâtiments et un menu de jeu dans l'esprit des tower defense cartoon grand
public (contours noirs épais, couleurs très saturées, ambiance ludique).
**Important** : ces prompts décrivent un style général très répandu dans le
jeu vidéo mobile (aucune œuvre n'a de droits sur "des couleurs vives et des
contours épais"), pas la reprise d'un jeu précis. La palette et la
composition restent celles d'Alerte Police Secours (bleu/or/rouge), pas
celles d'un autre jeu.

### 7.1 Toit — immeuble cartoon vif (variante alternative)

> Toit d'immeuble vu strictement de dessus, style cartoon très saturé
> (proche d'un jeu mobile grand public), contours noirs épais et nets,
> aplats de couleur francs sans dégradés complexes, toit en tuiles bleu
> marine `#245ec9` avec faîtage doré `#ffd166`, quelques détails simples
> (climatiseur gris, petite antenne). Fond transparent, pas de texte, pas
> d'ombre qui dépasse des bords de l'image, format carré.

### 7.2 Pâté de bâtiments avec cour et parking (variante alternative)

> Vue de dessus stricte d'un petit îlot urbain complet (plusieurs toits
> assemblés autour d'une cour centrale et d'un petit parking), style
> cartoon très saturé, contours noirs épais, toits bleu marine et beige,
> quelques voitures stylisées garées, une pelouse avec des arbres ronds
> vu de dessus. Palette bleu `#245ec9`/`#4d9dff`, doré `#ffd166`, gris
> asphalte `#3c444c`. Fond transparent, pas de texte.

### 7.3 Bannière de menu (bandeau supérieur)

> Bandeau/ruban de menu de jeu vidéo, format paysage très allongé, style
> cartoon avec contours noirs épais, courbes façon banderole, couleurs
> bleu `#245ec9` et doré `#ffd166` avec un léger dégradé, petites étoiles
> décoratives aux extrémités. Conçu pour accueillir du texte par-dessus
> (argent, score) ajouté séparément en HTML/CSS. Fond transparent, pas de
> texte intégré, format large et bas (proportion environ 6:1).

### 7.4 Barre de boutons de menu (bandeau inférieur)

> Bandeau de menu de jeu vidéo façon barre de boutons, format paysage très
> allongé, style cartoon avec contours noirs épais, aplats bleu marine
> foncé avec liseré doré `#ffd166`, surface légèrement bombée façon bouton
> physique. Conçu pour accueillir plusieurs boutons de texte par-dessus
> (Menu principal, Pause). Fond transparent, pas de texte intégré, format
> large et bas (proportion environ 8:1).

### 7.5 Fond d'écran d'accueil (menu principal)

> Illustration de fond pour un écran d'accueil de jeu vidéo, vue aérienne
> stylisée d'une ville la nuit avec quelques gyrophares de police au loin,
> style cartoon vif et saturé, contours noirs marqués, ambiance héroïque
> et dynamique plutôt que réaliste. Palette bleu nuit `#06090d`/`#101822`
> en fond, accents bleu `#4d9dff` et doré `#ffd166`. Composition dégagée
> au centre pour laisser la place au titre et aux boutons ajoutés
> séparément. Pas de texte intégré à l'image.

**Note d'intégration** : contrairement aux toits déjà en place (plus
peints/détaillés), ce style cartoon est plus flashy et contrasté. Si tu
génères ces variantes et préfères ce rendu, dis-le-moi : je peux basculer
`TOITS_IMAGES` dessus, ou même mélanger les deux styles selon les
bâtiments pour varier la carte.

### 7.6 Maquette complète de l'interface (vue d'ensemble)

Prompt fourni par l'utilisateur, avec un seul ajustement : "portraits de
super-héros existants" → nos propres personnages originaux (RAID, GIGN,
CRS, etc., déjà créés dans ce fichier), pour la même raison que partout
ailleurs dans ce document — aucune reprise de personnage protégé.

> Une maquette complète (full screen UI) d'un jeu vidéo de tower defense
> 2D. Au centre : une carte de ville vue de dessus (top-down) stricte avec
> une grille orthogonale. La carte contient une douzaine d'immeubles
> massifs aux toits plats de couleurs pastel, chaque immeuble étant
> rectangulaire et occupant l'équivalent d'au moins 5 cases de la grille
> pour faire de gros blocs. Une route en asphalte gris serpente entre ces
> immeubles en formant des angles droits, avec un chemin clair pour les
> ennemis. Autour de la carte : une interface utilisateur (UI) style
> "comic book" avec des bordures épaisses bleues et jaunes. Le menu de
> droite affiche des cases avec des portraits d'agents de police
> originaux et stylisés (silhouettes inventées, aucune ressemblance avec
> un personnage ou une franchise existante) pour la sélection des tours,
> et des barres de statistiques (vitesse, dégâts) en bleu et vert. Style
> graphique : cartoon, flat design, art vectoriel très propre, éclairage
> vif, sans ombres réalistes. Format paysage. Aucun logo, texte ou marque
> existante.

**Astuce** : une fois cette image générée, tu peux aussi la donner
directement à ChatGPT en lui demandant "redessine le personnage de la
case N en t'inspirant de [décris l'Agent RAID/GIGN/CRS/etc.]" pour peupler
concrètement les cases avec nos unités, plutôt que de laisser l'IA
inventer des silhouettes génériques.

## 8. Comment utiliser ces prompts avec ChatGPT

1. Copie un prompt à la fois (ne mélange pas plusieurs éléments dans une
   même demande, le résultat sera plus propre).
2. Précise à ChatGPT le format souhaité, par exemple : *"Génère cette image
   au format carré 1024x1024, avec un fond transparent (PNG)."*
3. Si le résultat ne te convient pas, redemande en ajoutant des précisions
   ("plus cartoon", "couleurs plus vives", "contours plus épais"...) plutôt
   que de repartir de zéro : les IA d'images itèrent bien à partir d'une
   base.
4. Une fois les images téléchargées, dis-le-moi : je pourrai t'aider à les
   intégrer dans `index.html` / `script.js` (par exemple en remplaçant les
   formes géométriques actuelles des unités par ces sprites, ou en les
   affichant dans le panneau "Armurerie").

## 9. Assets intégrés lors de la fusion avec la version enrichie

Ces images (déjà générées et déjà en place dans `images/`, aucune action
requise) ont été récupérées depuis une itération enrichie du jeu et
intégrées au projet :

- **Plateformes de tour** (`plateforme_patrouille.webp`, `plateforme_intervention.webp`,
  `plateforme_controle.webp`, `plateforme_aerienne.webp`) : socles tactiques
  dessinés sous chaque unité posée sur un toit, choisis selon la famille de
  l'unité (voir `plateformePourUnite()` dans `script.js`).
- **Sprites d'ennemis par archétype** (`ennemi_standard.webp`, `ennemi_rapide.webp`,
  `ennemi_blinde.webp`, `ennemi_chef.webp`, `ennemi_saboteur.webp`,
  `ennemi_eclaireur.webp`) : chaque vague mélange ces 6 profils (vitesse/PV/
  récompense différents) à partir de la vague 2.
- **Texture de route** (`route_1.webp` à `route_4.webp`, seule la première est
  utilisée pour l'instant) : légère surcouche non directionnelle sur
  l'asphalte, en complément du dessin procédural existant.
- **Fond de l'écran d'accueil** (`fond_menu_accueil.webp`) : console tactique
  généraliste (pas de logo ni de personnage précis), utilisée uniquement en
  arrière-plan assombri derrière le panneau de choix de difficulté.

Un second visuel généré dans cette même itération (un cadre rouge et or de
type "fiche de personnage") a été volontairement écarté : son style
(triangle façon réacteur, palette rouge/or) rappelait trop directement
l'armure d'Iron Man / l'identité visuelle Marvel. Le panneau
"Améliorer / Vendre" garde donc un fond neutre avec notre propre bordure
bleu/jaune.
