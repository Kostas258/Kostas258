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
    "Aucun GPU compatible détecté : le moteur IA s'exécute sur le processeur. "
    "Le traitement sera NETTEMENT plus lent (plusieurs minutes par image possibles)."
)

# Mode « classique » : rééchantillonnage Pillow. Ce n'est PAS de l'IA et cela
# ne doit jamais être présenté ni utilisé comme un repli transparent.
CLASSIC_MODE_LABEL_FR = "Redimensionnement classique — sans IA"

CLASSIC_MODE_WARNING_FR = (
    "Ce mode agrandit l'image par interpolation (Lanczos). Aucun détail n'est "
    "généré et le résultat n'est PAS un agrandissement par IA. Les fichiers "
    "produits portent le suffixe _redim_xN et non _upscaled_xN."
)


def ai_engine_unavailable_message(raison: str) -> str:
    """Message d'erreur explicite quand le moteur IA ne peut pas fonctionner."""
    return (
        "Aucun traitement IA n'a été effectué : le moteur Real-ESRGAN est "
        f"indisponible. {raison} Vous pouvez, si vous le souhaitez, choisir "
        f"« {CLASSIC_MODE_LABEL_FR} » — mais ce mode ne génère aucun détail."
    )
