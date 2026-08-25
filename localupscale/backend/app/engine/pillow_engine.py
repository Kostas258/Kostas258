"""Redimensionnement classique Pillow — SANS IA.

Rééchantillonnage Lanczos : l'image est agrandie par interpolation, aucun
détail n'est généré. Ce moteur n'est JAMAIS utilisé comme repli automatique ;
il n'est employé que lorsque l'utilisateur choisit explicitement le mode
« Redimensionnement classique — sans IA », et ses fichiers portent le suffixe
_redim_xN pour ne pas être confondus avec un résultat Real-ESRGAN.
"""

from __future__ import annotations

import threading
from pathlib import Path

from PIL import Image

from app.engine.base import (
    ProgressCallback,
    UpscaleCancelledError,
    UpscaleEngine,
    UpscaleTask,
)
from app.services.files import save_image


class PillowEngine(UpscaleEngine):
    name = "pillow"
    is_ai = False

    def is_available(self) -> bool:
        return True

    def unavailable_reason(self) -> str | None:
        return None

    def uses_gpu(self) -> bool:
        return False

    def upscale(
        self,
        task: UpscaleTask,
        progress: ProgressCallback | None = None,
        cancel_event: threading.Event | None = None,
    ) -> Path:
        if cancel_event is not None and cancel_event.is_set():
            raise UpscaleCancelledError("Traitement annulé par l'utilisateur.")
        if progress:
            progress(0.1)
        with Image.open(task.input_path) as im:
            new_size = (im.width * task.scale, im.height * task.scale)
            if cancel_event is not None and cancel_event.is_set():
                raise UpscaleCancelledError("Traitement annulé par l'utilisateur.")
            result = im.resize(new_size, Image.Resampling.LANCZOS)
        if progress:
            progress(0.8)
        save_image(result, task.output_path, task.output_format)
        if progress:
            progress(1.0)
        return task.output_path
