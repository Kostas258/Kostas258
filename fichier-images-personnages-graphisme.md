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
- Rouge alerte / gyrophare : `#e63946`
- Doré (argent, accents) : `#ffd166`
- Gris asphalte : `#3c444c`
- Marron toits de bâtiments : `#7a5230`
- Fond nuit urbaine : `#06090d` / `#101822`

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
   logo officiel), cagoule ou lunettes de visée sur le front, posture
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

### 1.5 (Optionnel) Le meneur de la bande — antagoniste générique

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

### 2.5 Écusson générique "Commissariat Central"

> Écusson circulaire façon badge officiel stylisé, représentant un petit
> bâtiment de commissariat stylisé surmonté d'une étoile à cinq branches,
> couleurs bleu `#245ec9` et doré `#ffd166`, bordure épaisse. Style
> vectoriel plat, contours nets, fond transparent, sans texte, sans logo
> officiel réel.

---

## 3. Mobilier urbain (décor de carte)

Tous les prompts de cette section doivent être vus **strictement de dessus**
(vue zénithale), pour s'intégrer à la carte 2D du jeu (même logique que les
toits de bâtiments déjà dessinés en Canvas). Ajoute systématiquement à la
fin : *"vue de dessus stricte (zénithale), style vectoriel plat, fond
transparent, ombre portée légère, cohérent avec un jeu Tower Defense 2D"*.

### 3.1 Lampadaire urbain
> Un lampadaire de rue vu strictement de dessus : petit cercle lumineux
> (le halo de lumière) au centre d'une base circulaire grise plus petite.
> Vue de dessus stricte, style vectoriel plat, fond transparent, ombre
> portée légère.

### 3.2 Banc public
> Un banc public vu strictement de dessus, lattes de bois horizontales
> marron clair sur structure métallique noire. Vue de dessus stricte, style
> vectoriel plat, fond transparent, ombre portée légère.

### 3.3 Abribus
> Un abribus (arrêt de bus) vu strictement de dessus, structure rectangulaire
> avec toit vitré bleu clair semi-transparent et bancs à l'intérieur. Vue de
> dessus stricte, style vectoriel plat, fond transparent, ombre portée légère.

### 3.4 Poubelle publique
> Une poubelle publique ronde vue strictement de dessus, couvercle gris avec
> ouverture centrale. Vue de dessus stricte, style vectoriel plat, fond
> transparent, ombre portée légère.

### 3.5 Feu tricolore (carrefour)
> Un feu de circulation vu strictement de dessus au niveau d'un carrefour :
> petit poteau avec trois cercles (rouge, jaune, vert) empilés vus depuis le
> haut. Vue de dessus stricte, style vectoriel plat, fond transparent, ombre
> portée légère.

### 3.6 Bouche d'incendie
> Une bouche d'incendie rouge vue strictement de dessus, forme cylindrique
> avec petites poignées latérales visibles depuis le haut. Vue de dessus
> stricte, style vectoriel plat, fond transparent, ombre portée légère.

### 3.7 Barrière de police / ruban de sécurité
> Une barrière de police pliante rayée jaune et noir, vue strictement de
> dessus, accompagnée d'un ruban de signalisation "attention" tendu au sol.
> Vue de dessus stricte, style vectoriel plat, fond transparent, ombre
> portée légère.

### 3.8 Véhicule de police garé
> Une voiture de police banalisée bleu et blanc avec bande décorative
> bleu/jaune stylisée (pas de vrai logo officiel), vue strictement de
> dessus, gyrophare visible sur le toit. Vue de dessus stricte, style
> vectoriel plat, fond transparent, ombre portée légère.

### 3.9 Jardinière / arbre en pot
> Un arbre urbain en jardinière carrée vue strictement de dessus, feuillage
> circulaire vert vu depuis le haut, bac en béton gris. Vue de dessus
> stricte, style vectoriel plat, fond transparent, ombre portée légère.

### 3.10 Passage piéton
> Un passage piéton (bandes blanches) sur asphalte gris foncé, vu
> strictement de dessus, orienté horizontalement pour s'aligner sur une rue.
> Vue de dessus stricte, style vectoriel plat, fond transparent.

---

## 4. Comment utiliser ces prompts avec ChatGPT

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
