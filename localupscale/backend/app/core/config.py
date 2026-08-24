"""Configuration du backend LocalUpscale.

Tout est local : le serveur n'écoute que sur 127.0.0.1 et aucune requête
sortante n'est émise, à l'exception du téléchargement de modèles demandé
EXPLICITEMENT par l'utilisateur (voir app/engine/registry.py).
"""

from __future__ import annotations

import os
from pathlib import Path

HOST = "127.0.0.1"
PORT = int(os.environ.get("LOCALUPSCALE_PORT", "8756"))

# Répertoire où les poids de modèles sont stockés (jamais versionné).
MODELS_DIR = Path(
    os.environ.get("LOCALUPSCALE_MODELS_DIR", Path(__file__).resolve().parents[2] / "models")
)

SUPPORTED_INPUT_FORMATS = {".png", ".jpg", ".jpeg", ".webp"}
SUPPORTED_OUTPUT_FORMATS = {"png", "jpg", "webp"}
SUPPORTED_SCALES = {2, 4}

# Message d'honnêteté affiché par l'interface : les détails produits par
# l'IA sont une reconstruction plausible, pas une restitution authentique.
AI_DISCLAIMER_FR = (
    "Les détails ajoutés par l'agrandissement IA sont générés par le modèle : "
    "ils sont plausibles mais ne correspondent pas nécessairement à la réalité "
    "de la scène d'origine."
)

CPU_FALLBACK_WARNING_FR = (
    "Aucun GPU compatible détecté : le mode CPU de secours est utilisé. "
    "Le traitement sera NETTEMENT plus lent (plusieurs minutes par image possibles)."
)
