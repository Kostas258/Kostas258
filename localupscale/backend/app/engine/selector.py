"""Sélection du moteur en fonction du mode demandé.

Règle absolue : AUCUN repli automatique. Si l'utilisateur demande un
agrandissement IA et que Real-ESRGAN est indisponible, le traitement échoue
avec un message explicite — il ne bascule jamais silencieusement vers Pillow,
qui produirait un fichier ne contenant aucun détail généré par IA.

Le redimensionnement Pillow n'est accessible que si l'utilisateur choisit
explicitement le mode « classique ».
"""

from __future__ import annotations

from app.engine.base import UpscaleEngine
from app.engine.pillow_engine import PillowEngine
from app.engine.realesrgan_engine import RealESRGANEngine


def get_engine(mode: str = "ia") -> UpscaleEngine:
    """Retourne le moteur correspondant au mode ("ia" ou "classique")."""
    if mode == "ia":
        return RealESRGANEngine()
    if mode == "classique":
        return PillowEngine()
    raise ValueError(f"Mode de traitement inconnu : {mode!r} (attendu : 'ia' ou 'classique').")
