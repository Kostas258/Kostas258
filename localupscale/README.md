# LocalUpscale

Agrandissement d'images par IA, **100 % local et open source** — inspiré
d'[Upscayl](https://github.com/upscayl/upscayl).

- 🚫 **Aucun cloud** : pas d'API distante, pas de compte, pas de télémétrie.
- 🔒 **Vos images ne quittent jamais votre machine** : le backend n'écoute que sur `127.0.0.1`.
- 🖼️ Moteur [Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN) exécuté localement.
- 🇫🇷 Interface intégralement en français.

> ⚠️ **Honnêteté sur l'IA** : les détails ajoutés lors de l'agrandissement sont
> **générés** par le modèle. Ils sont plausibles, mais ne constituent pas une
> restitution authentique de la scène d'origine (visages inclus).

## Deux traitements distincts, jamais confondus

LocalUpscale propose deux modes que l'utilisateur choisit **explicitement**.
L'application ne bascule **jamais** de l'un à l'autre toute seule.

| | Agrandissement par IA | Redimensionnement classique — sans IA |
|---|---|---|
| Moteur | Real-ESRGAN (PyTorch) | Pillow, interpolation Lanczos |
| Détails ajoutés | Oui, **générés** par le modèle | **Aucun** |
| Suffixe des fichiers | `_upscaled_x2` / `_upscaled_x4` | `_redim_x2` / `_redim_x4` |
| Dépendances | extra `[ia]` (lourd) | aucune, incluse d'office |
| Si le moteur manque | **Erreur explicite, aucun fichier produit** | — |

Le mode classique n'est **pas un repli**. Si vous demandez un agrandissement IA
et que Real-ESRGAN est indisponible, la requête est refusée (HTTP 409) avec un
message clair : aucun fichier n'est créé, et rien ne peut être pris pour un
résultat Real-ESRGAN. Les suffixes distincts garantissent qu'un fichier issu du
redimensionnement classique n'est jamais confondu avec une sortie IA.

## Fonctionnalités

- Import par glisser-déposer ou sélecteur de fichiers (PNG, JPG, JPEG, WebP).
- Affichage du nom, du poids, de la résolution d'origine et de la résolution finale estimée.
- Réglages : mode de traitement, facteur ×2 / ×4, modèle **Photo** ou
  **Illustration/anime**, option « Améliorer les visages » (désactivée par
  défaut), format de sortie (PNG, JPG, WebP), dossier de destination.
- Traitement par lot : file d'attente, progression par image, annulation,
  journal d'erreurs visible.
- Écran résultat : ouvrir le fichier, ouvrir le dossier de sortie, comparer
  avant/après avec un curseur. Le libellé indique le mode réellement utilisé.
- **Les originaux ne sont jamais écrasés, ni aucun fichier existant.**

### Nommage des fichiers de sortie

Le nom de base est `<nom source>_<suffixe>_x<facteur>.<extension>`. En cas de
collision, un compteur est ajouté :

```
image_upscaled_x4.png
image_upscaled_x4_1.png
image_upscaled_x4_2.png
```

La collision est gérée dans les deux situations : un fichier portant déjà ce nom
sur le disque, **et** deux images sources homonymes dans un même lot (par
exemple `dossier_a/photo.png` et `dossier_b/photo.png`), avant même que le
premier fichier ne soit écrit.

Les noms comportant plusieurs points sont préservés
(`photo.finale.v2.jpeg` → `photo.finale.v2_upscaled_x2.png`), tout comme les
accents et les espaces. Seuls les caractères refusés par les systèmes de
fichiers (`< > : " / \ | ? *` et caractères de contrôle) sont remplacés par `_`,
les noms réservés Windows (`CON`, `NUL`, `COM1`…) sont suffixés, et les noms
démesurés sont tronqués.

## Architecture

```
localupscale/
├── backend/    Python 3.11 + FastAPI (API locale sur 127.0.0.1:8756)
│   └── app/engine/   Abstraction UpscaleEngine :
│                     realesrgan (IA) · pillow (classique) · futur ncnn/vulkan
├── frontend/   React + Vite + TypeScript (interface en français)
│   └── src-tauri/    Coque de bureau Tauri (Rust)
└── scripts/    Lancement et tests Windows / macOS / Linux
```

L'abstraction `UpscaleEngine` (`backend/app/engine/base.py`) isole la file
d'attente et l'API du moteur concret : remplacer Real-ESRGAN par un moteur
NCNN/Vulkan se fera en ajoutant une seule classe.

## Prérequis

- **Python 3.11**
- **Node.js ≥ 18** (npm)
- **Rust + Tauri CLI** — uniquement pour construire l'application de bureau ;
  voir <https://tauri.app/start/prerequisites/>
- Pour le mode IA : environ **3 Go** d'espace disque (PyTorch) et de préférence
  un **GPU** compatible CUDA (NVIDIA) ou MPS (Apple Silicon)

