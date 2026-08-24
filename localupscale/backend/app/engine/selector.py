"""Sélection du moteur actif.

Ordre de préférence : Real-ESRGAN (IA) puis repli Pillow (sans IA).
Un futur moteur NCNN/Vulkan s'insérera simplement dans cette liste.
"""

from __future__ import annotations

import os

from app.engine.base import UpscaleEngine
from app.engine.pillow_engine import PillowEngine
from app.engine.realesrgan_engine import RealESRGANEngine

_engine: UpscaleEngine | None = None


def get_engine(force: str | None = None) -> UpscaleEngine:
    """Retourne le moteur actif (mis en cache).

    force / LOCALUPSCALE_ENGINE : "realesrgan" ou "pillow" pour forcer un moteur
    (utilisé par les tests).
    """
    global _engine
    forced = force or os.environ.get("LOCALUPSCALE_ENGINE")
    if forced == "pillow":
        return PillowEngine()
    if forced == "realesrgan":
        return RealESRGANEngine()
    if _engine is None:
        real = RealESRGANEngine()
        _engine = real if real.is_available() else PillowEngine()
    return _engine


def reset_engine_cache() -> None:
    global _engine
    _engine = None
