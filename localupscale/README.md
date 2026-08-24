# LocalUpscale

Agrandissement d'images par IA, **100 % local et open source** — inspiré
d'[Upscayl](https://github.com/upscayl/upscayl).

- 🚫 **Aucun cloud** : pas d'API distante, pas de compte, pas de télémétrie.
- 🔒 **Vos images ne quittent jamais votre machine** : le backend n'écoute que sur `127.0.0.1`.
- 🖼️ Moteur [Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN) exécuté localement (GPU, ou mode CPU de secours).
- 🇫🇷 Interface intégralement en français.

> ⚠️ **Honnêteté sur l'IA** : les détails ajoutés lors de l'agrandissement sont
> **générés** par le modèle. Ils sont plausibles, mais ne constituent pas une
> restitution authentique de la scène d'origine (visages inclus).

## Fonctionnalités

- Import par glisser-déposer ou sélecteur de fichiers (PNG, JPG, JPEG, WebP).
- Affichage du nom, du poids, de la résolution d'origine et de la résolution finale estimée.
- Réglages : facteur ×2 / ×4, modèle **Photo** ou **Illustration/anime**,
  option « Améliorer les visages » (désactivée par défaut), format de sortie
  (PNG, JPG, WebP), dossier de destination.
- Traitement par lot : file d'attente, progression par image, annulation,
  journal d'erreurs visible.
- Écran résultat : ouvrir le fichier, ouvrir le dossier de sortie, comparer
  avant/après avec un curseur.
- **Les originaux ne sont jamais écrasés** ; les sorties portent le suffixe
  `_upscaled_x2` ou `_upscaled_x4` (et un compteur ` (1)`, ` (2)`… en cas de collision).
- Mode **CPU de secours** si aucun GPU n'est détecté, avec un avertissement
  clair : le traitement est alors nettement plus lent.
- **Aucun téléchargement automatique de modèle** : chaque modèle affiche sa
  licence et sa source, et n'est récupéré qu'après votre accord explicite.

## Architecture

```
localupscale/
├── backend/    Python 3.11 + FastAPI (API locale sur 127.0.0.1:8756)
│   └── app/engine/   Abstraction UpscaleEngine :
│                     realesrgan (IA) · pillow (repli sans IA) · futur ncnn/vulkan
├── frontend/   React + Vite + TypeScript (interface en français)
│   └── src-tauri/    Coque de bureau Tauri (Rust)
└── scripts/    Lancement et tests Windows / macOS / Linux
```

L'abstraction `UpscaleEngine` (`backend/app/engine/base.py`) isole la file
d'attente et l'API du moteur concret : remplacer Real-ESRGAN par un moteur
NCNN/Vulkan se fera en ajoutant une seule classe.

## Installation

Prérequis :

- **Python 3.11**
- **Node.js ≥ 18** (npm)
- **Rust + Tauri CLI** (uniquement pour construire l'application de bureau) —
  voir <https://tauri.app/start/prerequisites/>

```bash
# Backend
cd backend
python3.11 -m venv .venv
.venv/bin/pip install -e '.[dev]'      # API + tests
.venv/bin/pip install -e '.[ia]'       # dépendances IA (torch, realesrgan) — lourd

# Frontend
cd ../frontend
npm install
```

Sans l'extra `[ia]`, l'application fonctionne avec le moteur de repli Pillow
(simple rééchantillonnage, **sans IA**) — utile pour tester l'interface.

## Lancement en développement

```bash
./scripts/dev.sh        # macOS / Linux
scripts\dev.bat         # Windows
```

Le backend démarre sur `http://127.0.0.1:8756`, le frontend sur
`http://localhost:1420`. Pour la fenêtre de bureau complète :

```bash
cd frontend && npm run tauri dev
```

## Tests

```bash
./scripts/tests.sh      # macOS / Linux
scripts\tests.bat       # Windows
```

- Backend : `pytest` (28 tests — fichiers, moteur, catalogue de modèles, API).
- Frontend : `vitest` (20 tests — utilitaires et comparateur avant/après).

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

## Limites connues

- Le mode CPU de secours est **nettement plus lent** (plusieurs minutes par
  image possibles selon la taille).
- Les détails générés par l'IA ne sont pas authentiques ; ne pas utiliser pour
  de l'expertise d'image (médico-légale, scientifique…).
- Le squelette actuel utilise Real-ESRGAN via PyTorch ; le moteur NCNN/Vulkan
  (plus léger, sans CUDA) est prévu via l'abstraction `UpscaleEngine`.
- La construction Tauri nécessite la chaîne d'outils Rust sur chaque plateforme.

## Licence

Code du projet : **MIT**. Les modèles téléchargés conservent leurs licences
respectives (voir tableau ci-dessus).