## Installation

```bash
# 1. Base : API + interface + redimensionnement classique
cd backend
python3.11 -m venv .venv
.venv/bin/pip install -e '.[dev]'

# 2. Moteur IA Real-ESRGAN (lourd, ~3 Go) — nécessaire au mode IA
.venv/bin/pip install -e '.[ia]'

# 3. Amélioration des visages (GFPGAN) — facultatif, voir plus bas
.venv/bin/pip install -e '.[visages]'

# 4. Frontend
cd ../frontend
npm install
```

Sans l'étape 2, l'application démarre normalement : le mode IA est signalé comme
indisponible (avec la raison), et seul le redimensionnement classique est
proposé — clairement identifié comme tel.

## Statut de GFPGAN (amélioration des visages)

GFPGAN est une **dépendance facultative, installée séparément**. Deux conditions
doivent être réunies pour que l'option fonctionne :

1. le paquet Python : `pip install -e '.[visages]'` dans le dossier `backend` ;
2. le modèle `GFPGANv1.4.pth`, téléchargé depuis l'écran « Modèles IA » de
   l'application, après affichage de sa licence et accord explicite.

Tant que l'une des deux manque, **l'option est désactivée dans l'interface**,
accompagnée de la raison exacte. Elle n'est jamais présentée comme
fonctionnelle. Une requête qui l'active malgré tout est refusée (HTTP 409) sans
produire de fichier.

**L'application fonctionne normalement sans GFPGAN** : seule cette option est
indisponible, tout le reste est inchangé.

## Utilisation sans GPU

Le moteur IA fonctionne sur processeur, mais **nettement plus lentement** —
comptez plusieurs minutes par image selon sa taille. Dans ce cas, l'interface
affiche un avertissement explicite « Mode processeur ».

À ne pas confondre avec le mode classique : le mode processeur exécute bien
Real-ESRGAN et **génère** des détails, il est seulement lent. Le mode classique,
lui, n'utilise aucune IA. Quand le moteur IA est totalement absent, aucun
avertissement « processeur » n'est affiché — il n'y aurait aucune IA à exécuter,
et le message serait trompeur.

## Lancement en développement

```bash
./scripts/dev.sh        # macOS / Linux
scripts\dev.bat         # Windows
```

Le backend démarre sur `http://127.0.0.1:8756`, le frontend sur
`http://localhost:1420`.

## Tests

```bash
./scripts/tests.sh      # macOS / Linux
scripts\tests.bat       # Windows
```

- Backend : `pytest` — 55 tests (nommage et collisions, moteurs, statut GFPGAN,
  refus explicite du mode IA indisponible, API de bout en bout).
- Frontend : `vitest` — 44 tests (utilitaires de nommage, panneau de réglages,
  écran résultat, comparateur).

## Modèles requis

Aucun modèle n'est fourni ni téléchargé automatiquement. Depuis l'écran
« Modèles IA », l'application affiche pour chacun sa **licence** et sa
**source**, puis demande votre accord avant tout téléchargement :

| Usage | Fichier | Source | Licence |
|---|---|---|---|
| Photo | `RealESRGAN_x4plus.pth` | [Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN) | BSD 3-Clause (code) |
| Illustration / anime | `RealESRGAN_x4plus_anime_6B.pth` | [Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN) | BSD 3-Clause (code) |
| Améliorer les visages | `GFPGANv1.4.pth` | [GFPGAN](https://github.com/TencentARC/GFPGAN) | Apache 2.0 (code) |

Vérifiez la licence des **poids** sur la page source avant tout usage
commercial. Les fichiers sont stockés dans `backend/models/` (jamais versionnés).

## Limitations connues

- **L'application de bureau Tauri n'est pas encore assemblée** : les
  dépendances `@tauri-apps/cli` / `@tauri-apps/api`, le dossier `capabilities/`
  et les icônes manquent. Le backend et l'interface web fonctionnent ;
  `npm run tauri dev` échoue en l'état.
- Sans sélecteur de dossier natif, le dossier de destination se saisit au clavier.
- L'annulation d'une tâche **en cours** ne peut pas interrompre l'appel de
  traitement Real-ESRGAN lui-même : elle prend effet entre deux étapes. Une
  tâche encore en file est annulée immédiatement.
- La progression est indicative (quelques paliers), pas une mesure fine.
- Les détails générés par l'IA ne sont pas authentiques ; ne pas utiliser pour
  de l'expertise d'image (médico-légale, scientifique…).
- Le moteur NCNN/Vulkan (plus léger, sans CUDA) reste à écrire ; l'abstraction
  `UpscaleEngine` est prête à l'accueillir.

## Licence

Code du projet : **MIT**. Les modèles téléchargés conservent leurs licences
respectives (voir tableau ci-dessus).
