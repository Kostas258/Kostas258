"""Moteur Real-ESRGAN exécuté localement (PyTorch).

- GPU (CUDA/MPS) si disponible, sinon mode CPU de secours (nettement plus lent).
- Les poids de modèles doivent avoir été téléchargés avec l'accord explicite
  de l'utilisateur (voir registry.py) : rien n'est récupéré ici.
"""

from __future__ import annotations

import threading
from pathlib import Path

from app.engine import registry
from app.engine.base import (
    EngineUnavailableError,
    ProgressCallback,
    UpscaleCancelledError,
    UpscaleEngine,
    UpscaleTask,
)


def _check_cancel(cancel_event: threading.Event | None) -> None:
    if cancel_event is not None and cancel_event.is_set():
        raise UpscaleCancelledError("Traitement annulé par l'utilisateur.")


class RealESRGANEngine(UpscaleEngine):
    name = "realesrgan"
    is_ai = True

    def __init__(self, models_dir: Path | None = None) -> None:
        self._models_dir = models_dir
        self._reason: str | None = None

    # ------------------------------------------------------------------ état
    def is_available(self) -> bool:
        try:
            import realesrgan  # noqa: F401
            import torch  # noqa: F401
        except ImportError:
            self._reason = (
                "Les dépendances IA ne sont pas installées. "
                "Exécutez : pip install -e '.[ia]' dans le dossier backend."
            )
            return False
        self._reason = None
        return True

    def unavailable_reason(self) -> str | None:
        self.is_available()
        return self._reason

    def uses_gpu(self) -> bool:
        try:
            import torch

            return bool(
                torch.cuda.is_available()
                or (hasattr(torch.backends, "mps") and torch.backends.mps.is_available())
            )
        except ImportError:
            return False

    # ------------------------------------------------------------- traitement
    def _build_upsampler(self, task: UpscaleTask):
        from basicsr.archs.rrdbnet_arch import RRDBNet
        from realesrgan import RealESRGANer

        weights = registry.model_path(task.model, self._models_dir)
        if not weights.is_file():
            raise EngineUnavailableError(
                f"Le modèle « {task.model} » n'est pas installé. "
                "Téléchargez-le depuis l'écran Modèles (accord de licence requis)."
            )
        if task.model == "anime":
            net = RRDBNet(
                num_in_ch=3, num_out_ch=3, num_feat=64, num_block=6, num_grow_ch=32, scale=4
            )
        else:
            net = RRDBNet(
                num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=4
            )
        return RealESRGANer(
            scale=4,
            model_path=str(weights),
            model=net,
            tile=256,  # découpage en tuiles : limite la mémoire, GPU comme CPU
            half=self.uses_gpu(),
            device=None if self.uses_gpu() else "cpu",
        )

    def upscale(
        self,
        task: UpscaleTask,
        progress: ProgressCallback | None = None,
        cancel_event: threading.Event | None = None,
    ) -> Path:
        import numpy as np
        from PIL import Image

        if not self.is_available():
            raise EngineUnavailableError(self._reason or "Moteur indisponible.")
        _check_cancel(cancel_event)
        if progress:
            progress(0.05)

        upsampler = self._build_upsampler(task)
        _check_cancel(cancel_event)
        if progress:
            progress(0.15)

        with Image.open(task.input_path) as im:
            arr = np.array(im.convert("RGB"))

        output, _ = upsampler.enhance(arr, outscale=task.scale)
        _check_cancel(cancel_event)
        if progress:
            progress(0.80)

        if task.face_enhance:
            output = self._enhance_faces(output, task)
            _check_cancel(cancel_event)

        result = Image.fromarray(output)
        from app.services.files import save_image

        save_image(result, task.output_path, task.output_format)
        if progress:
            progress(1.0)
        return task.output_path

    def _enhance_faces(self, arr, task: UpscaleTask):
        """Restauration de visages via GFPGAN (modèle « face » requis)."""
        from gfpgan import GFPGANer

        weights = registry.model_path("face", self._models_dir)
        if not weights.is_file():
            raise EngineUnavailableError(
                "L'option « Améliorer les visages » nécessite le modèle GFPGAN. "
                "Téléchargez-le depuis l'écran Modèles (accord de licence requis)."
            )
        restorer = GFPGANer(model_path=str(weights), upscale=1, arch="clean")
        _, _, restored = restorer.enhance(arr, has_aligned=False, only_center_face=False)
        return restored if restored is not None else arr
