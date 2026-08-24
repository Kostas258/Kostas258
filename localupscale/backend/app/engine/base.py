"""Abstraction UpscaleEngine.

Cette interface isole le reste de l'application du moteur IA concret.
Aujourd'hui : Real-ESRGAN (PyTorch) et un repli Pillow sans IA.
Demain : un moteur NCNN/Vulkan pourra être ajouté en implémentant
simplement cette classe, sans toucher à l'API ni à la file d'attente.
"""

from __future__ import annotations

import threading
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

ProgressCallback = Callable[[float], None]  # progression entre 0.0 et 1.0


class EngineUnavailableError(RuntimeError):
    """Le moteur ne peut pas fonctionner (dépendance ou modèle manquant)."""


class UpscaleCancelledError(RuntimeError):
    """Le traitement a été annulé par l'utilisateur."""


@dataclass(frozen=True)
class UpscaleTask:
    """Une unité de travail : une image source vers un fichier de sortie."""

    input_path: Path
    output_path: Path
    scale: int  # 2 ou 4
    model: str  # "photo" ou "anime"
    face_enhance: bool = False
    output_format: str = "png"  # png | jpg | webp


class UpscaleEngine(ABC):
    """Interface commune à tous les moteurs d'agrandissement."""

    #: identifiant technique du moteur (ex. "realesrgan", "pillow", "ncnn")
    name: str = "abstract"
    #: True si le moteur produit de vrais détails IA (False pour le repli Pillow)
    is_ai: bool = True

    @abstractmethod
    def is_available(self) -> bool:
        """Le moteur peut-il fonctionner sur cette machine ?"""

    @abstractmethod
    def unavailable_reason(self) -> str | None:
        """Explication (en français) si is_available() est False."""

    @abstractmethod
    def uses_gpu(self) -> bool:
        """True si un GPU sera utilisé ; False = mode CPU de secours."""

    @abstractmethod
    def upscale(
        self,
        task: UpscaleTask,
        progress: ProgressCallback | None = None,
        cancel_event: threading.Event | None = None,
    ) -> Path:
        """Agrandit l'image et retourne le chemin du fichier produit.

        Doit lever UpscaleCancelledError si cancel_event est déclenché,
        et ne JAMAIS écrire sur le fichier source.
        """
